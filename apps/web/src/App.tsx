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
import { createWallet, inAppWallet } from "thirdweb/wallets";

// ⬇️ Cadenas aliasadas para NO mezclar tipos
import { baseSepolia as baseSepoliaTW } from "thirdweb/chains"; // (thirdweb)
import { baseSepolia as baseSepoliaViem } from "viem/chains"; // (viem)

import { upload } from "thirdweb/storage";

// ✅ viem para lecturas (view calls)
import { createPublicClient, http, formatUnits, type Abi } from "viem";

import { RESQ_FACTORY_ABI, RESQ_CIRCLE_ABI, ERC20_ABI } from "./abi/resq";
import { MyCircles } from "./components/MyCircles";
import { Discover } from "./pages/Discover";

// Convierte ipfs://... a un gateway HTTPS. Tolera null/undefined/""
function makeGatewayUrl(ipfsUri?: string | null): string {
  if (!ipfsUri) return ""; // nada que mostrar
  if (!ipfsUri.startsWith("ipfs://")) return ipfsUri; // ya es https o algo más

  // Quita el prefijo "ipfs://" solo una vez
  const path = ipfsUri.slice("ipfs://".length); // más robusto que replace()
  return `https://gateway.ipfscdn.io/ipfs/${path}`;
}

/** ENV */
const FACTORY = import.meta.env.VITE_FACTORY_ADDR as `0x${string}`;
const CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined;
// RPC (opcional): usa público si no defines uno
const BASE_SEPOLIA_RPC =
  import.meta.env.VITE_BASE_SEPOLIA_RPC || "https://sepolia.base.org";

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
  if (!FACTORY) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        <h1>ResQ (Base)</h1>
        <p style={{ color: "#b71c1c" }}>
          Falta <code>VITE_FACTORY_ADDR</code> en <code>apps/web/.env</code>.
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

  // Instancia del Factory (thirdweb) — usa baseSepoliaTW
  const factory = useMemo(
    () =>
      getContract({
        client,
        chain: baseSepoliaTW,
        address: FACTORY,
        abi: RESQ_FACTORY_ABI as Abi,
      }),
    [] // intencional para no re-instanciar
  );

  // Tabs
  const [tab, setTab] = useState<"discover" | "dashboard">("discover");

  // Estado compartido para autocompletar acciones
  const [selectedCircle, setSelectedCircle] = useState<`0x${string}` | "">("");
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | "">("");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSelectCircle(circle: `0x${string}`, token?: `0x${string}`) {
    setSelectedCircle(circle);
    if (token) setSelectedToken(token);
    setTab("dashboard");
    setTimeout(
      () =>
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        }),
      50
    );
  }

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 1000,
        margin: "0 auto",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0 }}>ResQ (Base · AA con gas patrocinado)</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setTab("discover")}
            disabled={tab === "discover"}
          >
            Discover
          </button>
          <button
            onClick={() => setTab("dashboard")}
            disabled={tab === "dashboard"}
          >
            Dashboard
          </button>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifySelf: "end",
          }}
        >
          <ConnectButton
            client={client}
            chain={baseSepoliaTW}
            accountAbstraction={{
              chain: baseSepoliaTW,
              sponsorGas: true,
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
        Smart Account: {active?.address ?? "—"} · Factory: {FACTORY}
      </p>

      <hr />

      {tab === "discover" ? (
        <Discover
          client={client}
          factoryAddress={FACTORY}
          factoryAbi={RESQ_FACTORY_ABI as Abi}
          onPick={handleSelectCircle}
        />
      ) : (
        <>
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
        </>
      )}
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

/* =================== Acciones del círculo (con Preflight + IPFS) =================== */
type PreflightData = {
  token: `0x${string}`;
  decimals: number;
  balance: number;
  allowance: number;
  minContribution: number;
  want: number;
};

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
  const active = useActiveAccount();

  const [circleAddr, setCircleAddr] = useState(initialCircle || "");
  const [tokenAddr, setTokenAddr] = useState(initialToken || "");
  const [decimals, setDecimals] = useState(6);

  const [amountHuman, setAmountHuman] = useState("2");
  const [claimHuman, setClaimHuman] = useState("1");

  // Evidencia: archivo + URI + preview
  const [evidence, setEvidence] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUri, setUploadedUri] = useState<string | null>(null);

  const [claimId, setClaimId] = useState(0);

  // Preflight UI state
  const [pf, setPf] = useState<PreflightData | null>(null);
  const [pfLoading, setPfLoading] = useState(false);
  const [pfError, setPfError] = useState<string | null>(null);

  useEffect(() => {
    if (initialCircle) setCircleAddr(initialCircle);
  }, [initialCircle]);
  useEffect(() => {
    if (initialToken) setTokenAddr(initialToken);
  }, [initialToken]);

  // Contratos thirdweb (para mandar TX) — usa baseSepoliaTW
  const circle = useMemo(
    () =>
      circleAddr
        ? getContract({
            client,
            chain: baseSepoliaTW,
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
            chain: baseSepoliaTW,
            address: tokenAddr as `0x${string}`,
            abi: ERC20_ABI as Abi,
          })
        : undefined,
    [tokenAddr]
  );

  useEffect(() => {
    if (error) {
      console.error("TX error (actions):", error);
      alert(`Error: ${String(error)}`);
    }
  }, [error]);

  // Helpers (thirdweb para TX; viem para lecturas)
  async function getTokenFromCircle(): Promise<`0x${string}` | undefined> {
    if (!circle) return undefined;
    try {
      const t = await (circle as any).read.token([]);
      return t as `0x${string}`;
    } catch {
      return undefined;
    }
  }

  // ✅ cliente viem para lecturas — usa baseSepoliaViem
  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepoliaViem,
        transport: http(BASE_SEPOLIA_RPC),
      }),
    []
  );

  // ======= IPFS upload (thirdweb storage) =======
  function onPickFile(f?: File | null) {
    setFile(f ?? null);
    setUploadedUri(null);
    setEvidence("");
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  async function uploadEvidenceToIPFS() {
    if (!file) return alert("Selecciona un archivo primero.");
    setUploading(true);
    try {
      // thirdweb v5 — upload utilitario
      const uri = await upload({
        client,
        files: [file],
      });
      setUploadedUri(uri); // ipfs://CID/archivo.ext
      setEvidence(uri); // listo para openClaim
    } catch (e: any) {
      console.error(e);
      alert(`Falló la subida a IPFS: ${e?.message ?? e}`);
    } finally {
      setUploading(false);
    }
  }

  // ======= Preflight visual con viem =======
  async function preflightRead() {
    try {
      setPfLoading(true);
      setPfError(null);

      if (!active?.address) throw new Error("Conéctate primero.");
      if (!circleAddr) throw new Error("Completa la dirección del Círculo.");

      // 1) Determinar token del círculo si falta
      let t = tokenAddr as `0x${string}` | "";
      if (!t) {
        const fromCircle = await getTokenFromCircle();
        if (fromCircle) {
          t = fromCircle;
          setTokenAddr(fromCircle);
        }
      }
      if (!t) throw new Error("No se pudo determinar el token del círculo.");

      // 2) Leer decimals (con viem) si el input no es fiable
      let d = Number.isFinite(decimals) ? decimals : NaN;
      if (!Number.isFinite(d)) {
        d = (await publicClient.readContract({
          address: t as `0x${string}`,
          abi: ERC20_ABI as Abi,
          functionName: "decimals",
          args: [],
        })) as number;
      }

      // 3) Lecturas paralelas (con viem)
      const [balRaw, allowanceRaw, minCRaw] = await Promise.all([
        publicClient.readContract({
          address: t as `0x${string}`,
          abi: ERC20_ABI as Abi,
          functionName: "balanceOf",
          args: [active.address as `0x${string}`],
        }),
        publicClient.readContract({
          address: t as `0x${string}`,
          abi: ERC20_ABI as Abi,
          functionName: "allowance",
          args: [active.address as `0x${string}`, circleAddr as `0x${string}`],
        }),
        publicClient.readContract({
          address: circleAddr as `0x${string}`,
          abi: RESQ_CIRCLE_ABI as Abi,
          functionName: "minContribution",
          args: [],
        }),
      ]);

      // 4) Normalizar & guardar
      const balance = Number(formatUnits(balRaw as bigint, d));
      const allowance = Number(formatUnits(allowanceRaw as bigint, d));
      const minContribution = Number(formatUnits(minCRaw as bigint, d));
      const want = Number(amountHuman || "0");

      setPf({
        token: t as `0x${string}`,
        decimals: d,
        balance,
        allowance,
        minContribution,
        want,
      });
    } catch (e: any) {
      setPf(null);
      setPfError(e?.message || String(e));
    } finally {
      setPfLoading(false);
    }
  }

  // Hace approve exactamente por la diferencia que falta para llegar a "want"
  async function fixApprove() {
    if (!pf) return;
    try {
      const need = Math.max(0, pf.want - pf.allowance);
      if (need <= 0) return;

      // Reinstancia contrato por si el token cambió en preflight
      const tokenCtr = getContract({
        client,
        chain: baseSepoliaTW,
        address: pf.token,
        abi: ERC20_ABI as any,
      });

      const raw = toUnits(String(need), pf.decimals);
      const tx = pc(tokenCtr, "approve", [circleAddr as `0x${string}`, raw]);
      await sendTx(tx);

      // Refresca preflight
      await preflightRead();
    } catch (e) {
      console.error("fixApprove error:", e);
      alert(`Error al aprobar: ${String(e)}`);
    }
  }

  /** Dev Mint directo al token indicado en el input Token */
  async function devMint() {
    if (!tokenAddr || !active?.address)
      return alert("Conéctate y completa token.");
    const tokenCtr = getContract({
      client,
      chain: baseSepoliaTW,
      address: tokenAddr as `0x${string}`,
      abi: ERC20_ABI as any,
    });
    const amount = toUnits("1000", decimals);
    try {
      const tx = pc(tokenCtr, "mint", [active.address, amount]);
      await sendTx(tx);
      await preflightRead(); // refresca panel
    } catch {
      alert("No se pudo mintear. ¿Mint público disponible?");
    }
  }

  /** Faucet: detecta el token del círculo y mintea 100 al Smart Account conectado */
  async function faucetFromCircleToken() {
    const who = active?.address;
    if (!who) return alert("Conéctate primero.");
    try {
      // Si no hay tokenAddr, intenta leer del círculo
      let t = tokenAddr as `0x${string}` | "";
      if (!t) {
        const fromCircle = await getTokenFromCircle();
        if (fromCircle) {
          t = fromCircle;
          setTokenAddr(fromCircle);
        }
      }
      if (!t) return alert("No se pudo determinar el token del círculo.");

      // Leer decimals con viem (fiable)
      const d = (await publicClient.readContract({
        address: t as `0x${string}`,
        abi: ERC20_ABI as Abi,
        functionName: "decimals",
        args: [],
      })) as number;

      const tokenCtr = getContract({
        client,
        chain: baseSepoliaTW,
        address: t as `0x${string}`,
        abi: ERC20_ABI as any,
      });

      const amount = toUnits("100", d); // 100 tokens
      const tx = pc(tokenCtr, "mint", [who, amount]); // requiere mint(address,uint256) público
      await sendTx(tx);
      await preflightRead(); // refresca panel
    } catch (e) {
      console.error("faucetFromCircleToken error:", e);
      alert("❌ Faucet falló. ¿El token tiene mint(address,uint256) público?");
    }
  }

  async function approveAndJoin() {
    if (!tokenAddr || !circle) return alert("Completa token y círculo");
    const tokenCtr = getContract({
      client,
      chain: baseSepoliaTW,
      address: tokenAddr as `0x${string}`,
      abi: ERC20_ABI as any,
    });
    const raw = toUnits(amountHuman, decimals);
    await sendTx(pc(tokenCtr, "approve", [circleAddr as `0x${string}`, raw]));
    await sendTx(pc(circle, "joinAndContribute", [raw]));
    await preflightRead();
    alert("✅ Aprobado + unido");
  }

  // Validaciones para habilitar "Abrir Claim"
  const isValidEvidence = evidence.startsWith("ipfs://");
  const isPositiveClaim = Number(claimHuman) > 0;
  const canOpenClaim =
    !!circle && isValidEvidence && isPositiveClaim && !isPending;

  async function openClaim() {
    if (!circle) return alert("Círculo requerido");
    if (!isValidEvidence) return alert("Sube evidencia a IPFS (ipfs://...).");
    if (!isPositiveClaim) return alert("Monto a reclamar debe ser > 0.");

    const raw = toUnits(claimHuman, decimals);
    await sendTx(pc(circle, "openClaim", [evidence, raw]));
    alert("✅ Claim abierto");
  }

  async function voteYes() {
    if (!circle) return;
    await sendTx(pc(circle, "vote", [BigInt(claimId), true]));
    alert("✅ Voto SÍ registrado");
  }

  async function voteNo() {
    if (!circle) return;
    await sendTx(pc(circle, "vote", [BigInt(claimId), false]));
    alert("✅ Voto NO registrado");
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
        <label>Monto a aportar:</label>
        <input
          value={amountHuman}
          onChange={(e) => setAmountHuman(e.target.value)}
          placeholder="ej. 2"
        />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={preflightRead} disabled={pfLoading}>
          {pfLoading ? "Leyendo..." : "Preflight"}
        </button>
        <button disabled={isPending} onClick={approveAndJoin}>
          {isPending ? "Procesando..." : "Approve + Join"}
        </button>
        <button onClick={devMint}>Dev Mint 1000</button>
        <button onClick={faucetFromCircleToken}>
          Faucet (token del círculo)
        </button>
      </div>

      {/* Panel visual de Preflight */}
      <PreflightPanel data={pf} error={pfError} onFixApprove={fixApprove} />

      {/* ======= Evidencia (IPFS) ======= */}
      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 8,
          background: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Evidencia (IPFS)</div>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="file"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
          <button onClick={uploadEvidenceToIPFS} disabled={!file || uploading}>
            {uploading ? "Subiendo..." : "Subir a IPFS"}
          </button>
        </div>

        {/* Preview local antes de subir */}
        {previewUrl ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
              Vista previa (local, sin subir):
            </div>
            {file?.type.startsWith("image/") ? (
              <img
                src={previewUrl}
                style={{
                  maxWidth: 360,
                  borderRadius: 6,
                  border: "1px solid #eee",
                }}
              />
            ) : file?.type === "application/pdf" ? (
              <object
                data={previewUrl}
                type="application/pdf"
                width="360"
                height="240"
                style={{ border: "1px solid #eee", borderRadius: 6 }}
              >
                <a href={previewUrl} target="_blank">
                  Abrir PDF
                </a>
              </object>
            ) : (
              <div style={{ fontSize: 12 }}>
                Archivo elegido: <b>{file?.name}</b> (
                {file?.type || "tipo desconocido"})
              </div>
            )}
          </div>
        ) : null}

        {/* Campo URI + link al gateway una vez subido */}
        <div style={{ marginTop: 8 }}>
          <label>URI:</label>{" "}
          <input
            style={{ width: 360 }}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="ipfs://CID[/archivo]"
          />
          {uploadedUri ? (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              🎉 Subido:&nbsp;
              <a
                href={makeGatewayUrl(uploadedUri)}
                target="_blank"
                rel="noreferrer"
              >
                {makeGatewayUrl(uploadedUri)}
              </a>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={claimHuman}
          onChange={(e) => setClaimHuman(e.target.value)}
          placeholder="Monto a reclamar"
          style={{ width: 180, marginRight: 8 }}
        />
        <button onClick={openClaim} disabled={!canOpenClaim}>
          {canOpenClaim ? "Abrir Claim" : "Abrir Claim (incompleto)"}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {/* Si luego quieres quitar este input, renderiza una lista de claims y pasa el claimId correcto a cada fila */}
        <input
          type="number"
          value={claimId}
          onChange={(e) => setClaimId(Number(e.target.value))}
          style={{ width: 120, marginRight: 8 }}
        />
        <button onClick={voteYes}>Votar SÍ</button>
        <button onClick={voteNo} style={{ marginLeft: 8 }}>
          Votar NO
        </button>
        <button onClick={finalize} style={{ marginLeft: 8 }}>
          Finalizar
        </button>
      </div>

      {circle && (
        <CircleReads circle={circle} claimId={claimId} decimals={decimals} />
      )}
    </section>
  );
}

/* =================== Panel Visual de Preflight =================== */
function PreflightPanel({
  data,
  error,
  onFixApprove,
}: {
  data: {
    token: `0x${string}`;
    decimals: number;
    balance: number;
    allowance: number;
    minContribution: number;
    want: number;
  } | null;
  error: string | null;
  onFixApprove: () => void;
}) {
  if (error) {
    return (
      <div
        style={{
          marginTop: 12,
          background: "#fff5f5",
          border: "1px solid #ffdddd",
          padding: 12,
          borderRadius: 8,
          color: "#a30000",
        }}
      >
        <b>Preflight error:</b> {error}
      </div>
    );
  }

  if (!data) return null;

  const okBalance = data.balance >= data.want;
  const okMin = data.want >= data.minContribution;
  const okAllowance = data.allowance >= data.want;
  const needApprove = Math.max(0, data.want - data.allowance);

  const Row = ({
    label,
    value,
    ok,
  }: {
    label: string;
    value: string | number;
    ok: boolean;
  }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
      <span style={{ width: 180, opacity: 0.7 }}>{label}</span>
      <span
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      >
        {value}
      </span>
      <span>{ok ? "✅" : "❌"}</span>
    </div>
  );

  return (
    <div
      style={{
        marginTop: 12,
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 600 }}>Preflight</div>

      <Row label="Token" value={data.token} ok={true} />
      <Row label="Decimals" value={data.decimals} ok={true} />
      <Row label="Balance" value={data.balance} ok={okBalance} />
      <Row label="Allowance → circle" value={data.allowance} ok={okAllowance} />
      <Row label="minContribution" value={data.minContribution} ok={okMin} />
      <Row label="Quiero aportar" value={data.want} ok={okMin && okBalance} />

      {!okAllowance && (
        <div style={{ marginTop: 10 }}>
          <button onClick={onFixApprove}>
            Arreglar approve (falta {needApprove})
          </button>
        </div>
      )}
    </div>
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
