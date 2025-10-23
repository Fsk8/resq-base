// deploy.cjs — Hardhat 2.x + ethers v5 (CommonJS)
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("ResQFactory");
  const factory = await Factory.deploy();

  await factory.deployed(); // ethers v5
  console.log("ResQFactory deployed at:", factory.address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
