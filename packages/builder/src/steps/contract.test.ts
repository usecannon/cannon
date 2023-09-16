import { ethers } from 'ethers';
import '../actions';
import { ContractArtifact } from '../types';
import action from './contract';

import { fakeRuntime, fakeCtx, makeFakeSigner } from './testUtils';
import { makeArachnidCreate2Txn } from '../create2';
import { ARACHNID_CREATE2_PROXY } from '../constants';

describe('steps/contract.ts', () => {
  const fakeAbi = [
    {
      inputs: [
        {
          internalType: 'bytes32',
          name: 'data',
          type: 'bytes32',
        },
        {
          internalType: 'bytes32',
          name: 'data',
          type: 'bytes32',
        },
        {
          name: 'data',
          type: 'tuple',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
  ];

  beforeAll(async () => {
    jest.mocked(fakeRuntime.getArtifact).mockResolvedValue({
      bytecode: '0xabcd',
      abi: fakeAbi,
    } as unknown as ContractArtifact);
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(fakeCtx, {
        artifact: '<%= settings.a %><%= settings.b %>',

        from: '<%= settings.c %>',
        nonce: '<%= settings.d %>',
        abi: '<%= settings.c %><%= settings.d %>',
        args: ['<%= settings.d %><%= settings.a %>', { abc: '<%= settings.a %><%= settings.b %><%= settings.c %>' }],
        libraries: { dcba: '<%= settings.a %>' },

        // used to force new copy of a contract (not actually used)
        salt: '<%= settings.a %><%= settings.c %>',

        value: '<%= settings.b %><%= settings.d %>',
        overrides: {
          gasLimit: '<%= settings.gasLimit %>',
        },
      });

      expect(result).toStrictEqual({
        artifact: 'ab',

        from: 'c',
        nonce: 'd',
        abi: 'cd',
        args: ['da', { abc: 'abc' }],
        libraries: { dcba: 'a' },

        // used to force new copy of a contract (not actually used)
        salt: 'ac',

        value: 'bd',
        overrides: {
          gasLimit: '20000',
        },
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      const result = await action.getState(fakeRuntime, fakeCtx, { artifact: 'hello' });

      expect(result).toStrictEqual({
        bytecode: '0xabcd',
        args: [],
        salt: undefined,
        value: [], // for cannon spec, undefined or 0 value contract create resolves to empty array (dont ask)
      });
    });

    it('resolves correct even if there are libraries in the contract', async () => {
      // todo
    });

    it('resolves correct properties with maximal config', async () => {
      const result = await action.getState(fakeRuntime, fakeCtx, {
        artifact: 'hello',
        args: ['one', 'two', { three: 'four' }],
        salt: 'wohoo',
        value: '1234',
      });

      expect(result).toStrictEqual({
        bytecode: '0xabcd',
        args: ['one', 'two', '{"three":"four"}'],
        salt: 'wohoo',
        value: '1234',
      });
    });
  });

  describe('getInputs()', () => {
    it('detects all usages', async () => {
      expect(
        action
          .getInputs({
            artifact: '<%= contracts.a %>',
            abi: '<%= contracts.b %>',
            from: '<%= contracts.c %>',
            nonce: '<%= contracts.d %>',
            value: '<%= contracts.e %>',
            abiOf: ['<%= contracts.f %>', '<%= contracts.g %>'],
            args: ['<%= contracts.h %>', '<%= contracts.i %>'],
            salt: '<%= contracts.j %>',
          })
          .sort()
      ).toEqual([
        'contracts.a',
        'contracts.b',
        'contracts.c',
        'contracts.d',
        'contracts.e',
        'contracts.f',
        'contracts.g',
        'contracts.h',
        'contracts.i',
        'contracts.j',
      ]);
    });
  });

  describe('getOutputs()', () => {
    it('returns the contract that is outputted', () => {
      expect(action.getOutputs({ artifact: 'hello' }, { name: '', version: '', currentLabel: 'contract.Hello' })).toEqual([
        'contracts.Hello',
      ]);
    });
  });

  describe('exec()', () => {
    describe('when create2 = true', () => {
      it('works if contract already deployed', async () => {
        jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0xabcdef');

        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            create2: true,
            args: [ethers.utils.formatBytes32String('one'), ethers.utils.formatBytes32String('two'), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x2Fd75828bbbb23d9f76683060C1129CC3E50d65c',
              constructorArgs: [
                ethers.utils.formatBytes32String('one'),
                ethers.utils.formatBytes32String('two'),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '',
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
            },
          },
        });
      });

      it('works if contract needs to be deployed', async () => {
        jest.mocked(fakeRuntime.provider.getCode).mockImplementation(async (addr) => {
          if (addr === ARACHNID_CREATE2_PROXY) {
            return '0xabcd';
          }

          return '0x';
        });

        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            create2: true,
            args: [ethers.utils.formatBytes32String('one'), ethers.utils.formatBytes32String('two'), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x2Fd75828bbbb23d9f76683060C1129CC3E50d65c',
              constructorArgs: [
                ethers.utils.formatBytes32String('one'),
                ethers.utils.formatBytes32String('two'),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '0x1234',
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
            },
          },
        });

        expect((await fakeRuntime.getDefaultSigner({}, '')).sendTransaction).toBeCalledWith(
          makeArachnidCreate2Txn(
            'wohoo',
            new ethers.ContractFactory(fakeAbi, '0xabcd').getDeployTransaction(
              ethers.utils.formatBytes32String('one'),
              ethers.utils.formatBytes32String('two'),
              { three: 'four' }
            ).data!
          )[0]
        );
      });
    });

    describe('when create2 = false', () => {
      it('deploys with specified nonce', async () => {
        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            args: [ethers.utils.formatBytes32String('one'), ethers.utils.formatBytes32String('two'), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x2345234523452345234523452345234523452345',
              constructorArgs: [
                ethers.utils.formatBytes32String('one'),
                ethers.utils.formatBytes32String('two'),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '0x1234',
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
            },
          },
        });
      });

      it('deploys with specified signer fromCall', async () => {
        (fakeRuntime.getSigner as any) = async (addr: string) => {
          if (addr == '0x1234123412341234123412341234123412341234') {
            return makeFakeSigner('0x1234123412341234123412341234123412341234');
          }

          return null;
        };

        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            from: '0x1234123412341234123412341234123412341234',
            args: [ethers.utils.formatBytes32String('one'), ethers.utils.formatBytes32String('two'), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x2345234523452345234523452345234523452345',
              constructorArgs: [
                ethers.utils.formatBytes32String('one'),
                ethers.utils.formatBytes32String('two'),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '0x1234',
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
            },
          },
        });
      });

      it('deploys with default signer', async () => {
        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            args: [ethers.utils.formatBytes32String('one'), ethers.utils.formatBytes32String('two'), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x2345234523452345234523452345234523452345',
              constructorArgs: [
                ethers.utils.formatBytes32String('one'),
                ethers.utils.formatBytes32String('two'),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '0x1234',
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
            },
          },
        });
      });
    });
  });
});
