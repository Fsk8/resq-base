import { useEffect, useMemo, useState } from "react";
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

export type DiscoverItem = {
  circle: `0x${string}`;
  token?: `0x${string}`;
  creator?: `0x${string}`;
  tx?: `0x${string}`;
  blockNumber?: bigint | null; // <- permite null (o cambia a ?? undefined al asignar)
};

const RANGE_CHUNK = 80_000n;
const FROM_BLOCK_ENV = import.meta.env.VITE_FACTORY_DEPLOY_BLOCK
  ? BigInt(import.meta.env.VITE_FACTORY_DEPLOY_BLOCK)
  : undefined;

export function useDiscoverCircles(factoryAddr?: `0x${string}`, abi?: Abi) {
  const publicClient = useMemo(
    () => createPublicClient({ chain: baseSepolia, transport: http() }),
    []
  );

  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [debug, setDebug] = useState<string>("");

  async function fetchAll() {
    if (!factoryAddr || !abi) return;
    setLoading(true);
    setDebug("");
    try {
      const latest = await publicClient.getBlockNumber();
      const BACK_LOOK = 300_000n;
      let start =
        FROM_BLOCK_ENV ?? (latest > BACK_LOOK ? latest - BACK_LOOK : 0n);

      const acc: DiscoverItem[] = [];
      while (start <= latest) {
        const end = start + RANGE_CHUNK < latest ? start + RANGE_CHUNK : latest;
        try {
          const logs = await publicClient.getLogs({
            address: factoryAddr,
            fromBlock: start,
            toBlock: end,
          });

          for (const lg of logs as Log[]) {
            try {
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
                  acc.push({
                    creator,
                    circle,
                    token,
                    tx: (lg as any).transactionHash as
                      | `0x${string}`
                      | undefined,
                    blockNumber: lg.blockNumber ?? null, // o usa ?? undefined si prefieres
                  });
                }
              }
            } catch {
              /* ignorar log no decodificable */
            }
          }
        } catch (e: any) {
          setDebug(
            `Aviso: rango ${start}→${end} rechazado por el nodo. Detalle: ${String(
              e?.message || e
            )}`
          );
        }
        start = end + 1n;
      }

      const ordered = [...acc].reverse();
      setItems(ordered);
    } catch (err: any) {
      setDebug(`Error leyendo logs: ${String(err?.message || err)}`);
    } finally {
      setLoading(false);
    }
  }

  return {
    items,
    loading,
    debug,
    refetch: fetchAll,
  };
}
