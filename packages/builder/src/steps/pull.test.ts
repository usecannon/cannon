import { validateConfig } from '../actions';
import { BUILD_VERSION } from '../constants';
import { InMemoryRegistry } from '../registry';
import action from './pull';
import { fakeCtx, fakeRuntime } from './utils.test.helper';
import { PackageReference } from '../package-reference';

jest.mock('../loader');

describe('steps/pull.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.registry as any) = registry;
    (fakeRuntime.chainId as any) = 1234;
  });

  describe('validate', () => {
    it('fails when not setting values', () => {
      expect(() => validateConfig(action.validate, {})).toThrow('Field: source');
    });

    it('fails when setting invalid value', () => {
      expect(() => validateConfig(action.validate, { source: 'somesource:1.0.0', invalid: ['something'] })).toThrow(
        "Unrecognized key(s) in object: 'invalid'"
      );
    });
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

      const result = await action.getState(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { ref: null, currentLabel: 'pull.Pull' }
      );

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
          { ref: new PackageReference('package:1.0.0'), currentLabel: 'import.something' }
        )
      ).rejects.toThrowError('deployment not found');
    });

    it('throws if target name is longer than 32 bytes', async () => {
      jest.mocked(fakeRuntime.readDeploy).mockResolvedValue({
        generator: 'cannon test',
        timestamp: 1234,
        state: {
          'deploy.Woot': {
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
                  deployedOn: 'deploy.Woot',
                  gasCost: '0',
                  gasUsed: 0,
                },
              },
            },
          },
        },
        options: {},
        def: {
          name: 'package',
          version: '1.0.0',
          var: {
            main: {
              sophisticated: 'fast',
            },
          },
          pull: {
            source: { source: 'package-name-longer-than-32bytes1337:1.0.0' },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
        chainId: 1234,
      });

      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'package-name-longer-than-32bytes1337:1.0.0' },
          { ref: new PackageReference('package:1.0.0'), currentLabel: 'clone.whatever' }
        )
      ).rejects.toThrowError('Package name exceeds 32 bytes');
    });

    it('throws if target version is longer than 32 bytes', async () => {
      jest.mocked(fakeRuntime.readDeploy).mockResolvedValue({
        generator: 'cannon test',
        timestamp: 1234,
        state: {
          'deploy.Woot': {
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
                  deployedOn: 'deploy.Woot',
                  gasCost: '0',
                  gasUsed: 0,
                },
              },
            },
          },
        },
        options: {},
        def: {
          name: 'package',
          version: '1.0.0',
          var: {
            main: {
              sophisticated: 'fast',
            },
          },
          pull: {
            source: { source: 'package:package-version-longer-than-32bytes1337' },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
        chainId: 1234,
      });

      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'package:package-version-longer-than-32bytes1337' },
          { ref: new PackageReference('package:1.0.0'), currentLabel: 'pull.whatever' }
        )
      ).rejects.toThrowError('Package version exceeds 32 bytes');
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
        chainId: 1234,
      });

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { ref: new PackageReference('package:1.0.0'), currentLabel: 'import.something' }
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
        { ref: new PackageReference('package:1.0.0'), currentLabel: 'import.something' }
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
        { ref: new PackageReference('package:1.0.0'), currentLabel: 'import.something' }
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
        { ref: new PackageReference('package:1.0.0'), currentLabel: 'import.something' }
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
