import { bootstrap } from '../helpers/bootstrap';
import { assertRevert } from '../helpers/assert-revert';
import { fixtureSigner } from '../helpers/fixtures';
import { getTimestamp } from '../helpers/rpc';
import { assertBn } from '../helpers/assert-bignumber';
import { ethers } from 'hardhat';

import assert from 'assert/strict';
import { getAddress } from 'viem';

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
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).setAvailablePlans([100, 100, 100]);
      }, `Unauthorized("${await randomUser.getAddress()}")`);
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

      await Token.connect(randomUser).mint(await randomUser.getAddress(), 1234123400);
      await Token.connect(randomUser).approve(CannonSubscription.address, 1234123400);
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).purchaseMembership(1, 12341234);
      }, 'InvalidAmountOfTerms(12341234)');
    });

    it('reverts when attempting to gift membership as non owner', async () => {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).giftMembership(userAddress, 1, 2);
      }, `Unauthorized("${userAddress}")`);
    });

    it('can gift a membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();

      const timestamp = await getTimestamp();

      const tx = await CannonSubscription.giftMembership(userAddress, 1, 1);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(membership.planId, 1);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 10);
      assertBn.near(membership.activeUntil, timestamp + 86400 * 1, 10);
    });

    it('can purchase a 1 month membership', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();

      const timestamp = await getTimestamp();

      await Token.connect(randomUser).mint(await randomUser.getAddress(), 100);
      await Token.connect(randomUser).approve(CannonSubscription.address, 100);

      const tx = await CannonSubscription.connect(randomUser).purchaseMembership(1, 1);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(membership.planId, 1);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 10);
      assertBn.near(membership.activeUntil, timestamp + 86400 * 1, 10);

      assertBn.equal(await Token.balanceOf(userAddress), 0);
    });

    it('can purchase a 2 month membership, use credits, and roll over', async function () {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      const randomConsumer = await fixtureSigner();
      const consumerAddress = await randomConsumer.getAddress();

      const timestamp = await getTimestamp();

      await Token.connect(randomUser).mint(await randomUser.getAddress(), 200);
      await Token.connect(randomUser).approve(CannonSubscription.address, 200);

      const tx = await CannonSubscription.connect(randomUser).purchaseMembership(1, 2);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(membership.planId, 1);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 10);
      assertBn.near(membership.activeUntil, timestamp + 86400 * 2, 10);

      await CannonSubscription.allocateCreditConsumer(consumerAddress, 20);

      // now use all of the remaining credits for this period
      await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 9);

      await assertRevert(async () => {
        await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 2);
      }, 'InsufficientCredits(2, 1)');

      // now move forward in time
      await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp + 86450]);
      await ethers.provider.send('evm_mine', []);

      // now use all of the remaining credits
      await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 10);

      // now cancel the subscription (should not be possible because insufficient terms are remaining)
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).cancelMembership();
      }, `NoTermToCancel("${userAddress}")`);
    });

    it('reverts when purchasing a membership outside of the available ones', async () => {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).purchaseMembership(2, 1);
      }, `PlanNotAvailable("${userAddress}", ${2})`);
    });

    it('reverts when attempting to set custom plans as non owner', async () => {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).setCustomPlans(userAddress, [2]);
      }, `Unauthorized("${userAddress}")`);
    });

    it('reverts when attempting to allocate credits as non owner', async () => {
      const randomUser = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      await assertRevert(async () => {
        await CannonSubscription.connect(randomUser).allocateCreditConsumer(userAddress, 2);
      }, `Unauthorized("${userAddress}")`);
    });

    it('can purchase a custom membership and use credits, then cancel, then update plan and cant get back in', async function () {
      const randomUser = await fixtureSigner();
      const randomConsumer = await fixtureSigner();
      const userAddress = await randomUser.getAddress();
      const consumerAddress = await randomConsumer.getAddress();

      await CannonSubscription.setCustomPlans(userAddress, [2]);

      const timestamp = await getTimestamp();

      await Token.connect(randomUser).mint(await randomUser.getAddress(), 100);
      await Token.connect(randomUser).approve(CannonSubscription.address, 200);

      const tx = await CannonSubscription.connect(randomUser).purchaseMembership(2, 2);
      await tx.wait();

      const membership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(membership.planId, 2);
      assertBn.near(membership.activeFrom, timestamp, 10);
      assertBn.equal(membership.availableCredits, 5);
      assertBn.near(membership.activeUntil, timestamp + 43200 * 2, 10);

      assertBn.equal(await Token.balanceOf(userAddress), 0);

      // cannot use more credits than is allocated to the credit consumer
      await assertRevert(async () => {
        await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 6);
      }, `CreditConsumerExhausted("${consumerAddress}", 6, 0)`);

      await CannonSubscription.allocateCreditConsumer(consumerAddress, 6);

      // cannot use more credits than is in the account
      await assertRevert(async () => {
        await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 6);
      }, 'InsufficientCredits(6, 5)');

      // now use some of the remaining credits
      await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 2);

      // now use all of the remaining credits
      await CannonSubscription.connect(randomConsumer).useMembershipCredits(userAddress, 3);

      // now cancel the subscription
      await CannonSubscription.connect(randomUser).cancelMembership();

      // should have gotten refund
      assertBn.equal(await Token.balanceOf(userAddress), 50);

      const cancelledMembership = await CannonSubscription.getMembership(userAddress);
      assertBn.equal(cancelledMembership.planId, 0);
      assertBn.equal(cancelledMembership.activeFrom, 0);
      assertBn.equal(cancelledMembership.availableCredits, 0);
      assertBn.equal(cancelledMembership.activeUntil, 0);
    });
  });
});
