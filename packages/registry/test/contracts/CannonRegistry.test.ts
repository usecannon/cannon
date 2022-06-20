import { Contract, Signer } from 'ethers';
import { equal } from 'assert/strict';
import { ethers } from 'hardhat';

import assertRevert from '../helpers/assert-revert';

const toBytes32 = ethers.utils.formatBytes32String;

describe('CannonRegistry', function () {
  let registry: Contract;
  let user1: Signer, user2: Signer, user3: Signer;

  before('deploy contract', async function () {
    const CannonRegistry = await ethers.getContractFactory('CannonRegistry');
    registry = await CannonRegistry.deploy();
    await registry.deployed();
  });

  before('identify signers', async function () {
    [user1, user2, user3] = await ethers.getSigners();
  });

  describe('validateName', () => {
    it('only allows lowercase letters, numbers, and dashes', async () => {
      equal(await registry.validateName(toBytes32('some--mo-du9le')), true);
      equal(await registry.validateName(toBytes32('some_-mo-du9le')), false);
      equal(await registry.validateName(toBytes32('some--mo-du9lE')), false);
      // todo: use some hidden character or something
    });

    it('does not allow dash at beginning or end', async () => {
      equal(await registry.validateName(toBytes32('some--module-')), false);
      equal(await registry.validateName(toBytes32('-some--module')), false);
    });

    it('enforces minimum length', async () => {
      const testName = 'abcdefghijk';
      const minLength = await registry.MIN_PACKAGE_NAME_LENGTH();

      equal(await registry.validateName(toBytes32(testName.slice(0, minLength))), true);
      equal(await registry.validateName(toBytes32(testName.slice(0, minLength - 1))), false);
    });
  });

  describe('publish()', () => {
    it('should not allow to publish empty url', async function () {
      await assertRevert(async () => {
        await registry.publish(toBytes32('some-module'), toBytes32('0.0.1'), [], '');
      }, 'InvalidUrl("")');
    });

    it('should not allow invalid name', async function () {
      await assertRevert(async () => {
        await registry.publish(toBytes32('some-module-'), toBytes32('0.0.1'), [], 'ipfs://some-module-hash@0.0.1');
      }, 'InvalidName("0x736f6d652d6d6f64756c652d0000000000000000000000000000000000000000")');
    });

    it('should create the first protocol and assign the owner', async function () {
      const tx = await registry
        .connect(user1)
        .publish(toBytes32('some-module'), toBytes32('0.0.1'), [], 'ipfs://some-module-hash@0.0.1');

      const { events } = await tx.wait();

      equal(events.length, 1);
      equal(events[0].event, 'ProtocolPublish');

      const resultUrl = await registry.getUrl(toBytes32('some-module'), toBytes32('0.0.1'));

      equal(resultUrl, 'ipfs://some-module-hash@0.0.1');
    });

    it('should be able to publish new version', async function () {
      const tx = await registry
        .connect(user1)
        .publish(toBytes32('some-module'), toBytes32('0.0.2'), [], 'ipfs://some-module-hash@0.0.2');

      const { events } = await tx.wait();

      equal(events.length, 1);
      equal(events[0].event, 'ProtocolPublish');
    });

    it('should be able to update an older version', async function () {
      const tx = await registry
        .connect(user1)
        .publish(toBytes32('some-module'), toBytes32('0.0.1'), [], 'ipfs://updated-module-hash@0.0.1');

      const { events } = await tx.wait();

      equal(events.length, 1);
      equal(events[0].event, 'ProtocolPublish');
    });

    it('pushes tags', async function () {
      const tx = await registry.connect(user1).publish(
        toBytes32('some-module'),
        toBytes32('0.0.3'),
        ['latest', 'stable'].map((s) => toBytes32(s)),
        'ipfs://updated-module-hash@0.0.3'
      );

      const { events } = await tx.wait();

      equal(events.length, 1);
      equal(events[0].event, 'ProtocolPublish');

      equal(await registry.getUrl(toBytes32('some-module'), toBytes32('latest')), 'ipfs://updated-module-hash@0.0.3');
      equal(await registry.getUrl(toBytes32('some-module'), toBytes32('stable')), 'ipfs://updated-module-hash@0.0.3');
    });

    it('should not allow to modify protocol from another owner', async function () {
      await assertRevert(async () => {
        await registry
          .connect(user2)
          .publish(toBytes32('some-module'), toBytes32('0.0.4'), [], 'ipfs://updated-module-hash@0.0.4');
      }, 'Unauthorized()');
    });
  });

  describe('nominateNewOwner()', () => {
    it('should not allow nomination from non-owner', async function () {
      await assertRevert(async () => {
        await registry.connect(user2).nominateNewOwner(toBytes32('some-module'), await user2.getAddress());
      }, 'Unauthorized()');
    });

    it('nominates', async function () {
      await registry.connect(user1).nominateNewOwner(toBytes32('some-module'), await user2.getAddress());

      equal(await registry.nominatedOwner(toBytes32('some-module')), await user2.getAddress());
    });
  });

  describe('acceptOwnership()', () => {
    before('nominate new owner', async () => {
      await registry.connect(user1).nominateNewOwner(toBytes32('some-module'), await user2.getAddress());
    });

    it('only nominated owner can accept ownership', async function () {
      await assertRevert(async () => {
        await registry.connect(user3).acceptOwnership(toBytes32('some-module'));
      }, 'Unauthorized()');
    });

    it('accepts ownership', async function () {
      await registry.connect(user2).acceptOwnership(toBytes32('some-module'));
    });
  });
});
