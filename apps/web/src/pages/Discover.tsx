import { useMemo, useState } from "react";
import type { Abi } from "viem";
import { createThirdwebClient, getContract } from "thirdweb";
import {
  useDiscoverCircles,
  type DiscoverItem,
} from "../hooks/useDiscoverCircles";
import { baseSepolia } from "thirdweb/chains";

export function Discover({
  client,
  factoryAddress,
  factoryAbi,
  onPick,
}: {
  client: ReturnType<typeof createThirdwebClient>;
  factoryAddress: `0x${string}`;
  factoryAbi: Abi;
  onPick: (circle: `0x${string}`, token?: `0x${string}`) => void;
}) {
  const { items, loading, debug, refetch } = useDiscoverCircles(
    factoryAddress,
    factoryAbi
  );

  const [q, setQ] = useState("");
  const [onlyWithToken, setOnlyWithToken] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (onlyWithToken && !it.token) return false;
      if (!needle) return true;
      return (
        it.circle.toLowerCase().includes(needle) ||
        (it.token?.toLowerCase().includes(needle) ?? false) ||
        (it.creator?.toLowerCase().includes(needle) ?? false) ||
        (it.tx?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [items, q, onlyWithToken]);

  return (
    <section>
      <h2>Discover Circles</h2>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          placeholder="Buscar por circle/token/creator/tx..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ minWidth: 280 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyWithToken}
            onChange={() => setOnlyWithToken((v) => !v)}
          />
          Solo con token asignado
        </label>
        <button onClick={refetch} disabled={loading}>
          {loading ? "Cargando..." : "Refrescar"}
        </button>
      </div>

      <p style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
        Factory: {factoryAddress} · Red: Base Sepolia
      </p>

      {loading && <p>Cargando círculos…</p>}
      {!loading && filtered.length === 0 && (
        <p>No hay círculos para mostrar.</p>
      )}

      <ul style={{ paddingLeft: 0, listStyle: "none", marginTop: 12 }}>
        {filtered.map((it) => (
          <DiscoverCard
            key={`${it.circle}-${it.tx ?? ""}`}
            item={it}
            onPick={onPick}
          />
        ))}
      </ul>

      {debug && (
        <pre
          style={{
            background: "#fafafa",
            padding: 10,
            borderRadius: 8,
            overflowX: "auto",
            fontSize: 12,
            whiteSpace: "pre-wrap",
            marginTop: 12,
          }}
        >
          {debug}
        </pre>
      )}
    </section>
  );
}

function DiscoverCard({
  item,
  onPick,
}: {
  item: DiscoverItem;
  onPick: (circle: `0x${string}`, token?: `0x${string}`) => void;
}) {
  return (
    <li
      style={{
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        display: "grid",
        gridTemplateColumns: "160px 1fr",
        gap: 8,
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 12 }}>Circle</div>
      <div>{item.circle}</div>

      {item.token && (
        <>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Token</div>
          <div>{item.token}</div>
        </>
      )}

      {item.creator && (
        <>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Creator</div>
          <div>{item.creator}</div>
        </>
      )}

      {item.tx && (
        <>
          <div style={{ opacity: 0.7, fontSize: 12 }}>TX</div>
          <div>
            <a
              href={`https://sepolia-explorer.base.org/tx/${item.tx}`}
              target="_blank"
              rel="noreferrer"
            >
              Ver en explorer
            </a>
          </div>
        </>
      )}

      {item.blockNumber !== undefined && item.blockNumber !== null && (
        <>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Bloque</div>
          <div>{item.blockNumber.toString()}</div>
        </>
      )}

      <div />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => onPick(item.circle, item.token)}>
          Usar este círculo
        </button>
      </div>
    </li>
  );
}
