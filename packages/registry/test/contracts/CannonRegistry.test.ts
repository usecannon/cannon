import { deepEqual, equal, ok } from 'assert/strict';
import { BigNumber, ContractTransaction, Signer } from 'ethers';
import { ethers } from 'hardhat';
import { stringToHex } from 'viem';
import { CannonRegistry as TCannonRegistry } from '../../typechain-types/contracts/CannonRegistry';
import { MockOptimismBridge as TMockOptimismBridge } from '../../typechain-types/contracts/MockOptimismBridge';
import assertRevert from '../helpers/assert-revert';

const toBytes32 = (str: string) => stringToHex(str, { size: 32 });
const parseEther = ethers.utils.parseEther;

describe('CannonRegistry', function () {
  let l1ChainId: number;
  let CannonRegistry: TCannonRegistry;
  let MockOPSendBridge: TMockOptimismBridge;
  let MockOPRecvBridge: TMockOptimismBridge;
  let owner: Signer, user2: Signer, user3: Signer;
  let ownerAddress: string;
  let fee: BigNumber;

  before('identify signers', async function () {
    [owner, user2, user3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
  });

  before('deploy contract', async function () {
    l1ChainId = (await ethers.provider.getNetwork()).chainId;
    const MockOptimismBridge = await ethers.getContractFactory('MockOptimismBridge');
    const MockOPBridgeImpl = await MockOptimismBridge.deploy();
    await MockOPBridgeImpl.deployed();
    const MockOPBridgeImplCode = await ethers.provider.send('eth_getCode', [MockOPBridgeImpl.address]);

    await ethers.provider.send('hardhat_setCode', ['0x4200000000000000000000000000000000000007', MockOPBridgeImplCode]);
    await ethers.provider.send('hardhat_setCode', ['0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1', MockOPBridgeImplCode]);

    MockOPSendBridge = (await ethers.getContractAt(
      'MockOptimismBridge',
      '0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1'
    )) as TMockOptimismBridge;
    MockOPRecvBridge = (await ethers.getContractAt(
      'MockOptimismBridge',
      '0x4200000000000000000000000000000000000007'
    )) as TMockOptimismBridge;

    const CannonRegistryFactory = await ethers.getContractFactory('CannonRegistry');
    const Implementation = await CannonRegistryFactory.deploy(MockOPSendBridge.address, MockOPRecvBridge.address, l1ChainId);
    await Implementation.deployed();

    const ProxyFactory = await ethers.getContractFactory('Proxy');
    const Proxy = await ProxyFactory.deploy(Implementation.address, ownerAddress);
    await Proxy.deployed();

    CannonRegistry = (await ethers.getContractAt('CannonRegistry', Proxy.address)) as TCannonRegistry;

    fee = await CannonRegistry.publishFee();
  });

  before('register', async () => {
    await CannonRegistry.setPackageOwnership(toBytes32('some-module'), await owner.getAddress());
  });

  describe('Upgradedability', function () {
    let newImplementation: TCannonRegistry;

    before('deploy new implementation', async function () {
      const CannonRegistry = await ethers.getContractFactory('CannonRegistry');
      newImplementation = (await CannonRegistry.deploy(
        MockOPSendBridge.address,
        MockOPRecvBridge.address,
        l1ChainId
      )) as TCannonRegistry;
      await newImplementation.deployed();
    });

    it('upgrades to a new implementation', async function () {
      const { address } = newImplementation;
      await CannonRegistry.upgradeTo(address).then((tx) => tx.wait());

      equal(await CannonRegistry.getImplementation(), newImplementation.address);
    });
  });

  describe('validatePackageName()', function () {
    it('only allows lowercase letters, numbers, and dashes', async function () {
      equal(await CannonRegistry.validatePackageName(toBytes32('some--mo-du9le')), true);
      equal(await CannonRegistry.validatePackageName(toBytes32('some_-mo-du9le')), false);

      equal(await CannonRegistry.validatePackageName(toBytes32('some--mo-du9lE')), false);
      equal(await CannonRegistry.validatePackageName(toBytes32('some$module')), false);
    });

    it('does not allow dash at beginning or end', async function () {
      equal(await CannonRegistry.validatePackageName(toBytes32('some--module-')), false);
      equal(await CannonRegistry.validatePackageName(toBytes32('-some--module')), false);
    });

    it('enforces minimum length', async function () {
      const testName = 'abcdefghijk';
      const minLength = Number(await CannonRegistry.MIN_PACKAGE_NAME_LENGTH());

      equal(await CannonRegistry.validatePackageName(toBytes32(testName.slice(0, minLength))), true);
      equal(await CannonRegistry.validatePackageName(toBytes32(testName.slice(0, minLength - 1))), false);
    });

    it('it validates package names of 32 characters directly', async function () {
      equal(
        await CannonRegistry.validatePackageName('0x692D646F6E742D636F6E7461696E2D612D6E756C6C2D7465726D696E61746F72'),
        true
      );

      equal(await CannonRegistry.validatePackageName(toBytes32('i-dont-contain-a-null-terminator')), true);
    });
  });

  describe('setPackageOwnership()', () => {
    let snapshotId: number;

    before('snapshot', async () => {
      snapshotId = await ethers.provider.send('evm_snapshot', []);
    });

    before('nominate', async () => {
      await CannonRegistry.nominatePackageOwner(toBytes32('some-module'), await user2.getAddress());
    });

    it('should not allow invalid name', async function () {
      await assertRevert(async () => {
        await CannonRegistry.setPackageOwnership(toBytes32('some-module-'), await user2.getAddress());
      }, 'InvalidName("0x736f6d652d6d6f64756c652d0000000000000000000000000000000000000000")');
    });

    it('should fail when not paying any fee on new module', async function () {
      await CannonRegistry.setFees(0, 100);
      await assertRevert(async () => {
        await CannonRegistry.setPackageOwnership(toBytes32('new-module'), await user2.getAddress());
      }, 'FeeRequired(100)');
      await CannonRegistry.setFees(0, 0);
    });

    it('should allow new package to be registered with fee', async function () {
      await CannonRegistry.setFees(0, 100);
      const tx = await CannonRegistry.connect(user2).setPackageOwnership(toBytes32('new-module'), await user2.getAddress(), {
        value: 100,
      });
      const { events } = await tx.wait();
      equal(events!.length, 2);
      equal(events![0].event, 'PackageRegistered');
      equal(events![1].event, 'PackageOwnerChanged');
      await CannonRegistry.setFees(0, 0);
    });

    it('only nominated owner can accept ownership', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user3).setPackageOwnership(toBytes32('some-module'), await user3.getAddress());
      }, 'Unauthorized()');
    });

    it('accepts ownership', async function () {
      // should not require any fee, so we set fee here without sending money to verify that
      await CannonRegistry.setFees(0, 100);
      const tx = await CannonRegistry.connect(user2).setPackageOwnership(toBytes32('some-module'), await user2.getAddress());
      const { events } = await tx.wait();
      equal(events!.length, 1);
      equal(events![0].event, 'PackageOwnerChanged');
      await CannonRegistry.setFees(0, 0);
    });

    it('returns new package owner', async function () {
      const result = await CannonRegistry.getPackageOwner(toBytes32('some-module'));
      deepEqual(result, await user2.getAddress());
    });

    it('sends package ownership change function', async function () {
      equal(
        await MockOPSendBridge.lastCrossChainMessage(),
        '0xbc1fe85d736f6d652d6d6f64756c6500000000000000000000000000000000000000000000000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8'
      );
    });

    describe('l2', () => {
      it('only works when the cross domain sender is correct', async () => {
        await assertRevert(async () => {
          await MockOPRecvBridge.doCall(
            CannonRegistry.address,
            CannonRegistry.interface.encodeFunctionData('setPackageOwnership' as any, [
              toBytes32('some-module'),
              await user2.getAddress(),
            ])
          );
        }, 'WrongChain(1)');
      });

      it('works', async () => {
        await MockOPRecvBridge.setXDomainMessageSender(CannonRegistry.address);
        await MockOPRecvBridge.doCall(
          CannonRegistry.address,
          CannonRegistry.interface.encodeFunctionData('setPackageOwnership' as any, [
            toBytes32('some-module'),
            await user2.getAddress(),
          ])
        );
        await MockOPRecvBridge.setXDomainMessageSender(await user2.getAddress());
      });
    });

    after('snapshot restore', async () => {
      await ethers.provider.send('evm_revert', [snapshotId]);
    });
  });

  describe('publish()', function () {
    it('should fail when not paying any fee', async function () {
      await CannonRegistry.setFees(100, 0);
      try {
        await assertRevert(async () => {
          await CannonRegistry.publish(
            toBytes32('some-module-'),
            toBytes32('1337-main'),
            [toBytes32('0.0.1')],
            '',
            'ipfs://some-module-meta@0.0.1',
            { value: 0 }
          );
        }, 'FeeRequired(100)');
      } finally {
        await CannonRegistry.setFees(0, 0);
      }
    });

    it('should fail when paying insufficient amount of fee', async function () {
      await CannonRegistry.setFees(100, 0);

      try {
        await assertRevert(async () => {
          await CannonRegistry.publish(
            toBytes32('some-module-'),
            toBytes32('1337-main'),
            [toBytes32('0.0.1')],
            '',
            'ipfs://some-module-meta@0.0.1',
            { value: 80 }
          );
        }, 'FeeRequired(100)');
      } finally {
        await CannonRegistry.setFees(0, 0);
      }
    });

    it('should not allow to publish empty url', async function () {
      await assertRevert(async () => {
        await CannonRegistry.publish(
          toBytes32('some-module-'),
          toBytes32('1337-main'),
          [toBytes32('0.0.1')],
          '',
          'ipfs://some-module-meta@0.0.1',
          { value: fee }
        );
      }, 'InvalidUrl("")');
    });

    it('should validate missing tags', async function () {
      await assertRevert(async () => {
        await CannonRegistry.publish(
          toBytes32('some-module'),
          toBytes32('1337-main'),
          [],
          'ipfs://some-module-hash@0.0.1',
          'ipfs://some-module-meta@0.0.1',
          { value: fee }
        );
      }, 'InvalidTags()');
    });

    it('should not allow more than 5 tags', async function () {
      await assertRevert(async () => {
        await CannonRegistry.publish(
          toBytes32('some-module'),
          toBytes32('1337-main'),
          ['one', 'two', 'three', 'four', 'five', 'six'].map(toBytes32),
          'ipfs://some-module-hash@0.0.1',
          'ipfs://some-module-hash@0.0.1',
          { value: fee }
        );
      }, 'InvalidTags()');
    });

    it('should be able to publish new version', async function () {
      const tx = await CannonRegistry.connect(owner).publish(
        toBytes32('some-module'),
        toBytes32('1337-main'),
        [toBytes32('0.0.2')],
        'ipfs://some-module-hash@0.0.2',
        'ipfs://some-module-meta@0.0.2',
        { value: fee }
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'PackagePublishWithFee');

      const resultUrl = await CannonRegistry.getPackageUrl(
        toBytes32('some-module'),
        toBytes32('0.0.2'),
        toBytes32('1337-main')
      );
      const metaUrl = await CannonRegistry.getPackageMeta(
        toBytes32('some-module'),
        toBytes32('0.0.2'),
        toBytes32('1337-main')
      );

      equal(resultUrl, 'ipfs://some-module-hash@0.0.2');
      equal(metaUrl, 'ipfs://some-module-meta@0.0.2');
    });

    it('should be able to update an older version', async function () {
      const tx = await CannonRegistry.connect(owner).publish(
        toBytes32('some-module'),
        toBytes32('1337-main'),
        [toBytes32('0.0.1')],
        'ipfs://some-module-hash@0.0.1',
        'ipfs://some-module-meta@0.0.1',
        { value: fee }
      );

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'PackagePublishWithFee');
    });

    it('pushes tags', async function () {
      const tags = ['0.0.3', 'latest', 'stable'];

      const tx = await CannonRegistry.connect(owner).publish(
        toBytes32('some-module'),
        toBytes32('1337-main'),
        tags.map(toBytes32),
        'ipfs://updated-module-hash@0.0.3',
        'ipfs://updated-module-meta@0.0.3',
        { value: fee }
      );

      const expectedEvents = [
        [
          toBytes32('some-module'),
          toBytes32('0.0.3'),
          toBytes32('1337-main'),
          'ipfs://updated-module-hash@0.0.3',
          'ipfs://updated-module-meta@0.0.3',
          ownerAddress,
          BigNumber.from(0),
        ],
        ...tags
          .slice(1)
          .map((tagName) => [toBytes32('some-module'), toBytes32('1337-main'), toBytes32(tagName), toBytes32('0.0.3')]),
      ];

      const { events } = await tx.wait();
      ok(Array.isArray(events));
      const actualEvents = events.map((evt) => [...evt.args!]);
      equal(actualEvents[0][0], expectedEvents[0][0]);
      equal(actualEvents[0][1], expectedEvents[0][1]);
      equal(actualEvents[1][1], expectedEvents[1][1]);
    });

    it('should not allow to modify package from another owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).publish(
          toBytes32('some-module'),
          toBytes32('1337-main'),
          ['0.0.4', 'latest', 'stable'].map(toBytes32),
          'ipfs://some-module-hash@0.0.4',
          'ipfs://some-module-meta@0.0.4',
          { value: fee }
        );
      }, 'Unauthorized()');
    });
  });

  describe('unpublish()', function () {
    it('should be able to unpublish', async function () {
      const tx = await CannonRegistry.connect(owner).unpublish(toBytes32('some-module'), toBytes32('1337-main'), [
        toBytes32('0.0.2'),
      ]);

      const { events } = await tx.wait();

      equal(events!.length, 1);
      equal(events![0].event, 'PackageUnpublish');

      const resultUrl = await CannonRegistry.getPackageUrl(
        toBytes32('some-module'),
        toBytes32('0.0.2'),
        toBytes32('1337-main')
      );
      const metaUrl = await CannonRegistry.getPackageMeta(
        toBytes32('some-module'),
        toBytes32('0.0.2'),
        toBytes32('1337-main')
      );

      equal(resultUrl, '');
      equal(metaUrl, '');
    });

    it('should not allow to modify package from another owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).unpublish(
          toBytes32('some-module'),
          toBytes32('1337-main'),
          ['0.0.4', 'latest', 'stable'].map(toBytes32)
        );
      }, 'Unauthorized()');
    });
  });

  describe('setAdditionalPublishers()', function () {
    it('only works for owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).setAdditionalPublishers(toBytes32('some-module'), [], []);
      }, 'Unauthorized()');
    });

    describe('successful invoke', function () {
      let tx: ContractTransaction;

      before('invoke', async function () {
        tx = await CannonRegistry.connect(owner).setAdditionalPublishers(
          toBytes32('some-module'),
          [await user2.getAddress()],
          [await user3.getAddress()]
        );
      });

      it('should emit PackagePublisherChanged event', async function () {
        const { events } = await tx.wait();
        equal(events!.length, 1);
        const [{ event, args }] = events!;
        equal(event, 'PackagePublishersChanged');
        equal(args!.name, toBytes32('some-module'));
        deepEqual(args!.publisher, [await user2.getAddress()]);
      });

      it('returns the current list of deployers', async function () {
        deepEqual(await CannonRegistry.getAdditionalPublishers(toBytes32('some-module')), [await user2.getAddress()]);
      });

      it('grants permission to publish to the user', async function () {
        await CannonRegistry.connect(user2).publish(
          toBytes32('some-module'),
          toBytes32('1337-main'),
          ['0.0.10', 'latest', 'stable'].map(toBytes32),
          'ipfs://some-module-hash@0.0.10',
          'ipfs://some-module-meta@0.0.10',
          { value: fee }
        );
      });

      it('sends cross chain message', async function () {
        const functionName = 'setAdditionalPublishers';
        const expectedArgs = [toBytes32('some-module'), [], [await user3.getAddress()]];
        const functionSelector = CannonRegistry.interface.getSighash(functionName);
        const encodedParameters = CannonRegistry.interface.encodeFunctionData(functionName, expectedArgs).slice(10); // Remove the first 10 characters (0x + selector)

        const data = functionSelector + encodedParameters;

        equal(await MockOPSendBridge.lastCrossChainMessage(), data);
      });

      describe('remove', function () {
        before('invoke', async function () {
          await CannonRegistry.connect(owner).setAdditionalPublishers(toBytes32('some-module'), [], []);
        });

        it('returns the current list of deployers', async function () {
          deepEqual(await CannonRegistry.getAdditionalPublishers(toBytes32('some-module')), []);
        });
      });
    });

    it('nominates', async function () {
      const tx = await CannonRegistry.connect(owner).nominatePackageOwner(
        toBytes32('some-module'),
        await user2.getAddress()
      );
      const { events } = await tx.wait();
      equal(events!.length, 1);
      equal(events![0].event, 'PackageOwnerNominated');

      equal(await CannonRegistry.getPackageNominatedOwner(toBytes32('some-module')), await user2.getAddress());
    });

    describe('l2', () => {
      it('only works when the cross domain sender is correct', async () => {
        await assertRevert(async () => {
          await MockOPRecvBridge.doCall(
            CannonRegistry.address,
            CannonRegistry.interface.encodeFunctionData('setAdditionalPublishers' as any, [
              toBytes32('some-module'),
              [await user3.getAddress()],
              [],
            ])
          );
        }, 'WrongChain(1)');
      });

      it('works', async () => {
        await MockOPRecvBridge.setXDomainMessageSender(CannonRegistry.address);
        await MockOPRecvBridge.doCall(
          CannonRegistry.address,
          CannonRegistry.interface.encodeFunctionData('setAdditionalPublishers' as any, [
            toBytes32('some-module'),
            [await user3.getAddress()],
            [],
          ])
        );
        await MockOPRecvBridge.setXDomainMessageSender(await user2.getAddress());
      });
    });
  });

  describe('nominatePackageOwner()', function () {
    it('should not allow nomination from non-owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).nominatePackageOwner(toBytes32('some-module'), await user2.getAddress());
      }, 'Unauthorized()');
    });

    it('nominates', async function () {
      await CannonRegistry.connect(owner).nominatePackageOwner(toBytes32('some-module'), await user2.getAddress());

      equal(await CannonRegistry.getPackageNominatedOwner(toBytes32('some-module')), await user2.getAddress());
    });
  });

  describe('package verification', function () {
    it('does not allow to verify unexistant packages', async function () {
      await assertRevert(async () => {
        await CannonRegistry.verifyPackage(toBytes32('invalid-package'));
      }, 'PackageNotFound()');
    });

    it('does not allow to unverify unexistant packages', async function () {
      await assertRevert(async () => {
        await CannonRegistry.unverifyPackage(toBytes32('invalid-package'));
      }, 'PackageNotFound()');
    });

    it('emits a verification event', async function () {
      const tx = await CannonRegistry.connect(user2).verifyPackage(toBytes32('some-module'));

      const { events } = await tx.wait();

      equal(events!.length, 1);

      const [{ event, args }] = events!;
      equal(event, 'PackageVerify');
      equal(args!.name, toBytes32('some-module'));
      equal(args!.verifier, await user2.getAddress());
    });

    it('emits an unverification event', async function () {
      const tx = await CannonRegistry.connect(user2).unverifyPackage(toBytes32('some-module'));

      const { events } = await tx.wait();

      equal(events!.length, 1);

      const [{ event, args }] = events!;
      equal(event, 'PackageUnverify');
      equal(args!.name, toBytes32('some-module'));
      equal(args!.verifier, await user2.getAddress());
    });
  });

  describe('withdraw()', function () {
    async function setBalance(balance: string) {
      await ethers.provider.send('hardhat_setBalance', [
        CannonRegistry.address,
        parseEther(balance.toString()).toHexString(),
      ]);
    }

    async function getBalance() {
      return ethers.provider.getBalance(CannonRegistry.address);
    }

    after(() => setBalance('0'));

    it('reverts when trying to withdraw not being the owner', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(user2).withdraw();
      }, `Unauthorized("${await user2.getAddress()}")`);
    });

    it('reverts if there is no ETH in the contract to withdraw', async function () {
      await assertRevert(async () => {
        await CannonRegistry.connect(owner).withdraw();
      }, 'WithdrawFail(0)');
    });

    it('is able to withdraw the balance', async function () {
      await setBalance('2');
      const ownerBalance = await owner.getBalance();
      const tx = await CannonRegistry.connect(owner).withdraw();
      await tx.wait();
      equal((await getBalance()).toString(), parseEther('0').toString());
      ok((await owner.getBalance()).gte(ownerBalance));
    });
  });
});
