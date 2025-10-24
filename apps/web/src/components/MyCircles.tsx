import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  type Abi,
  createPublicClient,
  http,
  decodeEventLog,
  formatUnits,
} from "viem";
import { baseSepolia as baseSepoliaViem } from "viem/chains";

/** RPC (puedes poner el tuyo en .env para mayor estabilidad) */
const BASE_SEPOLIA_RPC =
  (import.meta as any).env?.VITE_BASE_SEPOLIA_RPC || "https://sepolia.base.org";

/** Si conoces el bloque de deploy del Factory, ponlo en .env para acelerar */
const FACTORY_DEPLOY_BLOCK = Number(
  (import.meta as any).env?.VITE_FACTORY_DEPLOY_BLOCK || 0
);

type CircleLogItem = {
  creator: `0x${string}`;
  circle: `0x${string}`;
  token?: `0x${string}`;
  tx?: `0x${string}`;
  blockNumber?: bigint;
};

type MemberCircleItem = CircleLogItem & {
  tokenSymbol?: string;
  balanceHuman?: string; // balance del círculo (token.balanceOf(circle))
  myContributionHuman?: string; // si logramos leer contribución propia
};

export function MyCircles({
  factory,
  onSelectCircle,
  refreshKey,
}: {
  factory: ReturnType<any>; // thirdweb getContract(...)
  onSelectCircle: (circle: `0x${string}`, token?: `0x${string}`) => void;
  refreshKey?: number;
}) {
  const active = useActiveAccount();

  const [mine, setMine] = useState<CircleLogItem[]>([]);
  const [memberOf, setMemberOf] = useState<MemberCircleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [warn, setWarn] = useState<string | null>(null);

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepoliaViem,
        transport: http(BASE_SEPOLIA_RPC),
      }),
    []
  );

  const factoryAbi = factory?.abi as Abi | undefined;
  const factoryAddress = factory?.address as `0x${string}` | undefined;

  useEffect(() => {
    (async () => {
      try {
        setWarn(null);
        setLoading(true);
        setMine([]);
        setMemberOf([]);

        if (!factoryAbi || !factoryAddress) {
          setWarn("Factory no inicializado.");
          return;
        }
        if (!active?.address) {
          setWarn("Conéctate para ver tus círculos.");
          return;
        }

        // Traer eventos CircleCreated del factory (en chunks por límite del nodo)
        const latest = await publicClient.getBlockNumber();
        const maxSpan = 80_000n;
        let from =
          FACTORY_DEPLOY_BLOCK > 0
            ? BigInt(FACTORY_DEPLOY_BLOCK)
            : latest > maxSpan
            ? latest - maxSpan
            : 0n;
        let to = latest;

        const all: CircleLogItem[] = [];
        while (from <= to) {
          const chunkTo = from + maxSpan < to ? from + maxSpan : to;

          const rawLogs = await publicClient.getLogs({
            address: factoryAddress,
            fromBlock: from,
            toBlock: chunkTo,
          });

          for (const lg of rawLogs) {
            try {
              const decoded = decodeEventLog({
                abi: factoryAbi,
                data: lg.data,
                topics: lg.topics as any,
              });

              if (decoded.eventName === "CircleCreated") {
                const { creator, circle, token } = decoded.args as unknown as {
                  creator: `0x${string}`;
                  circle: `0x${string}`;
                  token?: `0x${string}`;
                };

                all.push({
                  creator,
                  circle,
                  token,
                  tx: lg.transactionHash as `0x${string}`,
                  blockNumber: lg.blockNumber,
                });
              }
            } catch {
              // ignora logs que no decodifican
            }
          }

          from = chunkTo + 1n;
        }

        // Mis círculos (filtra por creador)
        const myAddr = String(active.address).toLowerCase();
        const mineOnly = all
          .filter((it) => String(it.creator).toLowerCase() === myAddr)
          .sort((a, b) =>
            Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))
          );
        setMine(mineOnly);

        // Círculos donde soy miembro (dedupe + enriquecer)
        const uniqCircles = dedupeBy(all, (x) => `${x.circle}`);
        const memberResults: MemberCircleItem[] = [];
        for (const it of uniqCircles) {
          const details = await enrichCircleForMember(
            publicClient,
            it,
            active.address as `0x${string}`
          );
          if (details?.isMember) {
            memberResults.push({
              ...it,
              token: details.token,
              tokenSymbol: details.symbol,
              balanceHuman: details.balanceHuman,
              myContributionHuman: details.myContributionHuman,
            });
          }
        }
        memberResults.sort((a, b) =>
          Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))
        );
        setMemberOf(memberResults);
      } catch (e: any) {
        console.error(e);
        setWarn(
          e?.message?.includes("max block range")
            ? "Aviso: el nodo limitó el rango de búsqueda. Define VITE_FACTORY_DEPLOY_BLOCK en .env para acelerar."
            : `Error leyendo logs: ${e?.message || String(e)}`
        );
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, factoryAbi, factoryAddress, active?.address, refreshKey]);

  return (
    <section style={{ marginTop: 16 }}>
      <h2>Mis círculos</h2>
      {renderList({
        items: mine,
        onSelectCircle,
        emptyText: !active?.address
          ? "Conéctate para listar tus círculos creados."
          : "No tienes círculos creados aún.",
      })}

      <h2 style={{ marginTop: 24 }}>Círculos donde soy miembro</h2>
      {loading ? (
        <p>Cargando…</p>
      ) : memberOf.length === 0 ? (
        <p>No perteneces a ningún círculo todavía.</p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {memberOf.map((it) => (
            <div
              key={`member-${it.circle}-${it.tx}`}
              style={{
                border: "1px solid #eee",
                borderRadius: 8,
                padding: 10,
                background: "#f6faf6",
              }}
            >
              <div>
                <b>Circle:</b> {it.circle}
              </div>
              <div>
                <b>Token:</b> {it.token ?? "—"}{" "}
                {it.tokenSymbol ? `(${it.tokenSymbol})` : ""}
              </div>
              <div>
                <b>Balance del círculo:</b> {it.balanceHuman ?? "—"}
              </div>
              <div>
                <b>Mi contribución:</b> {it.myContributionHuman ?? "—"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Creador: {it.creator} · Bloque:{" "}
                {it.blockNumber?.toString() ?? "—"}
              </div>
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button onClick={() => onSelectCircle(it.circle, it.token)}>
                  Usar este círculo
                </button>
                <a
                  href={`https://sepolia.basescan.org/address/${it.circle}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver en BaseScan
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {warn && (
        <div
          style={{
            marginTop: 10,
            background: "#fff8e1",
            border: "1px solid #ffecb3",
            color: "#7a4f01",
            padding: 10,
            borderRadius: 8,
          }}
        >
          {warn}
        </div>
      )}

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        Tip: agrega <code>VITE_FACTORY_DEPLOY_BLOCK</code> en{" "}
        <code>apps/web/.env</code> con el bloque de deploy de tu factory para
        acelerar la carga.
      </div>
    </section>
  );
}

/* ====================== Helpers ====================== */

function renderList({
  items,
  onSelectCircle,
  emptyText,
}: {
  items: CircleLogItem[];
  onSelectCircle: (circle: `0x${string}`, token?: `0x${string}`) => void;
  emptyText: string;
}) {
  if (!items || items.length === 0) return <p>{emptyText}</p>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((it) => (
        <div
          key={`${it.circle}-${it.tx}`}
          style={{
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 10,
            background: "#fafafa",
          }}
        >
          <div>
            <b>Circle:</b> {it.circle}
          </div>
          <div>
            <b>Token:</b> {it.token ?? "—"}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Creador: {it.creator} · Bloque: {it.blockNumber?.toString() ?? "—"}
          </div>
          <div
            style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <button onClick={() => onSelectCircle(it.circle, it.token)}>
              Usar este círculo
            </button>
            <a
              href={`https://sepolia.basescan.org/address/${it.circle}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver en BaseScan
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Elimina duplicados por key */
function dedupeBy<T>(arr: T[], keyFn: (x: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    const k = keyFn(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
}

/**
 * Enriquecer un círculo:
 * - token (vía evento o circle.token())
 * - symbol / decimals
 * - balance del círculo (token.balanceOf(circle))
 * - membresía: intenta varias firmas:
 *   • bool: isMember(addr), members(addr)
 *   • uint > 0: contributions(addr), balances(addr), deposits(addr), memberContribution(addr), contributed(addr)
 * - contribución propia: si existe un getter uint, la formatea.
 */
async function enrichCircleForMember(
  publicClient: ReturnType<typeof createPublicClient>,
  base: CircleLogItem,
  who: `0x${string}`
) {
  try {
    // 1) token
    let token = base.token;
    if (!token) {
      token = (await safeRead(publicClient, {
        address: base.circle,
        abi: [
          {
            type: "function",
            name: "token",
            stateMutability: "view",
            inputs: [],
            outputs: [{ name: "", type: "address" }],
          },
        ] as const,
        functionName: "token",
        args: [],
      })) as `0x${string}` | undefined;
    }

    // 2) si hay token, leemos symbol/decimals y balance del círculo
    let decimals = 18;
    let symbol: string | undefined;
    let balanceHuman: string | undefined;

    if (token) {
      [decimals, symbol] = await Promise.all([
        safeRead(publicClient, {
          address: token,
          abi: [
            {
              type: "function",
              name: "decimals",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "uint8" }],
            },
          ] as const,
          functionName: "decimals",
          args: [],
        }).then((d) => Number(d ?? 18)),
        safeRead(publicClient, {
          address: token,
          abi: [
            {
              type: "function",
              name: "symbol",
              stateMutability: "view",
              inputs: [],
              outputs: [{ type: "string" }],
            },
          ] as const,
          functionName: "symbol",
          args: [],
        }).then((s) => (s as string) || undefined),
      ]);

      const balRaw = (await safeRead(publicClient, {
        address: token,
        abi: [
          {
            type: "function",
            name: "balanceOf",
            stateMutability: "view",
            inputs: [{ type: "address", name: "a" }],
            outputs: [{ type: "uint256" }],
          },
        ] as const,
        functionName: "balanceOf",
        args: [base.circle],
      })) as bigint | undefined;

      if (typeof balRaw === "bigint") {
        balanceHuman = `${formatUnits(balRaw, decimals)}${
          symbol ? ` ${symbol}` : ""
        }`;
      }
    }

    // 3) membresía + contribución propia
    const { isMember, myContributionHuman } =
      await probeMembershipWithContribution(
        publicClient,
        base.circle,
        who,
        decimals,
        symbol
      );

    return {
      isMember,
      token,
      symbol,
      balanceHuman,
      myContributionHuman,
    };
  } catch {
    return undefined;
  }
}

async function probeMembershipWithContribution(
  publicClient: ReturnType<typeof createPublicClient>,
  circle: `0x${string}`,
  who: `0x${string}`,
  decimals: number,
  symbol?: string
) {
  // funcs booleanas típicas
  for (const fn of ["isMember", "members"]) {
    const ok = await safeRead(publicClient, {
      address: circle,
      abi: [
        {
          type: "function",
          name: fn as any,
          stateMutability: "view",
          inputs: [{ type: "address" }],
          outputs: [{ type: "bool" }],
        },
      ] as const,
      functionName: fn as any,
      args: [who],
    });
    if (typeof ok === "boolean" && ok) {
      return { isMember: true, myContributionHuman: undefined };
    }
  }

  // funcs uint256 típicas
  for (const fn of [
    "contributions",
    "balances",
    "deposits",
    "memberContribution",
    "contributed",
  ]) {
    const v = (await safeRead(publicClient, {
      address: circle,
      abi: [
        {
          type: "function",
          name: fn as any,
          stateMutability: "view",
          inputs: [{ type: "address" }],
          outputs: [{ type: "uint256" }],
        },
      ] as const,
      functionName: fn as any,
      args: [who],
    })) as bigint | undefined;

    if (typeof v === "bigint") {
      return {
        isMember: v > 0n,
        myContributionHuman:
          v > 0n
            ? `${formatUnits(v, decimals)}${symbol ? ` ${symbol}` : ""}`
            : undefined,
      };
    }
  }

  return { isMember: false, myContributionHuman: undefined };
}

/** readContract seguro: devuelve undefined si falla */
async function safeRead(
  publicClient: ReturnType<typeof createPublicClient>,
  params: Parameters<ReturnType<typeof createPublicClient>["readContract"]>[0]
) {
  try {
    return await publicClient.readContract(params as any);
  } catch {
    return undefined;
  }
}
