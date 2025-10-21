const { ethers } = require("hardhat");

async function main() {
  const Mock = await ethers.getContractFactory("MockERC20");
  const token = await Mock.deploy("MockUSDC", "mUSDC", 6);
  await token.waitForDeployment();
  console.log("MockERC20 deployed at:", await token.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
