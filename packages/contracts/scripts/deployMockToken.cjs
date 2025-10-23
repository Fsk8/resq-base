const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Mock = await hre.ethers.getContractFactory("MockERC20");
  const token = await Mock.deploy("MockUSDC", "mUSDC", 6);
  await token.deployed();

  console.log("MockERC20 deployed at:", token.address);
}

main().catch((e) => { console.error(e); process.exit(1); });
