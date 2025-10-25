// test/resq.smoke.test.cjs
/* eslint-disable no-console */
const { expect } = require("chai");
const { ethers } = require("hardhat");

console.log(">>> RUNNING SMOKE TEST FILE <<<", __filename);

describe("ResQ smoke (tolerant)", function () {
  it("deploys & pays a claim (sanity)", async function () {
    const [admin, alice, bob] = await ethers.getSigners();

    const Mock = await ethers.getContractFactory("MockERC20");
    const token = await Mock.deploy("Mock", "MCK", 18);
    await token.deployed();

    const toUnits = (n) => ethers.utils.parseUnits(String(n), 18);

    await token.mint(alice.address, toUnits(10_000));
    await token.mint(bob.address, toUnits(10_000));

    const Factory = await ethers.getContractFactory("ResQFactory");
    const factory = await Factory.deploy();
    await factory.deployed();

    const minContribution = toUnits(1_000);
    const voteDuration = 60;
    const quorumBps = 4000;
    const approveBps = 6000;
    const maxPayoutPerClaimBps = 2000;

    const txCreate = await factory.createCircle(
      token.address,
      minContribution,
      voteDuration,
      quorumBps,
      approveBps,
      maxPayoutPerClaimBps
    );
    const rcCreate = await txCreate.wait();
    const ev = rcCreate.events.find((e) => e.event === "CircleCreated");
    if (!ev) {
      console.log("DEBUG: rcCreate.events =", rcCreate.events);
      throw new Error("CircleCreated event not found");
    }
    const circleAddr = ev.args.circle;

    const Circle = await ethers.getContractFactory("ResQCircle");
    const circle = Circle.attach(circleAddr);

    await token.connect(alice).approve(circle.address, toUnits(5_000));
    await token.connect(bob).approve(circle.address, toUnits(5_000));

    await circle.connect(alice).joinAndContribute(minContribution);
    await circle.connect(bob).joinAndContribute(minContribution);

    const evidence = "ipfs://demo-cid";
    const amountRequested = toUnits(300);
    await circle.connect(alice).openClaim(evidence, amountRequested);

    const claimsCount = await circle.claimsCount();
    const claimId = claimsCount.sub(1);

    await circle.connect(alice).vote(claimId, true);
    await circle.connect(bob).vote(claimId, true);

    await ethers.provider.send("evm_increaseTime", [voteDuration + 1]);
    await ethers.provider.send("evm_mine", []);

    const circleBalBefore = await token.balanceOf(circle.address);
    const aliceBalBefore = await token.balanceOf(alice.address);

    const txFin = await circle.finalizeClaim(claimId);
    const rcFin = await txFin.wait();

    // Intenta leer el evento (si falla, seguimos con balances)
    let amountPaidFromEvent = null;
    if (rcFin && Array.isArray(rcFin.events)) {
      const evProcessed = rcFin.events.find((e) => e.event === "ClaimProcessed");
      if (evProcessed && evProcessed.args && evProcessed.args.amountPaid) {
        amountPaidFromEvent = evProcessed.args.amountPaid;
      }
    }

    const circleBalAfter = await token.balanceOf(circle.address);
    const aliceBalAfter = await token.balanceOf(alice.address);

    const paidFromCircle = circleBalBefore.sub(circleBalAfter);
    const receivedByAlice = aliceBalAfter.sub(aliceBalBefore);

    // DEBUG SIEMPRE:
    console.log("DEBUG smoke:");
    console.log(" file            :", __filename);
    console.log(" amountRequested :", amountRequested.toString());
    console.log(" circleBalBefore :", circleBalBefore.toString());
    console.log(" circleBalAfter  :", circleBalAfter.toString());
    console.log(" paidFromCircle  :", paidFromCircle.toString());
    console.log(" aliceBalBefore  :", aliceBalBefore.toString());
    console.log(" aliceBalAfter   :", aliceBalAfter.toString());
    console.log(" receivedByAlice :", receivedByAlice.toString());
    console.log(" amountPaidEvent :", amountPaidFromEvent ? amountPaidFromEvent.toString() : "(no event)");

    // Asserts TOLERANTES (sanity):
    // 1) Pagó algo y no más que lo pedido
    expect(receivedByAlice.gt(0)).to.eq(true, "Alice no recibió tokens");
    expect(receivedByAlice.lte(amountRequested)).to.eq(true, "Pago mayor a lo solicitado");

    // 2) Lo que sale del circle y lo que entra a Alice deben ser iguales (delta=0)
    const delta = paidFromCircle.sub(receivedByAlice);
    expect(delta.isZero()).to.eq(true, "Desajuste círculo vs Alice");

    // 3) Claim finalizado y marcado pagado
    const claim = await circle.getClaim(claimId);
    expect(claim.finalized).to.eq(true);
    expect(claim.paid).to.eq(true);
  });
});

