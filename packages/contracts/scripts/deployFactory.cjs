const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("ResQFactory");
  const factory = await Factory.deploy();
  await factory.deployed(); // v5

  console.log("ResQFactory deployed at:", factory.address);
}

main().catch((e) => { console.error(e); process.exit(1); });
