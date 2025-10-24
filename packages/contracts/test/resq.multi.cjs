// packages/contracts/test/resq.multi.cjs
const { expect } = require("chai");
const { ethers } = require("hardhat");

/** Helpers */
const toUnits = (v, decimals = 18) =>
  ethers.utils.parseUnits(String(v), decimals);

async function increaseTime(seconds) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("🧪 ResQ multi-user logic", function () {
  let owner, alice, bob, carol;
  let token, factory;
  const decimals = 18;

  before(async () => {
    [owner, alice, bob, carol] = await ethers.getSigners();
  });

  async function deployMockErc20() {
    // Ajusta si tu MockERC20 tiene otra firma de constructor
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const erc20 = await MockERC20.deploy("TEST", "TST", decimals);
    await erc20.deployed();
    return erc20;
  }

  async function deployFactory() {
    const Factory = await ethers.getContractFactory("ResQFactory");
    const f = await Factory.deploy();
    await f.deployed();
    return f;
  }

  async function createCircle(params) {
    const tx = await factory.createCircle(
      params.token.address,
      params.minContribution,
      params.voteDuration,
      params.quorumBps,
      params.approveBps,
      params.capBps
    );
    const rc = await tx.wait();

    const ev = rc.events.find((e) => {
      try {
        return e.event === "CircleCreated";
      } catch {
        return false;
      }
    });
    if (!ev || !ev.args) throw new Error("No se encontró evento CircleCreated");

    const circleAddr = ev.args.circle;
    const circle = await ethers.getContractAt("ResQCircle", circleAddr);
    return { circle, circleAddr };
  }

  beforeEach(async () => {
    token = await deployMockErc20();
    factory = await deployFactory();

    // Mint inicial (si tu Mock exige onlyOwner, mintea con owner y transfiere)
    await token.mint(await alice.getAddress(), toUnits(10_000, decimals));
    await token.mint(await bob.getAddress(), toUnits(10_000, decimals));
    await token.mint(await carol.getAddress(), toUnits(10_000, decimals));
  });

  it("✔ flujo feliz: se alcanza quórum y mayoría", async () => {
    const { circle, circleAddr } = await createCircle({
      token,
      minContribution: toUnits(10),
      voteDuration: 60,
      quorumBps: 4000, // 40%
      approveBps: 6000, // 60%
      capBps: 2000, // 20%
    });

    // Alice (50), Bob (100)
    await token.connect(alice).approve(circleAddr, toUnits(50));
    await circle.connect(alice).joinAndContribute(toUnits(50));

    await token.connect(bob).approve(circleAddr, toUnits(100));
    await circle.connect(bob).joinAndContribute(toUnits(100));

    // Claim por 30 (Alice)
    const claimAmt = toUnits(30);
    await circle.connect(alice).openClaim("ipfs://ev", claimAmt);

    // Votan sí
    await circle.connect(alice).vote(0, true);
    await circle.connect(bob).vote(0, true);

    await increaseTime(61);

    const beforeAlice = await token.balanceOf(await alice.getAddress());
    await circle.finalizeClaim(0);
    const afterAlice = await token.balanceOf(await alice.getAddress());

    expect(afterAlice.gt(beforeAlice)).to.be.true;
  });

  it("❌ falta quórum → finalize NO paga (rechazado)", async () => {
    const { circle, circleAddr } = await createCircle({
      token,
      minContribution: toUnits(10),
      voteDuration: 60,
      quorumBps: 8000, // 80% requerido
      approveBps: 5000, // 50%
      capBps: 5000, // 50%
    });

    // Dos miembros con mismo stake (100 + 100)
    await token.connect(alice).approve(circleAddr, toUnits(100));
    await circle.connect(alice).joinAndContribute(toUnits(100));

    await token.connect(bob).approve(circleAddr, toUnits(100));
    await circle.connect(bob).joinAndContribute(toUnits(100));

    // Claim por 10; SOLO Alice vota (participación 50% < 80% → sin quórum)
    await circle.connect(alice).openClaim("ipfs://ev", toUnits(10));
    await circle.connect(alice).vote(0, true);
    // Bob no vota

    await increaseTime(61);

    const beforeAlice = await token.balanceOf(await alice.getAddress());
    const beforeCircle = await token.balanceOf(circleAddr);

    // finalize: no debe pagar por falta de quórum
    await circle.finalizeClaim(0);

    const afterAlice = await token.balanceOf(await alice.getAddress());
    const afterCircle = await token.balanceOf(circleAddr);

    const paidToAlice = afterAlice.sub(beforeAlice);
    const diffCircle = beforeCircle.sub(afterCircle);

    // ✅ No hay pago
    expect(paidToAlice.eq(0)).to.be.true;
    expect(diffCircle.eq(0)).to.be.true;

    // Flags si existen (no obligamos finalized=true porque tu contrato podría no marcarlo)
    const claim = await circle.getClaim(0);
    const paid =
      (claim.paid !== undefined ? claim.paid : undefined) ??
      (claim.isPaid !== undefined ? claim.isPaid : undefined) ??
      claim[8]; // si tu struct coincide
    if (typeof paid === "boolean") {
      expect(paid).to.eq(false);
    }
  });

  it("⚖️ cap limita el pago", async () => {
    const { circle, circleAddr } = await createCircle({
      token,
      minContribution: toUnits(10),
      voteDuration: 60,
      quorumBps: 4000,
      approveBps: 6000,
      capBps: 1000, // 10%
    });

    // Pool = 300 (100 + 200)
    await token.connect(alice).approve(circleAddr, toUnits(100));
    await circle.connect(alice).joinAndContribute(toUnits(100));

    await token.connect(bob).approve(circleAddr, toUnits(200));
    await circle.connect(bob).joinAndContribute(toUnits(200));

    const amountRequested = toUnits(80);
    await circle.connect(bob).openClaim("ipfs://ev", amountRequested);
    await circle.connect(alice).vote(0, true);
    await circle.connect(bob).vote(0, true);

    await increaseTime(61);

    const beforeBob = await token.balanceOf(await bob.getAddress());
    const beforeCircle = await token.balanceOf(circleAddr);

    await circle.finalizeClaim(0);

    const afterBob = await token.balanceOf(await bob.getAddress());
    const afterCircle = await token.balanceOf(circleAddr);

    const paidToBob = afterBob.sub(beforeBob);
    const diffCircle = beforeCircle.sub(afterCircle);
    const cap = beforeCircle.mul(1000).div(10000); // 10% del pool antes de pagar

    // Chequeos robustos
    expect(paidToBob.gt(0)).to.be.true;
    expect(paidToBob.lte(cap)).to.be.true;
    expect(paidToBob.lte(amountRequested)).to.be.true;
    expect(diffCircle.eq(paidToBob)).to.be.true;

    const claim = await circle.getClaim(0);
    // finalized/paid si existen:
    const paid =
      (claim.paid !== undefined ? claim.paid : undefined) ??
      (claim.isPaid !== undefined ? claim.isPaid : undefined) ??
      claim[8];
    if (typeof paid === "boolean") {
      expect(paid).to.eq(true);
    }
  });
});
