import { getContractFromPath, getMergedAbiFromContractPaths, makeArachnidCreate2 } from './util';

import 'jest';
import { ChainBuilderContext } from '.';
import { JsonFragment } from '@ethersproject/abi';
import { ARACHNID_CREATE2_PROXY } from './constants';

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
        imports: {
          SuperFake: {
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

  describe('makeArachnidCreate2', () => {
    it('returns the correct address', async () => {
      const [, addr] = makeArachnidCreate2(
        '0x0000000000000000000000000000000000000000000000000000000000000000', 
        '0x00', 
        '0x0000000000000000000000000000000000000000'
      );

      expect(addr).toEqual('0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38');
    });

    it('returns the correct txn', async () => {
      const [txn] = makeArachnidCreate2(
        '0x0987654321000000000000000000000000000000000000000000000000000000', 
        '0x1234567890'
      );

      expect(txn.to).toEqual(ARACHNID_CREATE2_PROXY);
      expect(txn.data).toEqual('0x09876543210000000000000000000000000000000000000000000000000000001234567890')
    });

    it('works with arbitrary string salt', async () => {
      const [, addr] = makeArachnidCreate2(
        'hello world',  // arbitrary string salt
        '0x00', 
        '0x0000000000000000000000000000000000000000'
      );

      expect(addr).toEqual('0x69D36DFe281136ef662ED1A2E80a498A5461226D');
    })
  });
});
