// scripts/createCircle_5m.cjs
require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const factoryAddr =
    process.env.FACTORY_ADDRESS || "0x90a9b7f357cC42Fcd4132CE94633507157C145ee";
  const tokenAddr = process.env.TOKEN_ADDRESS;

  if (!tokenAddr) {
    console.error("❌ TOKEN_ADDRESS no definida en .env");
    process.exit(1);
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Factory:", factoryAddr);
  console.log("Token  :", tokenAddr);

  const factory = await hre.ethers.getContractAt("ResQFactory", factoryAddr);

  console.log("Creando círculo para testing (5 minutos de votación)...");
  const tx = await factory.createCircle(
    tokenAddr,
    ethers.BigNumber.from("1000000"), // minContribution (1.0 si token tiene 6 decimales)
    300,   // voteDuration: 300s = 5 min
    4000,  // quorumBps: 40%
    6000,  // approveBps: 60%
    2000   // maxPayoutPerClaimBps: 20%
  );

  const receipt = await tx.wait();
  // Intento 1: eventos ya parseados por ethers v5
  let circle;
  for (const ev of receipt.events || []) {
    if (ev && ev.event === "CircleCreated" && ev.args) {
      circle = ev.args.circle;
      break;
    }
  }

  // Intento 2 (fallback): parsear logs manualmente con Interface
  if (!circle) {
    const iface = new hre.ethers.utils.Interface([
      "event CircleCreated(address indexed creator, address circle, address token, uint256 minContribution)"
    ]);
    for (const log of receipt.logs || []) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "CircleCreated") {
          circle = parsed.args.circle;
          break;
        }
      } catch (_) {}
    }
  }

  if (!circle) {
    console.log("⚠️ No pude extraer la dirección del círculo del receipt. Revisa el tx en el explorer.");
  } else {
    console.log("✅ Circle creado en:", circle);
  }
  console.log("⏰ Duración de votación: 5 minutos");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

