import { equal, rejects } from 'assert/strict';
import { ethers } from 'hardhat';
import { Contract, Signer } from 'ethers';

const toBytes32 = ethers.utils.formatBytes32String;

describe('CannonRegistry', function () {
  let registry: Contract;
  let user1: Signer, user2: Signer;

  before('deploy contract', async function () {
    const CannonRegistry = await ethers.getContractFactory('CannonRegistry');
    registry = await CannonRegistry.deploy();
    await registry.deployed();
  });

  before('identify signers', async function () {
    [user1, user2] = await ethers.getSigners();
  });

  it('should not allow to publish empty url', async function () {
    await rejects(async () => {
      await registry.publish(
        toBytes32('some-module'),
        toBytes32('0.0.1'),
        ''
      );
    }, {
      message: 'VM Exception while processing transaction: reverted with custom error \'InvalidUrl()\'',
    });
  });

  it('should create the first protocol and assign the owner', async function () {
    const tx = await registry.connect(user1).publish(
      toBytes32('some-module'),
      toBytes32('0.0.1'),
      'ipfs://some-module-hash@0.0.1'
    );

    const { events } = await tx.wait();

    equal(events.length, 1);
    equal(events[0].event, 'ProtocolPublish');
  });

  it('should be able to publish new version', async function () {
    const tx = await registry.connect(user1).publish(
      toBytes32('some-module'),
      toBytes32('0.0.2'),
      'ipfs://some-module-hash@0.0.2'
    );

    const { events } = await tx.wait();

    equal(events.length, 1);
    equal(events[0].event, 'ProtocolPublish');
  });

  it('should be able to update an older version', async function () {
    const tx = await registry.connect(user1).publish(
      toBytes32('some-module'),
      toBytes32('0.0.1'),
      'ipfs://updated-module-hash@0.0.1'
    );

    const { events } = await tx.wait();

    equal(events.length, 1);
    equal(events[0].event, 'ProtocolPublish');
  });

  it('should not allow to modify protocol from another owner', async function () {
    await rejects(async () => {
      await registry.connect(user2).publish(
        toBytes32('some-module'),
        toBytes32('0.0.3'),
        'ipfs://updated-module-hash@0.0.3'
      );
    }, {
      message: 'VM Exception while processing transaction: reverted with custom error \'Unauthorized()\'',
    });
  });
});
