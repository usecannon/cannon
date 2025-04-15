import { equal } from 'node:assert/strict';
import { bootstrap } from '../helpers/bootstrap';
import { assertRevert } from '../helpers/assert-revert';
import { fixtureSigner } from '../helpers/fixtures';
import { daysToSeconds } from '../helpers/date';
import { getTimestamp } from '../helpers/rpc';
import { assertBn } from '../helpers/assert-bignumber';

type CannonRegistry = Awaited<ReturnType<typeof bootstrap>>['CannonRegistry'];

describe('CannonSubscription', function () {
  let CannonRegistry: CannonRegistry;

  function resetContext() {
    before('load context', async function () {
      const ctx = await bootstrap();
      CannonRegistry = ctx.CannonRegistry;
    });
  }

  describe('when a plan is not registered', function () {
    resetContext();

    it('should not have a default plan', async function () {
      await assertRevert(async () => {
        await CannonRegistry.getDefaultPlan();
      }, 'PlanNotFound(0)');
    });

    it('should return PlanNotFound when getting a non-existent plan', async function () {
      await assertRevert(async () => {
        await CannonRegistry.getPlan(420);
      }, 'PlanNotFound(420)');
    });
  });

  describe('when registering a plan', function () {
    resetContext();

    it('should revert when not owner', async function () {
      const randomUser = await fixtureSigner();
      await assertRevert(async () => {
        await CannonRegistry.connect(randomUser).registerDefaultPlan(100, 100, 100);
      }, `Unauthorized("${await randomUser.getAddress()}")`);
    });

    it('register default plan', async function () {
      const planDuration = daysToSeconds(30);
      const planPrice = 1; // Not implemented
      const planPublishQuota = 500;
      const tx = await CannonRegistry.registerDefaultPlan(planDuration, planPrice, planPublishQuota);
      await tx.wait();
      const plan = await CannonRegistry.getDefaultPlan();
      equal(plan.duration.toString(), planDuration.toString());
      equal(plan.price.toString(), planPrice.toString());
      equal(plan.publishQuota.toString(), planPublishQuota.toString());
    });
  });

  describe('membership management', function () {
    resetContext();

    const planDuration = daysToSeconds(30);
    const planPrice = 1; // Not implemented
    const planPublishQuota = 500;

    before('register default plan', async function () {
      await CannonRegistry.registerDefaultPlan(planDuration, planPrice, planPublishQuota);
    });

    it('returns empty membership for user without one', async function () {
      const randomUser = await fixtureSigner();
      const membership = await CannonRegistry.getMembership(await randomUser.getAddress());
      assertBn.equal(membership.planId, 0);
      assertBn.equal(membership.activatedAt, 0);
      assertBn.equal(membership.publishCount, 0);
      assertBn.equal(membership.termsLeft, 0);
    });

    it('reverts when purchasing an invalid number of terms', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      await assertRevert(async () => {
        await CannonRegistry.purchaseMembership(userAddress, 0);
      }, 'InvalidNumberOfTerms(0)');
    });

    it('can purchase a 1 month membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      const defaultPlan = await CannonRegistry.getDefaultPlan();

      const timestamp = await getTimestamp();

      const tx = await CannonRegistry.purchaseMembership(userAddress, 1);
      await tx.wait();

      const membership = await CannonRegistry.getMembership(userAddress);
      assertBn.equal(membership.planId, defaultPlan.id);
      assertBn.near(membership.activatedAt, timestamp, 10);
      assertBn.equal(membership.publishCount, 0);
      assertBn.equal(membership.termsLeft, 1);
    });

    it('can purchase a 2 month membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      const defaultPlan = await CannonRegistry.getDefaultPlan();

      const timestamp = await getTimestamp();

      const tx = await CannonRegistry.purchaseMembership(userAddress, 2);
      await tx.wait();

      const membership = await CannonRegistry.getMembership(userAddress);
      assertBn.equal(membership.planId, defaultPlan.id);
      assertBn.near(membership.activatedAt, timestamp, 10);
      assertBn.equal(membership.publishCount, 0);
      assertBn.equal(membership.termsLeft, 2);
    });
  });
});
