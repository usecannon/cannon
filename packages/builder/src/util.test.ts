import {
  getAllContractPaths,
  getContractFromPath,
  getExecutionSigner,
  getMergedAbiFromContractPaths,
  printChainDefinitionProblems,
  printInternalOutputs,
} from './util';

import 'jest';
import * as viem from 'viem';
import { AbiFunction, AbiItem } from 'viem';
import { ChainBuilderContext } from '.';
import { makeFakeProvider } from '../test/fixtures';

describe('util.ts', () => {
  const fakeTransferFragment: AbiFunction = {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  };

  const fakeEventFragment: AbiItem = {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  };

  const fakeReadFragment: AbiFunction = {
    inputs: [],
    name: 'isInitialized',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  };

  const fakeCtx: ChainBuilderContext = {
    contracts: {
      FakeContract: {
        address: '0x0000000000000000000000000000000000000000',
        contractName: '',
        sourceName: '',
        deployTxnHash: '',
        deployedOn: '',
        abi: [fakeEventFragment, fakeReadFragment],
        gasCost: '0',
        gasUsed: 0,
      },

      AnotherFake: {
        address: '0x0000000000000000000000000000000000000001',
        contractName: '',
        sourceName: '',
        deployTxnHash: '',
        deployedOn: '',
        abi: [fakeTransferFragment],
        gasCost: '0',
        gasUsed: 0,
      },
    },
    imports: {
      FakeImport: {
        url: '',
        imports: {
          SuperFake: {
            url: '',
            contracts: {
              TheFakest: {
                address: '0x0000000000000000000000000000000000000002',
                contractName: '',
                sourceName: '',
                deployTxnHash: '',
                deployedOn: '',
                abi: [fakeTransferFragment, fakeReadFragment],
                gasCost: '0',
                gasUsed: 0,
              },
            },
          },
        },
        contracts: {
          AnotherFake: {
            address: '0x0000000000000000000000000000000000000003',
            contractName: '',
            sourceName: '',
            deployTxnHash: '',
            deployedOn: '',
            abi: [fakeTransferFragment, fakeReadFragment],
            gasCost: '0',
            gasUsed: 0,
          },
        },
      },
    },
    overrideSettings: {},
    settings: {},
    txns: {},
    chainId: 0,
    timestamp: '0',
    package: {},
  };

  describe('getContractFromPath()', () => {
    it('works with no depth', async () => {
      expect(getContractFromPath(fakeCtx, 'FakeContract')?.address).toEqual('0x0000000000000000000000000000000000000000');
    });

    it('works with one layer of depth', async () => {
      expect(getContractFromPath(fakeCtx, 'FakeImport.AnotherFake')?.address).toEqual(
        '0x0000000000000000000000000000000000000003'
      );
    });

    it('works with two layers of depth', async () => {
      expect(getContractFromPath(fakeCtx, 'FakeImport.SuperFake.TheFakest')?.address).toEqual(
        '0x0000000000000000000000000000000000000002'
      );
    });
  });

  describe('getMergedAbiFromContractPaths()', () => {
    it('works when no arguments specified', async () => {
      const def = getMergedAbiFromContractPaths(fakeCtx, []);
      expect(def).toEqual([]);
    });

    it('returns the same contract when only one contract is specified', async () => {
      const def = getMergedAbiFromContractPaths(fakeCtx, ['FakeImport.AnotherFake']);
      expect(def).toEqual([fakeTransferFragment, fakeReadFragment]);
    });

    it('returns the same contract when two contracts with same abi are specified', async () => {
      const def = getMergedAbiFromContractPaths(fakeCtx, ['FakeContract', 'FakeContract']);
      expect(def).toEqual([fakeEventFragment, fakeReadFragment]);
    });

    it('returns the merge of all contracts', async () => {
      const def = getMergedAbiFromContractPaths(fakeCtx, ['FakeContract', 'AnotherFake', 'FakeImport.AnotherFake']);
      expect(def).toEqual([fakeEventFragment, fakeReadFragment, fakeTransferFragment]);
    });
  });

  describe('getExecutionSigner()', () => {
    const provider = makeFakeProvider();

    it('returns a signer based on the hash of transaction data', async () => {
      const signer = await getExecutionSigner(provider, { data: '0xwoot' });

      // TODO: expect signer address to equal something
      expect(viem.isAddress(signer.address)).toBeTruthy();

      // should return signer when called the same way again
      expect((await getExecutionSigner(provider, { data: '0xwoot' })).address).toStrictEqual(signer.address);
    });

    it('gives a different signer for different salt', async () => {
      const signer1 = await getExecutionSigner(provider, { data: '0xwoot' });
      const signer2 = await getExecutionSigner(
        provider,
        { data: '0xwoot' },
        'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss'
      );

      expect(await signer1.address).not.toStrictEqual(await signer2.address);
    });
  });

  describe('getAllContractPaths', () => {
    it('returns full list of contracts from chain artifacts with nesting', async () => {
      const allContractPaths = getAllContractPaths({
        contracts: {
          Foobar: {} as any,
          Baz: {} as any,
        },
        imports: {
          fake: {
            url: '',
            contracts: {
              SuperDuper: {} as any,
            },
            imports: {
              fake2: {
                url: '',
                contracts: {
                  SuperFake: {} as any,
                },
              },
            },
          },
        },
      });

      expect(allContractPaths).toHaveLength(4);

      expect(allContractPaths).toContainEqual('Foobar');
      expect(allContractPaths).toContainEqual('Baz');
      expect(allContractPaths).toContainEqual('fake.SuperDuper');
      expect(allContractPaths).toContainEqual('fake.fake2.SuperFake');
    });
  });

  describe('printInternalOutputs()', () => {
    it('prints contracts', async () => {
      const contractsInfo = printInternalOutputs({
        contracts: {
          Yoop: {
            address: '0x0987098709870987098709870987098709870987',
            deployTxnHash: '0x1234',
            sourceName: 'Wohoo.sol',
            contractName: 'Wohoo',
            abi: [],
            deployedOn: 'contract.Yoop',
            gasCost: '0',
            gasUsed: 0,
          },
          Dupe: {
            address: '0x1234123412341234123412341234123412341234',
            deployTxnHash: '0x4321',
            sourceName: 'Dup.sol',
            contractName: 'Dupe',
            abi: [],
            deployedOn: 'contract.Dupe',
            gasCost: '0',
            gasUsed: 0,
          },
        },
      });

      expect(contractsInfo).toContainEqual('deployed\tYoop at 0x0987098709870987098709870987098709870987 (0x1234)');
      expect(contractsInfo).toContainEqual('deployed\tDupe at 0x1234123412341234123412341234123412341234 (0x4321)');
    });

    it('prints transactions', async () => {
      const txnsInfo = printInternalOutputs({
        txns: {
          smartFunc: {
            hash: '0x56785678',
            events: {
              TestEvent: [
                {
                  args: ['one', '2', 'three'],
                },
              ],
            },
            deployedOn: 'invoke.smartFunc',
            gasCost: '0',
            gasUsed: 0,
            signer: '',
          },
        },
      });

      expect(txnsInfo).toStrictEqual(['execed\tsmartFunc (0x56785678)', '\t-> TestEvent(one,2,three)', '']);
    });
  });

  describe('printChainDefinitionProblems()', () => {
    it('prints missing dependencies and list of all deps', async () => {
      const problemsInfo = printChainDefinitionProblems({
        cycles: [],
        missing: [
          { action: 'contract.One', dependency: 'contract.Foo' },
          { action: 'contract.One', dependency: 'contract.Bar' },
        ],
        invalidSchema: {},
      });

      expect(problemsInfo).toStrictEqual([
        '1: In action "contract.One", the dependency "contract.Foo" is not defined elsewhere.',
        '2: In action "contract.One", the dependency "contract.Bar" is not defined elsewhere.',
      ]);
    });

    it('prints cycles', async () => {
      const problemsInfo = printChainDefinitionProblems({
        cycles: [
          ['contract.One', 'contract.Two', 'contract.Three'],
          ['contract.Three', 'contract.Five'],
        ],
        missing: [],
        invalidSchema: {},
      });

      expect(problemsInfo).toStrictEqual([
        '1: The actions contract.One, contract.Two, contract.Three form a dependency cycle and therefore cannot be deployed.',
        '2: The actions contract.Three, contract.Five form a dependency cycle and therefore cannot be deployed.',
      ]);
    });
  });
});
