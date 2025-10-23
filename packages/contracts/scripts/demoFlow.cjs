const hre = require("hardhat");

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForVotingToEnd(circle, claimId) {
  console.log("⏳ Esperando que termine la votación...");
  
  let lastLogTime = 0;
  while (true) {
    const claimInfo = await circle.getClaim(claimId);
    const endTime = Number(claimInfo[4]);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = endTime - currentTime;

    if (timeRemaining <= 0) {
      console.log("   ✅ La votación ha terminado");
      return;
    }

    const currentTimeMs = Date.now();
    if (currentTimeMs - lastLogTime > 30000) {
      const minutes = Math.floor(timeRemaining / 60);
      const seconds = timeRemaining % 60;
      const endTimeDate = new Date(endTime * 1000);
      
      console.log(`   Tiempo restante: ${minutes}m ${seconds}s`);
      console.log(`   La votación termina: ${endTimeDate.toLocaleString()}`);
      console.log(`   Siguiente actualización en 30s...\n`);
      lastLogTime = currentTimeMs;
    }
    
    await sleep(10000);
  }
}

async function main() {
  // Obtener parámetros de VARIABLES DE ENTORNO en lugar de process.argv
  const tokenAddr = process.env.TOKEN_ADDRESS;
  const circleAddr = process.env.CIRCLE_ADDRESS;
  const amountJoinRaw = process.env.JOIN_AMOUNT || "1000000";
  const claimAmountRaw = process.env.CLAIM_AMOUNT || "500000";
  
  if (!tokenAddr || !circleAddr) {
    console.error("Error: Faltan variables de entorno requeridas");
    console.error("TOKEN_ADDRESS:", tokenAddr || "NO DEFINIDA");
    console.error("CIRCLE_ADDRESS:", circleAddr || "NO DEFINIDA");
    console.error("\nEjemplo de uso con variables de entorno:");
    console.error("TOKEN_ADDRESS=0x123... CIRCLE_ADDRESS=0x456... npx hardhat run scripts/demoFlow.cjs --network baseSepolia");
    console.error("\nO con argumentos CLI:");
    console.error("npx hardhat run scripts/demoFlow.cjs --network baseSepolia -- <TOKEN> <CIRCLE> <AMOUNT_JOIN> <CLAIM_AMOUNT>");
    process.exit(1);
  }

  const [user] = await hre.ethers.getSigners();
  const token = await hre.ethers.getContractAt("MockERC20", tokenAddr, user);
  const circle = await hre.ethers.getContractAt("ResQCircle", circleAddr, user);

  const amountJoin = BigInt(amountJoinRaw);
  const claimAmt = BigInt(claimAmountRaw);

  console.log("🚀 Iniciando demo flow...");
  console.log("Usuario:", user.address);
  console.log("Token:", tokenAddr);
  console.log("Circle:", circleAddr);
  console.log("Join Amount:", amountJoin.toString());
  console.log("Claim Amount:", claimAmt.toString());

  try {
    console.log("1. 🪙 Minting tokens...");
    const mintAmount = amountJoin * 10n;
    const mintTx = await token.mint(user.address, mintAmount);
    await mintTx.wait();
    console.log("   ✅ Mint completado");
    await sleep(2000);

    console.log("2. ✅ Approve...");
    const approveAmount = amountJoin * 10n;
    const approveTx = await token.approve(circleAddr, approveAmount);
    await approveTx.wait();
    console.log("   ✅ Approve completado");
    await sleep(2000);

    console.log("3. 👥 joinAndContribute...");
    const joinTx = await circle.joinAndContribute(amountJoin);
    await joinTx.wait();
    console.log("   ✅ Join completado");
    await sleep(2000);

    console.log("4. 📄 openClaim...");
    const claimTx = await circle.openClaim("ipfs://demoCID", claimAmt);
    await claimTx.wait();
    console.log("   ✅ Claim abierto (ID: 0)");
    await sleep(2000);

    console.log("5. 🗳️ vote yes...");
    const voteTx = await circle.vote(0, true);
    await voteTx.wait();
    console.log("   ✅ Voto registrado");
    await sleep(2000);

    await waitForVotingToEnd(circle, 0);

    console.log("6. 🏁 finalizeClaim...");
    const finalizeTx = await circle.finalizeClaim(0);
    await finalizeTx.wait();
    console.log("   ✅ Claim finalizado");

    const bal = await token.balanceOf(user.address);
    console.log("💰 Final token balance:", bal.toString());
    console.log("🎉 Demo completado exitosamente!");

  } catch (error) {
    console.error("❌ Error en el demo:", error.message);
    process.exit(1);
  }
}

main().catch((error) => { 
  console.error("❌ Error fatal:", error); 
  process.exit(1); 
});