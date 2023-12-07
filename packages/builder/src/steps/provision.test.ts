import '../actions';
import { BUILD_VERSION } from '../constants';
import { InMemoryRegistry } from '../registry';
import action from './provision';
import { fakeCtx, fakeRuntime } from './testUtils';

import { contractSchema } from '../schemas.zod';
import contractAction from './contract';

jest.mock('../loader');
jest.mock('./contract');

// Mocking the contract action causes a weird bug with the zod schema
// this mock just replaces the mock generated value with our imported value.
jest.mocked((contractAction.validate = contractSchema));

describe('steps/provision.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.registry as any) = registry;
    (fakeRuntime.chainId as any) = 1234;

    jest.mocked(fakeRuntime.derive).mockReturnThis();

    jest.mocked(contractAction.getOutputs).mockReturnValue([]);
    jest.mocked(contractAction.getInputs).mockReturnValue([]);

    jest.mocked(contractAction.exec).mockResolvedValue({
      contracts: {
        Woot: {
          address: '0xfoobar',
          abi: [],
          deployTxnHash: '0x',
          contractName: 'Woot',
          sourceName: 'Woot.sol',
          deployedOn: 'contract.Woot',
          gasCost: '0',
          gasUsed: 0,
        },
      },
    });
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(
        fakeCtx,
        {
          source: '<%= settings.a %><%= settings.b %><%= settings.c %>',
        },
        { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' }
      );

      expect(result).toStrictEqual({
        source: 'abc:latest@main',
        sourcePreset: "",
        targetPreset: 'with-who',
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      await registry.publish(['hello:1.0.0@main'], 13370, 'https://something.com', '');

      const result = await action.getState(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' }
      );

      expect(result).toStrictEqual({
        url: 'https://something.com',
        options: undefined,
        targetPreset: 'with-who',
      });
    });

    it('resolves correct properties with maximal config', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something-else.com', '');

      const result = await action.getState(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0', sourcePreset: 'main', chainId: 1234, targetPreset: 'voop', options: { bar: 'baz' } },
        { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' }
      );

      expect(result).toStrictEqual({
        url: 'https://something-else.com',
        options: { bar: 'baz' },
        targetPreset: 'voop',
      });
    });
  });

  describe('exec()', () => {
    it('throws if deployment not found', async () => {
      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'undefined-deployment:1.0.0' },
          { name: 'package', version: '1.0.0', currentLabel: 'provision.whatever' }
        )
      ).rejects.toThrowError('deployment not found');
    });

    it('returns partial deployment if runtime becomes cancelled', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');

      jest.mocked(fakeRuntime.readDeploy).mockResolvedValue({
        generator: 'cannon test',
        timestamp: 1234,
        state: {
          'contract.Woot': {
            version: BUILD_VERSION,
            hash: 'arst',
            artifacts: {
              contracts: {
                Woot: {
                  address: '0xfoobar',
                  abi: [],
                  deployTxnHash: '0x',
                  contractName: 'Woot',
                  sourceName: 'Woot.sol',
                  deployedOn: 'contract.Woot',
                  gasCost: '0',
                  gasUsed: 0,
                },
              },
            },
          },
        },
        options: {},
        def: {
          name: 'hello',
          version: '1.0.0',
          contract: {
            Woot: { artifact: 'Woot' },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
      });

      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmsomething');
      jest.mocked(fakeRuntime.isCancelled).mockReturnValue(true);
      console.log('is c ancel', fakeRuntime.isCancelled());

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0@main' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(result.imports!['something'].url).toEqual('ipfs://Qmsomething');

      expect(jest.mocked(fakeRuntime.putDeploy).mock.calls[0][0].status).toEqual('partial');

      jest.mocked(fakeRuntime.isCancelled).mockReturnValue(false);
    });

    it('works with complete deployment', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');

      jest.mocked(fakeRuntime.readDeploy).mockResolvedValue({
        generator: 'cannon test',
        timestamp: 1234,
        state: {
          'contract.Woot': {
            version: BUILD_VERSION,
            hash: 'arst',
            artifacts: {
              contracts: {
                Woot: {
                  address: '0xfoobar',
                  abi: [],
                  deployTxnHash: '0x',
                  contractName: 'Woot',
                  sourceName: 'Woot.sol',
                  deployedOn: 'contract.Woot',
                  gasCost: '0',
                  gasUsed: 0,
                },
              },
            },
          },
        },
        options: {},
        def: {
          name: 'hello',
          version: '1.0.0',
          contract: {
            Woot: { artifact: 'Woot' },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
      });

      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmsomething');

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(result).toStrictEqual({
        imports: {
          something: {
            url: 'ipfs://Qmsomething',
            preset: 'main',
            tags: ['latest'],
            contracts: {
              Woot: {
                address: '0xfoobar',
                abi: [],
                deployTxnHash: '0x',
                contractName: 'Woot',
                sourceName: 'Woot.sol',
                deployedOn: 'contract.Woot',
                gasCost: '0',
                gasUsed: 0,
              },
            },
          },
        },
      });
    });
  });
});
