
import '../actions';
import { BUILD_VERSION } from '../constants';
import { IPFSLoader } from '../loader';
import { InMemoryRegistry } from '../registry';
import action from './import';
import { fakeCtx, fakeRuntime } from './testUtils';

jest.mock('../loader');

describe('steps/import.ts', () => {
  const registry = new InMemoryRegistry();

  beforeAll(async () => {
    (fakeRuntime.loader as any) = new IPFSLoader('', registry);
    fakeRuntime.loader.resolver = registry;
    (fakeRuntime.chainId as any) = 1234;
  });

  describe('configInject()', () => {
    it('injects all fields', async () => {

      const result = action.configInject(fakeCtx, {
        source: '<%= settings.a %>',
        chainId: 1234,
        preset: '<%= settings.c %>',
        depends: []
      });

      expect(result).toStrictEqual({
        source: 'a',
        chainId: 1234,
        preset: 'c',
        depends: []
      });
    });
  });

  describe('getState()', () => {
    it('resolves correct properties with minimal config', async () => {

      await registry.publish(['hello:1.0.0'], '1234-main', 'https://something.com', '');

      const result = await action.getState(fakeRuntime, fakeCtx, { source: 'hello:1.0.0' });

      expect(result).toStrictEqual({
        url: 'https://something.com'
      })
    });
  });

  describe('exec()', () => {

    it('throws if deployment not found', async () => {
      expect(() => action.exec(
        fakeRuntime, 
        fakeCtx, 
        { source: 'undefinedDeployment:1.0.0' }, 
        { name: 'package', version: '1.0.0', currentLabel: 'import.something' }
      )).rejects.toThrowError('deployment not found');
    });

    it('works properly', async () => {
      await registry.publish(['hello:1.0.0'], '1234-main', 'https://something.com', '');

      jest.mocked(fakeRuntime.loader.readDeploy).mockResolvedValue({
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
                  deployedOn: 'contract.Woot'
                }
              }
            }
          }
        },
        options: {},
        def: { 
          name: 'hello', 
          version: '1.0.0', 
          contract: { 
            Woot: { artifact: 'Woot' }
          } 
        } as any,
        meta: {},
        miscUrl: 'https://something.com'
      })

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
                deployedOn: 'contract.Woot'
              }
            }
          }
        }
      });
    });
  });
});
