import { validateConfig } from '../actions';
import { BUILD_VERSION } from '../constants';
import { InMemoryRegistry } from '../registry';
import action from './clone';
import deployAction from './deploy';
import { fakeCtx, fakeRuntime } from './utils.test.helper';

jest.mock('../loader');
jest.mock('./deploy');

describe('steps/clone.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.registry as any) = registry;
    (fakeRuntime.chainId as any) = 1234;

    jest.mocked(fakeRuntime.derive).mockReturnThis();

    jest.mocked(deployAction.getOutputs).mockReturnValue([]);
    jest.mocked(deployAction.getInputs).mockReturnValue({ accesses: [], unableToCompute: false });

    jest.mocked(deployAction.exec).mockResolvedValue({
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
    });

    jest.mocked(deployAction.validate.safeParse).mockReturnValue({ success: true } as any);
  });

  describe('validate', () => {
    it('fails when not setting values', () => {
      expect(() => validateConfig(action.validate, {})).toThrow('Field: source');
    });

    it('fails when setting invalid value', () => {
      expect(() => validateConfig(action.validate, { source: 'greeter', invalid: ['something'] })).toThrow(
        "Unrecognized key(s) in object: 'invalid'"
      );
    });
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {
      const result = action.configInject(
        fakeCtx,
        {
          source: '<%= settings.a %><%= settings.b %><%= settings.c %>',
        },
        { name: 'who', version: '1.0.0', currentLabel: 'clone.whatever' }
      );

      expect(result).toStrictEqual({
        source: 'abc:latest@main',
        sourcePreset: '',
        targetPreset: 'with-who',
        target: '',
      });
    });
  });

  describe('getState()', () => {
    it('always resolves to reexecute', async () => {
      await registry.publish(['hello:1.0.0@main'], 13370, 'https://something.com', '');
      const result = await action.getState();
      expect(result).toEqual([]);
    });
  });

  describe('exec()', () => {
    beforeEach(() => {
      jest.mocked(fakeRuntime.isCancelled).mockReturnValue(false);
    });
    it('throws if deployment not found', async () => {
      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'undefined-deployment:1.0.0' },
          { name: 'package', version: '1.0.0', currentLabel: 'clone.whatever' }
        )
      ).rejects.toThrowError('deployment not found');
    });

    it('throws if source name is longer than 32 bytes', async () => {
      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'package-name-longer-than-32bytes1337:1.0.0' },
          { name: 'package', version: '1.0.0', currentLabel: 'clone.whatever' }
        )
      ).rejects.toThrow('Package name exceeds 32 bytes');
    });

    it('throws if target name is longer than 32 bytes', async () => {
      await expect(() =>
        action.exec(
          fakeRuntime,
          fakeCtx,
          { source: 'package:1.0.0', target: 'package-name-longer-than-32bytes1337:1.0.0' },
          { name: 'package', version: '1.0.0', currentLabel: 'clone.whatever' }
        )
      ).rejects.toThrowError('Package name exceeds 32 bytes');
    });

    it('returns partial deployment if runtime becomes cancelled', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');

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
          name: 'hello',
          version: '1.0.0',
          var: {
            main: {
              sophisticated: 'fast',
            },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
      });

      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmsomething');
      jest.mocked(fakeRuntime.isCancelled).mockReturnValue(true);

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0@main' },
        { name: 'package', version: '1.0.0', currentLabel: 'clone.something' }
      );

      expect(result.imports!['something'].url).toEqual('ipfs://Qmsomething');

      expect(jest.mocked(fakeRuntime.putDeploy).mock.calls[0][0].status).toEqual('partial');
    });

    it('works with complete deployment', async () => {
      await registry.publish(['hello:1.0.0@main'], 1234, 'https://something.com', '');

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
          name: 'hello',
          version: '1.0.0',
          var: {
            main: {
              sophisticated: 'fast',
            },
          },
        } as any,
        meta: {},
        miscUrl: 'https://something.com',
      });

      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmsomething');

      const result = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0', targetPreset: 'woot-y' },
        { name: 'package', version: '1.0.0', currentLabel: 'clone.something' }
      );

      expect(result).toStrictEqual({
        imports: {
          something: {
            url: 'ipfs://Qmsomething',
            target: 'hello:1.0.0@woot-y',
            preset: 'woot-y',
            tags: ['latest'],
            settings: {
              sophisticated: 'fast',
            },
          },
        },
      });

      const result2 = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0', target: 'where:2.3.4@y-slink' },
        { name: 'package', version: '1.0.0', currentLabel: 'clone.something' }
      );

      expect(result2).toStrictEqual({
        imports: {
          something: {
            url: 'ipfs://Qmsomething',
            target: 'where:2.3.4@y-slink',
            preset: 'y-slink',
            tags: ['latest'],
            settings: {
              sophisticated: 'fast',
            },
          },
        },
      });
    });

    it('if deployment comes back the same, does not change deployment url', async () => {
      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmdoit');

      const firstResult = await action.exec(
        fakeRuntime,
        fakeCtx,
        { source: 'hello:1.0.0' },
        { name: 'package', version: '1.0.0', currentLabel: 'clone.something' }
      );

      const savedData = jest.mocked(fakeRuntime.putDeploy).mock.calls[0][0];

      jest.mocked(fakeRuntime.readBlob).mockResolvedValue(savedData);
      jest.mocked(fakeRuntime.putDeploy).mockResolvedValue('ipfs://Qmdoitelse');

      const newCtx = Object.assign({}, fakeCtx, firstResult);

      const finalResult = await action.exec(
        fakeRuntime,
        newCtx,
        { source: 'hello:1.0.0' },
        { name: 'package', version: '1.0.0', currentLabel: 'clone.something' }
      );

      expect(finalResult.imports?.something?.url).toEqual('ipfs://Qmdoit');
    });
  });
});
