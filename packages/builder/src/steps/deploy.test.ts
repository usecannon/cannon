import * as viem from 'viem';
import { fixtureTransactionReceipt } from '../../test/fixtures';
import { ContractArtifact } from '../types';
import action from './deploy';
import { fakeCtx, fakeRuntime, makeFakeSigner } from './utils.test.helper';
import '../actions';

const DEFAULT_ARACHNID_ADDRESS = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

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
          components: [
            {
              type: 'string',
              name: 'testval',
            },
          ],
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
  ];
  const fakeRx = fixtureTransactionReceipt();

  beforeAll(async () => {
    jest.mocked(fakeRuntime.getArtifact).mockResolvedValue({
      bytecode: '0xabcd',
      abi: fakeAbi,
    } as unknown as ContractArtifact);

    jest.mocked((fakeRuntime.provider as any).sendTransaction).mockResolvedValue('0x1234');
    jest.mocked(fakeRuntime.provider.waitForTransactionReceipt).mockResolvedValue(fakeRx);
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

      expect(result).toContainEqual({
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

      expect(result).toContainEqual({
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
          .accesses.sort()
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
        jest.mocked(fakeRuntime.provider.getBytecode).mockResolvedValue('0xabcdef');

        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            create2: true,
            args: [viem.stringToHex('one', { size: 32 }), viem.stringToHex('two', { size: 32 }), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x3F9270CE7b8704E7BE0BfcA0EA8836f2B135a4ef',
              constructorArgs: [
                viem.stringToHex('one', { size: 32 }),
                viem.stringToHex('two', { size: 32 }),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: '',
              deployedOn: 'contract.Woot',
              gasCost: '0',
              gasUsed: 0,
              linkedLibraries: {},
              sourceName: undefined,
              highlight: undefined,
            },
          },
        });
      });

      it('works if contract needs to be deployed', async () => {
        jest.mocked(fakeRuntime.provider.getBytecode).mockImplementation(async ({ address }) => {
          if (address === DEFAULT_ARACHNID_ADDRESS) {
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
            args: [viem.stringToHex('one', { size: 32 }), viem.stringToHex('two', { size: 32 }), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: '0x3F9270CE7b8704E7BE0BfcA0EA8836f2B135a4ef',
              constructorArgs: [
                viem.stringToHex('one', { size: 32 }),
                viem.stringToHex('two', { size: 32 }),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: fakeRx.transactionHash,
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
              highlight: undefined,
              gasCost: '5678',
              gasUsed: 1234,
            },
          },
        });

        expect((await fakeRuntime.getDefaultSigner({}, '')).wallet.sendTransaction).toHaveBeenCalled();
      });
    });

    describe('when create2 = false', () => {
      it('deploys with specified nonce', async () => {
        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            highlight: true,
            args: [viem.stringToHex('one', { size: 32 }), viem.stringToHex('two', { size: 32 }), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: fakeRx.contractAddress,
              constructorArgs: [
                viem.stringToHex('one', { size: 32 }),
                viem.stringToHex('two', { size: 32 }),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: fakeRx.transactionHash,
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
              highlight: true,
              gasCost: '5678',
              gasUsed: 1234,
            },
          },
        });
      });

      it('deploys with specified signer fromCall', async () => {
        (fakeRuntime.getSigner as any) = async (addr: string) => {
          if (addr == '0x1234123412341234123412341234123412341234') {
            return makeFakeSigner('0x1234123412341234123412341234123412341234', fakeRuntime.provider as any);
          }

          return null;
        };

        const result = await action.exec(
          fakeRuntime,
          fakeCtx,
          {
            artifact: 'hello',
            from: '0x1234123412341234123412341234123412341234',
            args: [viem.stringToHex('one', { size: 32 }), viem.stringToHex('two', { size: 32 }), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: fakeRx.contractAddress,
              constructorArgs: [
                viem.stringToHex('one', { size: 32 }),
                viem.stringToHex('two', { size: 32 }),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: fakeRx.transactionHash,
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
              highlight: undefined,
              gasCost: '5678',
              gasUsed: 1234,
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
            args: [viem.stringToHex('one', { size: 32 }), viem.stringToHex('two', { size: 32 }), { three: 'four' }],
            salt: 'wohoo',
            value: '1234',
          },
          { name: 'hello', version: '1.0.0', currentLabel: 'contract.Woot' }
        );

        expect(result).toStrictEqual({
          contracts: {
            Woot: {
              abi: fakeAbi,
              address: fakeRx.contractAddress,
              constructorArgs: [
                viem.stringToHex('one', { size: 32 }),
                viem.stringToHex('two', { size: 32 }),
                { three: 'four' },
              ],
              contractName: undefined,
              deployTxnHash: fakeRx.transactionHash,
              deployedOn: 'contract.Woot',
              linkedLibraries: {},
              sourceName: undefined,
              highlight: undefined,
              gasCost: '5678',
              gasUsed: 1234,
            },
          },
        });
      });
    });
  });
});
