const { ethers } = require("hardhat");

async function main() {
  // Obtener parámetros con valores por defecto más robustos
  const factoryAddr = process.env.FACTORY_ADDRESS;
  const tokenAddr = process.env.TOKEN_ADDRESS;
  const minRaw = process.env.MIN_AMOUNT;

  // Si faltan variables de entorno, mostrar ayuda específica
  if (!factoryAddr || !tokenAddr || !minRaw) {
    console.error("❌ Error: Faltan variables de entorno requeridas");

    if (!factoryAddr) console.error("   - FACTORY_ADDRESS no está definida");
    if (!tokenAddr) console.error("   - TOKEN_ADDRESS no está definida");
    if (!minRaw) console.error("   - MIN_AMOUNT no está definida");

    console.error("\n💡 Asegúrate de que tu archivo .env contiene:");
    console.error("   FACTORY_ADDRESS=0xtu_direccion_factory");
    console.error("   TOKEN_ADDRESS=0xtu_direccion_token");
    console.error("   MIN_AMOUNT=1000000");
    console.error("\n📁 El archivo .env debe estar en la raíz del proyecto");
    process.exit(1);
  }

  // Configurar valores con variables de entorno
  const dur = process.env.DURATION ? Number(process.env.DURATION) : 259200;
  const quorum = process.env.QUORUM ? Number(process.env.QUORUM) : 4000;
  const approve = process.env.APPROVAL_THRESHOLD
    ? Number(process.env.APPROVAL_THRESHOLD)
    : 6000;
  const cap = process.env.CAPACITY ? Number(process.env.CAPACITY) : 2000;

  console.log("✅ Creando círculo con parámetros:");
  console.log("   Factory:", factoryAddr);
  console.log("   Token:", tokenAddr);
  console.log("   Monto mínimo:", minRaw);
  console.log("   Duración:", dur, "segundos");
  console.log("   Quórum:", quorum / 100 + "%");
  console.log("   Aprobación:", approve / 100 + "%");
  console.log("   Capacidad:", cap / 100 + "%");

  const [deployer] = await ethers.getSigners();
  console.log("   Cuenta:", deployer.address);

  // Crear el círculo
  const factory = await ethers.getContractAt("ResQFactory", factoryAddr);
  console.log("🔄 Enviando transacción...");

  const tx = await factory.createCircle(
    tokenAddr,
    BigInt(minRaw),
    dur,
    quorum,
    approve,
    cap
  );

  console.log("📨 Transacción enviada:", tx.hash);
  const rc = await tx.wait();

  const ev = rc.logs.find(
    (l) => l.fragment && l.fragment.name === "CircleCreated"
  );
  const circle = ev ? ev.args.circle : undefined;

  if (circle) {
    console.log("✅ Circle creado en:", circle);
  } else {
    console.log(
      "⚠️  Transacción confirmada pero no se encontró el evento CircleCreated"
    );
    console.log("Hash:", tx.hash);
  }
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
