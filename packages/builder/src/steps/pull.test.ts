import '../actions';
import { BUILD_VERSION } from '../constants';
import { InMemoryRegistry } from '../registry';
import action from './pull';
import { fakeCtx, fakeRuntime } from './utils.test.helper';

jest.mock('../loader');

describe('steps/pull.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.registry as any) = registry;
    (fakeRuntime.chainId as any) = 1234;
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(fakeCtx, {
        source: '<%= settings.a %><%= settings.b %><%= settings.c %>',
        chainId: 1234,
        preset: '<%= settings.c %>',
        depends: [],
      });

      expect(result).toStrictEqual({
        source: 'abc:latest@main',
        chainId: 1234,
        preset: 'c',
        depends: [],
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');

      const result = await action.getState(fakeRuntime, fakeCtx, { source: 'hello:1.0.0' });

      expect(result).toContainEqual({
        url: 'https://something.com',
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
          { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
        )
      ).rejects.toThrowError('deployment not found');
    });

    it('works properly', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');
      await registry.publish(['hello:latest@main'], 1234, 'https://something.com', '');

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

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(result).toStrictEqual({
        imports: {
          something: {
            url: 'https://something.com',
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

      const withPreset = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0@main' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(withPreset).toStrictEqual({
        imports: {
          something: {
            url: 'https://something.com',
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

      const withoutVersion = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello@main' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(withoutVersion).toStrictEqual({
        imports: {
          something: {
            url: 'https://something.com',
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

      const onlyName = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello' },
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      );

      expect(onlyName).toStrictEqual({
        imports: {
          something: {
            url: 'https://something.com',
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
