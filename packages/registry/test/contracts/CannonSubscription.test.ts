import { bootstrap } from '../helpers/bootstrap';
import { assertRevert } from '../helpers/assert-revert';
import { fixtureSigner } from '../helpers/fixtures';
import { equal } from 'assert/strict';

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
        await CannonRegistry.connect(randomUser).registerSubscriptionPlan(100, 100, 100);
      }, `Unauthorized("${await randomUser.getAddress()}")`);
    });

    it('register default plan', async function () {
      await CannonRegistry.registerSubscriptionPlan(30, 1000, 500);
      const plan = await CannonRegistry.getDefaultPlan();
      equal(plan.termDuration, 30);
      equal(plan.feeUSDC, 1000);
      equal(plan.publishQuota, 500);
    });
  });

  describe('membership management', function () {
    it('returns empty membership for non-member', async function () {
      const randomUser = await fixtureSigner();
      const membership = await CannonRegistry.getMembership(await randomUser.getAddress());
      equal(membership.planId, 0);
      equal(membership.activatedAt, 0);
      equal(membership.publishCount, 0);
      equal(membership.termsLeft, 0);
    });
  });
});
