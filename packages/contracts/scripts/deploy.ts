import { ethers } from "hardhat";

async function main() {
  const Factory = await ethers.getContractFactory("ResQFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("ResQFactory deployed at:", await factory.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
