const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await hre.ethers.getContractFactory("ResQFactory", deployer);
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("ResQFactory deployed at:", await factory.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
