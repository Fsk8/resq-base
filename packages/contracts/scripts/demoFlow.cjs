const hre = require("hardhat");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForVotingToEnd(circle, claimId) {
  console.log("⏳ Esperando que termine la votación...");

  let lastLogTime = 0;
  while (true) {
    const claimInfo = await circle.getClaim(claimId);
    const endTime = Number(claimInfo[4]); // endTime está en posición 4
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
  // Obtener parámetros de variables de entorno
  const tokenAddr = process.env.TOKEN_ADDRESS;
  const circleAddr = process.env.CIRCLE_ADDRESS;
  const amountJoinRaw = process.env.JOIN_AMOUNT || "1000000";
  const claimAmountRaw = process.env.CLAIM_AMOUNT || "500000";

  if (!tokenAddr || !circleAddr) {
    console.error("Error: Faltan variables de entorno requeridas");
    console.error("TOKEN_ADDRESS:", tokenAddr || "NO DEFINIDA");
    console.error("CIRCLE_ADDRESS:", circleAddr || "NO DEFINIDA");
    process.exit(1);
  }

  const [user] = await hre.ethers.getSigners();
  const token = await hre.ethers.getContractAt("MockERC20", tokenAddr, user);
  const circle = await hre.ethers.getContractAt("ResQCircle", circleAddr, user);

  // CONVERSIONES EXPLÍCITAS A BigInt
  const amountJoin = BigInt(amountJoinRaw);
  const claimAmt = BigInt(claimAmountRaw);

  console.log("🚀 Iniciando demo flow...");
  console.log("================================");
  console.log("Usuario:", user.address);
  console.log("Token:", tokenAddr);
  console.log("Circle:", circleAddr);
  console.log("Join Amount:", amountJoin.toString());
  console.log("Claim Amount:", claimAmt.toString());
  console.log("================================\n");

  try {
    // 1. Mint tokens (usar BigInt explícitamente)
    console.log("1. 🪙 Minting tokens...");
    const mintAmount = amountJoin * 10n; // 'n' para BigInt literal
    const mintTx = await token.mint(user.address, mintAmount);
    await mintTx.wait();
    console.log("   ✅ Mint completado - Amount:", mintAmount.toString());
    await sleep(2000);

    // 2. Approve (usar BigInt explícitamente)
    console.log("2. ✅ Approve...");
    const approveAmount = amountJoin * 10n;
    const approveTx = await token.approve(circleAddr, approveAmount);
    await approveTx.wait();
    console.log("   ✅ Approve completado - Amount:", approveAmount.toString());
    await sleep(2000);

    // 3. Join and contribute
    console.log("3. 👥 joinAndContribute...");
    const joinTx = await circle.joinAndContribute(amountJoin);
    await joinTx.wait();
    console.log("   ✅ Join completado - Amount:", amountJoin.toString());
    await sleep(2000);

    // 4. Open claim
    console.log("4. 📄 openClaim...");
    const claimTx = await circle.openClaim("ipfs://demoCID", claimAmt);
    await claimTx.wait();
    console.log("   ✅ Claim abierto (ID: 0) - Amount:", claimAmt.toString());
    await sleep(2000);

    // 5. Vote
    console.log("5. 🗳️ vote yes...");
    const voteTx = await circle.vote(0, true);
    await voteTx.wait();
    console.log("   ✅ Voto registrado");
    await sleep(2000);

    // 6. Esperar que termine la votación
    await waitForVotingToEnd(circle, 0);

    // 7. Finalizar claim
    console.log("7. 🏁 finalizeClaim...");
    const finalizeTx = await circle.finalizeClaim(0);
    await finalizeTx.wait();
    console.log("   ✅ Claim finalizado");

    // 8. Mostrar balance final
    const bal = await token.balanceOf(user.address);
    console.log("\n=================================");
    console.log("💰 Final token balance:", bal.toString());
    console.log("🎉 Demo completado exitosamente!");
    console.log("=================================");
  } catch (error) {
    console.error("\n❌ Error en el demo:", error.message);

    // Manejo específico de errores
    if (error.message.includes("still voting")) {
      console.log("💡 La votación aún no ha terminado.");
    } else if (error.message.includes("already voted")) {
      console.log("💡 Ya votaste en este claim.");
    } else if (error.message.includes("underpriced")) {
      console.log("💡 Error de transacción. Espera unos minutos y reintenta.");
    } else if (error.message.includes("BigInt")) {
      console.log(
        "💡 Error de conversión BigInt. Verifica los tipos de datos."
      );
    }

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});
