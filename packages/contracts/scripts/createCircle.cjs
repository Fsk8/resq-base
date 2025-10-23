const hre = require("hardhat");

// USO: npx hardhat run scripts/createCircle.cjs --network baseSepolia -- <FACTORY> <TOKEN> <MIN> [DUR=60] [QUORUM=4000] [APPROVE=6000] [CAP=2000]
async function main() {
  const [,, factoryAddr, tokenAddr, minRaw, durRaw, quorumRaw, approveRaw, capRaw] = process.argv;
  if (!factoryAddr || !tokenAddr || !minRaw) {
    console.error("Uso: ... <FACTORY> <TOKEN> <MIN> [DUR] [QUORUM] [APPROVE] [CAP]");
    process.exit(1);
  }

  const dur     = durRaw     ? Number(durRaw)    : 60;
  const quorum  = quorumRaw  ? Number(quorumRaw) : 4000;
  const approve = approveRaw ? Number(approveRaw): 6000;
  const cap     = capRaw     ? Number(capRaw)    : 2000;

  const factory = await hre.ethers.getContractAt("ResQFactory", factoryAddr);
  const tx = await factory.createCircle(tokenAddr, hre.ethers.BigNumber.from(minRaw), dur, quorum, approve, cap);
  const rc = await tx.wait();

  // Buscar evento (v5: logs -> events vía interface)
  const iface = new hre.ethers.utils.Interface([
    "event CircleCreated(address indexed creator, address circle, address token, uint256 minContribution)"
  ]);
  let circle;
  for (const l of rc.logs) {
    try {
      const parsed = iface.parseLog(l);
      if (parsed && parsed.name === "CircleCreated") {
        circle = parsed.args.circle;
        break;
      }
    } catch {}
  }
  console.log("Circle created at:", circle || "(leer del explorer)");
}

main().catch((e) => { console.error(e); process.exit(1); });
