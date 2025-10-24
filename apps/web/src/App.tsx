// apps/web/src/App.tsx
import { useEffect, useMemo, useState } from "react";
import {
  ConnectButton,
  useSendTransaction,
  useReadContract,
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
} from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
  prepareContractCall,
  toUnits,
} from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import type { Abi } from "viem";
import { formatUnits } from "viem";
import { RESQ_FACTORY_ABI, RESQ_CIRCLE_ABI, ERC20_ABI } from "./abi/resq";
import { MyCircles } from "./components/MyCircles";

/** ENV */
const FACTORY = import.meta.env.VITE_FACTORY_ADDR as `0x${string}`;
const CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined;

/** Helper TX */
function pc(contract: any, method: string, params: any[] = []) {
  return prepareContractCall({
    contract,
    method: method as any,
    params: params as any,
  });
}

/** Reset rápido de sesión thirdweb */
function clearThirdwebStorage() {
  try {
    Object.keys(localStorage)
      .filter(
        (k) =>
          k.toLowerCase().includes("thirdweb") ||
          k.toLowerCase().includes("tw.sdk")
      )
      .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter(
        (k) =>
          k.toLowerCase().includes("thirdweb") ||
          k.toLowerCase().includes("tw.sdk")
      )
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export default function App() {
  if (!CLIENT_ID) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>ResQ (Base)</h1>
        <p style={{ color: "#b71c1c" }}>
          Falta <code>VITE_THIRDWEB_CLIENT_ID</code> en{" "}
          <code>apps/web/.env</code>.
        </p>
      </div>
    );
  }

  const client = createThirdwebClient({ clientId: CLIENT_ID });

  // Wallets para el modal
  const metamask = useMemo(() => createWallet("io.metamask"), []);
  const coinbase = useMemo(() => createWallet("com.coinbase.wallet"), []);
  const embedded = useMemo(
    () => inAppWallet({ auth: { options: ["email", "phone"] } }),
    []
  );
  const walletsBoth = useMemo(
    () => [metamask, coinbase, embedded],
    [metamask, coinbase, embedded]
  );

  // Estado de conexión
  const active = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  async function fullDisconnect() {
    try {
      if (activeWallet) await disconnect(activeWallet);
    } catch {}
    clearThirdwebStorage();
    window.location.reload();
  }

  // Instancia del Factory (una sola vez)
  const factory = useMemo(
    () =>
      getContract({
        client,
        chain: baseSepolia,
        address: FACTORY,
        abi: RESQ_FACTORY_ABI as Abi,
      }),
    []
  );

  // Estado compartido para autocompletar acciones
  const [selectedCircle, setSelectedCircle] = useState<`0x${string}` | "">("");
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | "">("");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSelectCircle(circle: `0x${string}`, token?: `0x${string}`) {
    setSelectedCircle(circle);
    if (token) setSelectedToken(token);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ margin: 0 }}>ResQ (Base · AA con gas patrocinado)</h1>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <ConnectButton
            client={client}
            chain={baseSepolia}
            accountAbstraction={{
              chain: baseSepolia,
              sponsorGas: true, // Paymaster de thirdweb en testnet
            }}
            wallets={walletsBoth}
            connectModal={{ title: "Conectar a ResQ", size: "compact" }}
          />
          {active?.address ? (
            <button onClick={fullDisconnect}>Desconectar</button>
          ) : null}
        </div>
      </header>

      <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
        Conectado: {active?.address ?? "—"} (con AA, suele ser tu Smart Account)
      </p>

      <hr />

      <CreateCircle
        client={client}
        factory={factory}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />

      <MyCircles
        factory={factory}
        onSelectCircle={handleSelectCircle}
        refreshKey={refreshKey}
      />

      <hr />

      <CircleActions
        client={client}
        initialCircle={selectedCircle}
        initialToken={selectedToken}
      />
    </div>
  );
}

