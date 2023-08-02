import {
  getAllContractPaths,
  getContractFromPath,
  getExecutionSigner,
  getMergedAbiFromContractPaths,
  printChainDefinitionProblems,
  printInternalOutputs,
} from './util';

import 'jest';
import { ethers } from 'ethers';
import { ChainBuilderContext } from '.';
import { JsonFragment } from '@ethersproject/abi';

import { CannonWrapperGenericProvider } from './error/provider';

jest.mock('./error/provider');

describe('util.ts', () => {
  const fakeTransferFragment: JsonFragment = {
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

  const fakeEventFragment: JsonFragment = {
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

  const fakeReadFragment: JsonFragment = {
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
      },

      AnotherFake: {
        address: '0x0000000000000000000000000000000000000001',
        contractName: '',
        sourceName: '',
        deployTxnHash: '',
        deployedOn: '',
        abi: [fakeTransferFragment],
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
          },
        },
      },
    },
    settings: {},
    txns: {},
    chainId: 0,
    timestamp: '0',
    package: {},
    extras: {},
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
    const provider = new CannonWrapperGenericProvider({}, new ethers.providers.JsonRpcProvider());

    jest.mocked(provider.getSigner).mockImplementation((addr) => new ethers.VoidSigner(addr, provider));

    it('returns a signer based on the hash of transaction data', async () => {
      const signer = await getExecutionSigner(provider, { data: 'woot' });

      expect(await signer.getAddress()).toStrictEqual(jest.mocked(provider.getSigner).mock.calls[0][0]);

      // should return signer when called the same way again
      expect(await getExecutionSigner(provider, { data: 'woot' })).toStrictEqual(signer);
    });

    it('gives a different signer for different salt', async () => {
      const signer1 = await getExecutionSigner(provider, { data: 'woot' });
      const signer2 = await getExecutionSigner(
        provider,
        { data: 'woot' },
        'ssssssssssssssssssssssssssssssssssssssssssssssssssssssssss'
      );

      expect(await signer1.getAddress()).not.toStrictEqual(await signer2.getAddress());
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
          },
          Dupe: {
            address: '0x1234123412341234123412341234123412341234',
            deployTxnHash: '0x4321',
            sourceName: 'Dup.sol',
            contractName: 'Dupe',
            abi: [],
            deployedOn: 'contract.Dupe',
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
        extraneous: [],
        invalidSchema: {},
      });

      expect(problemsInfo).toStrictEqual([
        '1: In action "contract.One", the dependency "contract.Foo" is not defined elsewhere.',
        '2: In action "contract.One", the dependency "contract.Bar" is not defined elsewhere.',
      ]);
    });

    it('prints extraneous dependencies', async () => {
      const problemsInfo = printChainDefinitionProblems({
        cycles: [],
        missing: [],
        extraneous: [
          { node: 'contract.One', extraneous: 'contract.Two', inDep: 'contract.Three' },
          { node: 'contract.Two', extraneous: 'contract.Four', inDep: 'contract.Five' },
        ],
        invalidSchema: {},
      });

      expect(problemsInfo).toStrictEqual([
        '1: The action contract.One defines an unnecessary dependency contract.Two (a sub-dependency of contract.Three). Please remove this unnecessary dependency.',
        '2: The action contract.Two defines an unnecessary dependency contract.Four (a sub-dependency of contract.Five). Please remove this unnecessary dependency.',
      ]);
    });

    it('prints cycles', async () => {
      const problemsInfo = printChainDefinitionProblems({
        cycles: [
          ['contract.One', 'contract.Two', 'contract.Three'],
          ['contract.Three', 'contract.Five'],
        ],
        missing: [],
        extraneous: [],
        invalidSchema: {},
      });

      expect(problemsInfo).toStrictEqual([
        '1: The actions contract.One, contract.Two, contract.Three form a dependency cycle and therefore cannot be deployed.',
        '2: The actions contract.Three, contract.Five form a dependency cycle and therefore cannot be deployed.',
      ]);
    });
  });
});
