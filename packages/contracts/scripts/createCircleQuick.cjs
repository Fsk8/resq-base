const { ethers } = require("hardhat");

async function main() {
  const factoryAddr =
    process.env.FACTORY_ADDRESS || "0x90a9b7f357cC42Fcd4132CE94633507157C145ee";
  const tokenAddr = process.env.TOKEN_ADDRESS;

  if (!tokenAddr) {
    console.error("TOKEN_ADDRESS no definida");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  const factory = await ethers.getContractAt("ResQFactory", factoryAddr);

  console.log("Creando círculo para testing (5 minutos de votación)...");

  const tx = await factory.createCircle(
    tokenAddr,
    "1000000", // minContribution
    300, // voteDuration: 300 segundos = 5 minutos
    4000, // quorumBps: 40%
    6000, // approveBps: 60%
    2000 // maxPayoutPerClaimBps: 20%
  );

  const rc = await tx.wait();
  const ev = rc.logs.find(
    (l) => l.fragment && l.fragment.name === "CircleCreated"
  );
  const circle = ev ? ev.args.circle : undefined;

  console.log("✅ Circle creado en:", circle);
  console.log("⏰ Duración de votación: 5 minutos");
}

main().catch(console.error);