/* =================== Crear círculo =================== */
function CreateCircle({
  client,
  factory,
  onCreated,
}: {
  client: ReturnType<typeof createThirdwebClient>;
  factory: ReturnType<typeof getContract>;
  onCreated: () => void;
}) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const [token, setToken] = useState("");
  const [decimals, setDecimals] = useState(6);
  const [minHuman, setMinHuman] = useState("1");
  const [duration, setDuration] = useState(60);
  const [quorum, setQuorum] = useState(4000);
  const [approveBps, setApproveBps] = useState(6000);
  const [capBps, setCapBps] = useState(2000);

  useEffect(() => {
    if (error) {
      console.error("TX error (create):", error);
      alert(`Error: ${String(error)}`);
    }
  }, [error]);

  async function onCreate() {
    if (!token) return alert("Token ERC20 requerido");
    const minRaw = toUnits(minHuman, decimals);

    const tx = pc(factory, "createCircle", [
      token as `0x${string}`,
      minRaw,
      duration,
      quorum,
      approveBps,
      capBps,
    ]);

    const { transactionHash } = await sendTx(tx);
    alert(`✅ Círculo creado\nTX: ${transactionHash}`);
    onCreated?.();
  }

  return (
    <section>
      <h2 style={{ marginTop: 0 }}>Crear círculo</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <label>Token (ERC20):</label>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="0xTOKEN..."
        />

        <label>Token decimals:</label>
        <input
          type="number"
          value={decimals}
          onChange={(e) => setDecimals(Number(e.target.value))}
        />

        <label>Mín. contribución:</label>
        <input
          value={minHuman}
          onChange={(e) => setMinHuman(e.target.value)}
          placeholder="ej. 1.0"
        />

        <label>Duración (segundos):</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
        />

        <label>Quorum (bps):</label>
        <input
          type="number"
          value={quorum}
          onChange={(e) => setQuorum(Number(e.target.value))}
        />

        <label>Aprobación (bps):</label>
        <input
          type="number"
          value={approveBps}
          onChange={(e) => setApproveBps(Number(e.target.value))}
        />

        <label>Cap por claim (bps):</label>
        <input
          type="number"
          value={capBps}
          onChange={(e) => setCapBps(Number(e.target.value))}
        />
      </div>

      <button style={{ marginTop: 10 }} disabled={isPending} onClick={onCreate}>
        {isPending ? "Creando..." : "Crear círculo"}
      </button>
    </section>
  );
}

