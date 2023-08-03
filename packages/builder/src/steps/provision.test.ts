import '../actions';
import { BUILD_VERSION } from '../constants';
import { InMemoryRegistry } from '../registry';
import action from './provision';
import { fakeCtx, fakeRuntime } from './testUtils';

import { contractSchema } from '../schemas.zod'
import contractAction from './contract';

jest.mock('../loader');
jest.mock('./contract');

// Mocking the contract action causes a weird bug with the zod schema
// this mock just replaces the mock generated value with our imported value.
jest.mocked(contractAction.validate = contractSchema);

describe('steps/provision.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.registry as any) = registry;
    (fakeRuntime.chainId as any) = 1234;


    jest.mocked(fakeRuntime.derive).mockReturnThis();

    jest.mocked(contractAction.exec).mockResolvedValue({
      contracts: {
        Woot: {
          address: '0xfoobar',
          abi: [],
          deployTxnHash: '0x',
          contractName: 'Woot',
          sourceName: 'Woot.sol',
          deployedOn: 'contract.Woot',
        },
      },
    });
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(
        fakeCtx,
        {
          source: '<%= settings.a %>',
        },
        { name: 'who', version: '1.0.0', currentLabel: 'provision.whatever' }
      );

      expect(result).toStrictEqual({
        source: 'a',
        sourcePreset: 'main',
        targetPreset: 'with-who',
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      await registry.publish(['hello:1.0.0'], '13370-main', 'https://something.com', '');

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
      await registry.publish(['hello:1.0.0'], '1234-foobar', 'https://something-else.com', '');

      const result = await action.getState(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0', sourcePreset: 'foobar', chainId: 1234, targetPreset: 'voop', options: { bar: 'baz' } },
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
          { source: 'undefinedDeployment:1.0.0' },
          { name: 'package', version: '1.0.0', currentLabel: 'provision.whatever' }
        )
      ).rejects.toThrowError('deployment not found');
    });

    it('works properly', async () => {
      await registry.publish(['hello:1.0.0'], '1234-main', 'https://something.com', '');

      jest.mocked(fakeRuntime.readDeploy).mockResolvedValue({
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
              },
            },
          },
        },
      });
    });
  });
});
