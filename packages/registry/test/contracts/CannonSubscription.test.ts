import { equal } from 'node:assert/strict';
import { bootstrap } from '../helpers/bootstrap';
import { assertRevert } from '../helpers/assert-revert';
import { fixtureSigner } from '../helpers/fixtures';
import { daysToSeconds } from '../helpers/date';
import { getTimestamp } from '../helpers/rpc';
import { assertBn } from '../helpers/assert-bignumber';

type CannonSubscription = Awaited<ReturnType<typeof bootstrap>>['CannonSubscription'];
type MockERC20 = Awaited<ReturnType<typeof bootstrap>>['MockERC20'];

describe('CannonSubscription', function () {
  let CannonSubscription: CannonSubscription;
  let Token: MockERC20;

  function resetContext() {
    before('load context', async function () {
      const ctx = await bootstrap();
      CannonSubscription = ctx.CannonSubscription;
      Token = ctx.MockERC20;
    });
  }

  describe('when a plan is not registered', function () {
    resetContext();

    it('should not have a default plan', async function () {
      assert.equal((await CannonSubscription.getAvailablePlans(ethers.constants.AddressZero)).length, 0);
    });

    it('should return PlanNotFound when getting a non-existent plan', async function () {
      await assertRevert(async () => {
        await CannonSubscription.getPlan(420);
      }, 'PlanNotFound(420)');
    });
  });

  describe('when registering a plan', function () {
    resetContext();

    it('should revert when not owner', async function () {
      const randomUser = await fixtureSigner();
      await assertRevert(
        async () => {
          await CannonSubscription.connect(randomUser).setAvailablePlans([100, 100, 100]);
        },
        `Unauthorized("${await randomUser.getAddress()}")`,
      );
    });

    it('register default plan', async function () {
      const tx = await CannonSubscription.setAvailablePlans([1]);
      await tx.wait();
      const plans = await CannonSubscription.getAvailablePlans(ethers.constants.AddressZero);

      assert.equal(plans.length, 1);
    });
  });

  describe('membership management', function () {
    resetContext();

    before('register default plan', async function () {
      await CannonSubscription.setAvailablePlans([1]);
    });

    it('returns empty membership for user without one', async function () {
      const randomUser = await fixtureSigner();
      const membership = await CannonSubscription.getMembership(await randomUser.getAddress());
      assertBn.equal(membership.planId, 0);
      assertBn.equal(membership.activeFrom, 0);
      assertBn.equal(membership.activeUntil, 0);
      assertBn.equal(membership.availableCredits, 0);
    });

    it('reverts when purchasing an invalid number of terms', async function () {
      const randomUser = await fixtureSigner();
      await assertRevert(async () => {
        await CannonSubscription.purchaseMembership(1, 0);
      }, 'InvalidAmountOfTerms(0)');

      await Token.connect(randomUser).mint(1234123400);
      await Token.connect(randomUser).approve(CannonSubscription.address, 1234123400);
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).purchaseMembership(1, 12341234);
      }, 'InvalidAmountOfTerms(12341234)');
    });

    it('can purchase a 1 month membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();

      const timestamp = await getTimestamp();

      await Token.connect(randomUser).mint(100);
      await Token.connect(randomUser).approve(CannonSubscription.address, 100);

      const tx = await CannonSubscription.connect(randomUser).purchaseMembership(1, 1);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(membership.planId, 1);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 10);
      assertBn.near(membership.activeUntil, timestamp + 86400 * 1, 10);
    });

    it('can purchase a 2 month membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      const defaultPlan = 1;

      const timestamp = await getTimestamp();

      await Token.connect(randomUser).mint(200);
      await Token.connect(randomUser).approve(CannonSubscription.address, 200);


      const tx = await CannonSubscription.connect(randomUser).purchaseMembership(1, 2);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      console.log('membership', membership);
      assertBn.equal(membership.planId, 1);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 10);
      assertBn.near(membership.activeUntil, timestamp + 86400 * 2, 10);
    });
  });
});