/* =================== Acciones del círculo =================== */
function CircleActions({
  client,
  initialCircle,
  initialToken,
}: {
  client: ReturnType<typeof createThirdwebClient>;
  initialCircle?: `0x${string}` | "";
  initialToken?: `0x${string}` | "";
}) {
  const { mutateAsync: sendTx, isPending, error } = useSendTransaction();

  const [circleAddr, setCircleAddr] = useState(initialCircle || "");
  const [tokenAddr, setTokenAddr] = useState(initialToken || "");
  const [decimals, setDecimals] = useState(6);

  const [amountHuman, setAmountHuman] = useState("2");
  const [claimHuman, setClaimHuman] = useState("1");
  const [evidence, setEvidence] = useState("ipfs://demoCID");
  const [claimId, setClaimId] = useState(0);

  useEffect(() => {
    if (initialCircle) setCircleAddr(initialCircle);
  }, [initialCircle]);
  useEffect(() => {
    if (initialToken) setTokenAddr(initialToken);
  }, [initialToken]);

  const circle = useMemo(
    () =>
      circleAddr
        ? getContract({
            client,
            chain: baseSepolia,
            address: circleAddr as `0x${string}`,
            abi: RESQ_CIRCLE_ABI as Abi,
          })
        : undefined,
    [circleAddr]
  );

  const erc20 = useMemo(
    () =>
      tokenAddr
        ? getContract({
            client,
            chain: baseSepolia,
            address: tokenAddr as `0x${string}`,
            abi: ERC20_ABI as Abi,
          })
        : undefined,
    [tokenAddr]
  );

  // 👇 añade esto dentro de CircleActions()
  const active = useActiveAccount();

  /** Mint de prueba al usuario conectado (Smart Account) */
  async function devMint() {
    if (!erc20 || !active?.address) {
      alert("Completa el token ERC20 y conéctate primero.");
      return;
    }
    try {
      const amount = toUnits("1000", decimals); // 1000 tokens de prueba
      // Si tu MockERC20 tiene signature mint(address,uint256):
      const tx = pc(erc20, "mint", [active.address, amount]);
      const { transactionHash } = await sendTx(tx);
      alert(`✅ Mint ok (1000 tokens)\nTX: ${transactionHash}`);
    } catch (e: any) {
      console.error("mint error:", e);
      alert(
        "❌ No se pudo mintear.\n" +
          "Revisa que tu MockERC20 tenga el método mint(address,uint256) y que cualquiera pueda llamarlo."
      );
    }
  }

  useEffect(() => {
    if (error) {
      console.error("TX error (actions):", error);
      alert(`Error: ${String(error)}`);
    }
  }, [error]);

  async function approveAndJoin() {
    if (!erc20 || !circle) return alert("Completa token y círculo");
    const raw = toUnits(amountHuman, decimals);
    await sendTx(pc(erc20, "approve", [circleAddr as `0x${string}`, raw]));
    await sendTx(pc(circle, "joinAndContribute", [raw]));
    alert("✅ Aprobado + unido");
  }

  async function openClaim() {
    if (!circle) return alert("Círculo requerido");
    const raw = toUnits(claimHuman, decimals);
    await sendTx(pc(circle, "openClaim", [evidence, raw]));
    alert("✅ Claim abierto");
  }

  async function voteYes() {
    if (!circle) return;
    await sendTx(pc(circle, "vote", [BigInt(claimId), true]));
    alert("✅ Voto registrado");
  }

  async function finalize() {
    if (!circle) return;
    await sendTx(pc(circle, "finalizeClaim", [BigInt(claimId)]));
    alert("✅ Claim finalizado");
  }

  return (
    <section>
      <h2>Acciones del círculo</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 1fr",
          gap: 10,
          alignItems: "center",
        }}
      >
        <label>Círculo:</label>
        <input
          value={circleAddr}
          onChange={(e) => setCircleAddr(e.target.value)}
          placeholder="0xCIRCLE..."
        />
        <label>Token:</label>
        <input
          value={tokenAddr}
          onChange={(e) => setTokenAddr(e.target.value)}
          placeholder="0xTOKEN..."
        />
        <label>Decimals:</label>
        <input
          type="number"
          value={decimals}
          onChange={(e) => setDecimals(Number(e.target.value))}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <button disabled={isPending} onClick={approveAndJoin}>
          {isPending ? "Procesando..." : "Approve + Join"}
        </button>
        <button onClick={devMint} style={{ marginLeft: 8 }}>
          Dev Mint 1000
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="ipfs://CID"
        />
        <input
          value={claimHuman}
          onChange={(e) => setClaimHuman(e.target.value)}
          placeholder="Monto a reclamar"
        />
        <button onClick={openClaim}>Abrir Claim</button>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          type="number"
          value={claimId}
          onChange={(e) => setClaimId(Number(e.target.value))}
        />
        <button onClick={voteYes}>Votar SÍ</button>
        <button onClick={finalize}>Finalizar</button>
      </div>

      {circle && (
        <CircleReads circle={circle} claimId={claimId} decimals={decimals} />
      )}
    </section>
  );
}

/* =================== Lecturas del claim =================== */
function CircleReads({
  circle,
  claimId,
  decimals,
}: {
  circle: ReturnType<typeof getContract>;
  claimId: number;
  decimals: number;
}) {
  const { data: claimsCount } = useReadContract({
    contract: circle as any,
    method: "claimsCount" as any,
    params: [],
  });

  const { data: claim } = useReadContract({
    contract: circle as any,
    method: "getClaim" as any,
    params: [BigInt(claimId || 0)] as any[],
  });

  if (!claim) return null;

  const [
    claimant,
    evidence,
    amountRequested,
    startTime,
    endTime,
    yesVotes,
    noVotes,
    finalized,
    paid,
  ] = claim as any;

  return (
    <div
      style={{
        marginTop: 12,
        fontSize: 14,
        background: "#fafafa",
        padding: 10,
        borderRadius: 6,
      }}
    >
      <div>
        <b>Claimant:</b> {claimant}
      </div>
      <div>
        <b>Evidencia:</b> {evidence}
      </div>
      <div>
        <b>Monto:</b> {formatUnits(amountRequested, decimals)}
      </div>
      <div>
        <b>Inicio:</b> {new Date(Number(startTime) * 1000).toLocaleString()}
      </div>
      <div>
        <b>Fin:</b> {new Date(Number(endTime) * 1000).toLocaleString()}
      </div>
      <div>
        <b>Votos:</b> ✅ {yesVotes} / ❌ {noVotes}
      </div>
      <div>
        <b>Estado:</b>{" "}
        {finalized ? (paid ? "Pagado ✅" : "Rechazado ❌") : "En votación ⏳"}
      </div>
      <div style={{ fontSize: 12, marginTop: 6 }}>
        Claims totales: {claimsCount ? claimsCount.toString() : "—"}
      </div>
    </div>
  );
}
