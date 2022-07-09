import { Signer } from 'ethers';
import { ok, equal, deepEqual } from 'assert/strict';
import { ethers } from 'hardhat';
import { CannonRegistry as TCannonRegistry } from '../../typechain-types/contracts/CannonRegistry';

import assertRevert from '../helpers/assert-revert';

const toBytes32 = ethers.utils.formatBytes32String;

describe('CannonRegistry', function () {
  let CannonRegistry: TCannonRegistry;
  let user1: Signer, user2: Signer, user3: Signer;

  before('identify signers', async function () {
    [user1, user2, user3] = await ethers.getSigners();
  });

  before('deploy contract', async function () {
    const CannonRegistryFactory = await ethers.getContractFactory(
      'CannonRegistry'
    );
    const Implementation = await CannonRegistryFactory.deploy();
    await Implementation.deployed();
    const ProxyFactory = await ethers.getContractFactory('Proxy');
    const Proxy = await ProxyFactory.deploy(Implementation.address);
    await Proxy.deployed();

    CannonRegistry = (await ethers.getContractAt(
      'CannonRegistry',
      Proxy.address
    )) as TCannonRegistry;

    const owner = await user1.getAddress();
    await CannonRegistry.nominateNewOwner(owner).then((tx) => tx.wait());
    await CannonRegistry.acceptOwnership().then((tx) => tx.wait());
  });

  describe('Upgradedability', function () {
    let newImplementation: TCannonRegistry;

    before('deploy new implementation', async function () {
      const CannonRegistry = await ethers.getContractFactory('CannonRegistry');
      newImplementation = (await CannonRegistry.deploy()) as TCannonRegistry;
      await newImplementation.deployed();
    });

    it('upgrades to a new implementation', async function () {
      const { address } = newImplementation;
      await CannonRegistry.upgradeTo(address).then((tx) => tx.wait());

      equal(
        await CannonRegistry.getImplementation(),
        newImplementation.address
      );
    });
  });

  describe('validatePackageName()', function () {
    it('only allows lowercase letters, numbers, and dashes', async function () {
      equal(
        await CannonRegistry.validatePackageName(toBytes32('some--mo-du9le')),
        true
      );
      equal(
        await CannonRegistry.validatePackageName(toBytes32('some_-mo-du9le')),
        false
      );
      equal(
        await CannonRegistry.validatePackageName(toBytes32('some--mo-du9lE')),
        false
      );
      equal(
        await CannonRegistry.validatePackageName(toBytes32('some$module')),
        false
      );
    });

    it('does not allow dash at beginning or end', async function () {
      equal(
        await CannonRegistry.validatePackageName(toBytes32('some--module-')),
        false
      );
      equal(
        await CannonRegistry.validatePackageName(toBytes32('-some--module')),
        false
      );
    });

    it('enforces minimum length', async function () {
      const testName = 'abcdefghijk';
      const minLength = Number(await CannonRegistry.MIN_PACKAGE_NAME_LENGTH());

      equal(
        await CannonRegistry.validatePackageName(
          toBytes32(testName.slice(0, minLength))
        ),
        true
      );
      equal(
        await CannonRegistry.validatePackageName(
          toBytes32(testName.slice(0, minLength - 1))
        ),
        false
      );
    });
  });

  describe('publish()', function () {
    it('should not allow to publish empty url', async function () {
      await assertRevert(async () => {
        await CannonRegistry.publish(
          toBytes32('some-module'),
          toBytes32('0.0.1'),
          [],
          ''
        );
      }, 'InvalidUrl("")');
    });

    it('should not allow invalid name', async function () {
      await assertRevert(async () => {
        await CannonRegistry.publish(
          toBytes32('some-module-'),
          toBytes32('0.0.1'),
          [],
          'ipfs://some-module-hash@0.0.1'
        );
      }, 'InvalidName("0x736f6d652d6d6f64756c652d0000000000000000000000000000000000000000")');
    });

    it('should create the first protocol and assign the owner', async function () {
      const tx = await CannonRegistry.connect(user1).publish(
        toBytes32('some-module'),
        toBytes32('0.0.1'),
        [],
        'ipfs://some-module-hash@0.0.1'
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'ProtocolPublish');

      const resultUrl = await CannonRegistry.getPackageUrl(
        toBytes32('some-module'),
        toBytes32('0.0.1')
      );

      equal(resultUrl, 'ipfs://some-module-hash@0.0.1');
    });

    it('should be able to publish new version', async function () {
      const tx = await CannonRegistry.connect(user1).publish(
        toBytes32('some-module'),
        toBytes32('0.0.2'),
        [],
        'ipfs://some-module-hash@0.0.2'
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'ProtocolPublish');
    });

    it('should be able to update an older version', async function () {
      const tx = await CannonRegistry.connect(user1).publish(
        toBytes32('some-module'),
        toBytes32('0.0.1'),
        [],
        'ipfs://updated-module-hash@0.0.1'
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'ProtocolPublish');
    });

    it('pushes tags', async function () {
      const tx = await CannonRegistry.connect(user1).publish(
        toBytes32('some-module'),
        toBytes32('0.0.3'),
        ['latest', 'stable'].map((s) => toBytes32(s)),
        'ipfs://updated-module-hash@0.0.3'
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'ProtocolPublish');

      equal(
        await CannonRegistry.getPackageUrl(
          toBytes32('some-module'),
          toBytes32('latest')
        ),
        'ipfs://updated-module-hash@0.0.3'
      );
      equal(
        await CannonRegistry.getPackageUrl(
          toBytes32('some-module'),
          toBytes32('stable')
        ),
        'ipfs://updated-module-hash@0.0.3'
      );
    });

    it('should not allow to modify protocol from another owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).publish(
          toBytes32('some-module'),
          toBytes32('0.0.4'),
          [],
          'ipfs://updated-module-hash@0.0.4'
        );
      }, 'Unauthorized()');
    });
  });

  describe('nominatePackageOwner()', function () {
    it('should not allow nomination from non-owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).nominatePackageOwner(
          toBytes32('some-module'),
          await user2.getAddress()
        );
      }, 'Unauthorized()');
    });

    it('nominates', async function () {
      await CannonRegistry.connect(user1).nominatePackageOwner(
        toBytes32('some-module'),
        await user2.getAddress()
      );

      equal(
        await CannonRegistry.getPackageNominatedOwner(
          toBytes32('some-module')
        ),
        await user2.getAddress()
      );
    });
  });

  describe('acceptPackageOwnership()', function () {
    before('nominate new owner', async function () {
      await CannonRegistry.connect(user1).nominatePackageOwner(
        toBytes32('some-module'),
        await user2.getAddress()
      );
    });

    it('only nominated owner can accept ownership', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user3).acceptPackageOwnership(
          toBytes32('some-module')
        );
      }, 'Unauthorized()');
    });

    it('accepts ownership', async function () {
      await CannonRegistry.connect(user2).acceptPackageOwnership(
        toBytes32('some-module')
      );
    });
  });

  describe('getPackages()', function () {
    it('returns created protocols', async function () {
      const result = await CannonRegistry.connect(user2).getPackages();
      ok(Array.isArray(result));
    });
  });

  describe('getPackageVersions()', function () {
    it('returns protocol versions', async function () {
      const result = await CannonRegistry.connect(user2).getPackageVersions(
        toBytes32('some-module')
      );

      deepEqual(result, [
        toBytes32('0.0.1'),
        toBytes32('0.0.2'),
        toBytes32('0.0.3'),
      ]);
    });
  });
});
