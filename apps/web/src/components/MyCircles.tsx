// apps/web/src/components/MyCircles.tsx
import { useEffect, useMemo, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { getContract } from "thirdweb";
import type { Abi } from "viem";
import {
  createPublicClient,
  http,
  getAddress,
  decodeEventLog,
  isHex,
  type Log,
} from "viem";
import { baseSepolia } from "viem/chains";
import { RESQ_FACTORY_ABI } from "../abi/resq";

type CircleItem = {
  circle: `0x${string}`;
  token?: `0x${string}`;
  creator?: `0x${string}`;
  tx?: `0x${string}`;
};

// Opcional: si sabes el bloque de despliegue del Factory, ponlo en .env
const FROM_BLOCK_ENV = import.meta.env.VITE_FACTORY_DEPLOY_BLOCK
  ? BigInt(import.meta.env.VITE_FACTORY_DEPLOY_BLOCK)
  : undefined;

// Tamaño de ventana (debe ser < 100k para Base Sepolia)
const RANGE_CHUNK = 80_000n;

export function MyCircles({
  factory,
  onSelectCircle,
  refreshKey,
}: {
  factory: ReturnType<typeof getContract>;
  onSelectCircle: (circle: `0x${string}`, token?: `0x${string}`) => void;
  refreshKey: number;
}) {
  const acct = useActiveAccount();

  const [loading, setLoading] = useState(false);
  const [mine, setMine] = useState<CircleItem[]>([]);
  const [all, setAll] = useState<CircleItem[]>([]);
  const [debug, setDebug] = useState<string>("");

  const factoryAddr = useMemo(() => {
    try {
      return (factory as any).address as `0x${string}`;
    } catch {
      return undefined;
    }
  }, [factory]);

  const abi = RESQ_FACTORY_ABI as unknown as Abi;

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(), // usa tu RPC; si tienes uno propio, pásalo aquí
      }),
    []
  );

  useEffect(() => {
    (async () => {
      setMine([]);
      setAll([]);
      setDebug("");

      if (!factoryAddr) {
        setDebug(
          "No pude resolver la address del Factory desde el contrato thirdweb."
        );
        return;
      }

      setLoading(true);
      try {
        // 1) Bloque actual
        const latest = await publicClient.getBlockNumber();

        // 2) Punto de inicio:
        // - Si tienes VITE_FACTORY_DEPLOY_BLOCK, arrancamos ahí.
        // - Si no, tomamos una ventana razonable hacia atrás (p.ej. 300k bloques).
        // Ajusta BACK_LOOK si lo necesitas más amplio.
        const BACK_LOOK = 300_000n;
        let start =
          FROM_BLOCK_ENV ?? (latest > BACK_LOOK ? latest - BACK_LOOK : 0n);

        const items: CircleItem[] = [];
        // 3) Iterar en chunks
        while (start <= latest) {
          const end =
            start + RANGE_CHUNK < latest ? start + RANGE_CHUNK : latest;

          try {
            const logs = await publicClient.getLogs({
              address: factoryAddr,
              fromBlock: start,
              toBlock: end,
            });

            for (const lg of logs as Log[]) {
              try {
                // Convierte topics readonly -> tuple mutable que decodeEventLog acepta
                const topicsTuple = (
                  lg.topics && lg.topics.length > 0
                    ? ([...(lg.topics as readonly `0x${string}`[])] as [
                        `0x${string}`,
                        ...`0x${string}`[]
                      ])
                    : []
                ) as [] | [`0x${string}`, ...`0x${string}`[]];

                const decoded = decodeEventLog({
                  abi,
                  data: lg.data,
                  topics: topicsTuple,
                  strict: false,
                });

                if (decoded?.eventName === "CircleCreated") {
                  const args: any = decoded.args || {};

                  // Ajusta los nombres si en tu ABI son distintos (owner en vez de creator, etc.)
                  const creator =
                    args.creator && isHex(args.creator)
                      ? (getAddress(args.creator) as `0x${string}`)
                      : undefined;
                  const circle =
                    args.circle && isHex(args.circle)
                      ? (getAddress(args.circle) as `0x${string}`)
                      : undefined;
                  const token =
                    args.token && isHex(args.token)
                      ? (getAddress(args.token) as `0x${string}`)
                      : undefined;

                  if (circle) {
                    items.push({
                      creator,
                      circle,
                      token,
                      tx: (lg as any).transactionHash as
                        | `0x${string}`
                        | undefined,
                    });
                  }
                }
              } catch {
                // log no decodificable con este ABI → ignorar
              }
            }
          } catch (rangeErr: any) {
            // Si aún así el nodo protesta por rango, reduce el chunk
            setDebug(
              `Aviso: el nodo rechazó el rango ${start}→${end}. Intentando continuar con chunks. Detalle: ${String(
                rangeErr?.message || rangeErr
              )}`
            );
          }

          // Avanza ventana
          start = end + 1n;
        }

        // 4) Ordena y setea estado
        const ordered = [...items].reverse();
        setAll(ordered);

        const my = acct?.address?.toLowerCase();
        if (my) {
          setMine(ordered.filter((it) => it.creator?.toLowerCase() === my));
        }

        if (ordered.length === 0) {
          setDebug(
            `No encontré eventos CircleCreated en ${factoryAddr} dentro del rango consultado.\n` +
              `— Si tu Factory es más antiguo, sube el BACK_LOOK o define VITE_FACTORY_DEPLOY_BLOCK en .env.\n` +
              `— Revisa en el explorer que el evento se llame exactamente "CircleCreated" y los args (creator,circle,token).`
          );
        }
      } catch (err: any) {
        console.error("Lectura paginada de logs error:", err);
        setDebug(`Error leyendo logs: ${String(err?.message || err)}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [factoryAddr, abi, publicClient, acct?.address, refreshKey]);

  const show = mine.length > 0 ? mine : all;

  if (loading) return <p>Cargando círculos…</p>;
  if (!show.length) {
    return (
      <div style={{ marginTop: 12 }}>
        <p>No hay eventos CircleCreated aún.</p>
        {debug && (
          <pre
            style={{
              background: "#fafafa",
              padding: 10,
              borderRadius: 8,
              overflowX: "auto",
              fontSize: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {debug}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <h3>Mis círculos</h3>
      <ul style={{ paddingLeft: 16 }}>
        {show.map((it, i) => (
          <li key={i} style={{ marginBottom: 10 }}>
            {it.creator && (
              <div>
                <b>Creator:</b> {it.creator}
              </div>
            )}
            <div>
              <b>Circle:</b> {it.circle}
            </div>
            {it.token && (
              <div>
                <b>Token:</b> {it.token}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => onSelectCircle(it.circle, it.token)}>
                Usar este círculo
              </button>
              {it.tx && (
                <a
                  href={`https://sepolia-explorer.base.org/tx/${it.tx}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver TX
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MyCircles;
