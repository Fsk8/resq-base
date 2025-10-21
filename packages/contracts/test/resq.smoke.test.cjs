const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ResQ smoke", function () {
  it("deploys & pays a claim", async function () {
    const [admin, alice, bob] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("MockUSDC", "mUSDC", 6);
    await token.waitForDeployment();

    const Factory = await ethers.getContractFactory("ResQFactory");
    const factory = await Factory.deploy();
    await factory.waitForDeployment();

    const min = 1_000n,
      dur = 60,
      quorum = 5000,
      approve = 6000,
      cap = 5000;
    const tx = await factory.createCircle(
      await token.getAddress(),
      min,
      dur,
      quorum,
      approve,
      cap
    );
    const rc = await tx.wait();
    const circleAddr = rc.logs[0].args.circle;
    const circle = await ethers.getContractAt("ResQCircle", circleAddr);

    await token.mint(alice.address, 10_000n);
    await token.mint(bob.address, 10_000n);
    await token.connect(alice).approve(circleAddr, 10_000n);
    await token.connect(bob).approve(circleAddr, 10_000n);
    await circle.connect(alice).joinAndContribute(2_000n);
    await circle.connect(bob).joinAndContribute(2_000n);

    await circle.connect(alice).openClaim("ipfs://cid", 1_000n);
    await circle.connect(alice).vote(0, true);
    await circle.connect(bob).vote(0, true);

    await ethers.provider.send("evm_increaseTime", [61]);
    await ethers.provider.send("evm_mine", []);

    const b0 = await token.balanceOf(alice.address);
    await circle.finalizeClaim(0);
    const b1 = await token.balanceOf(alice.address);
    expect(b1 - b0).to.equal(1_000n);
  });
});
