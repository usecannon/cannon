import { getDefaultStorage, getCannonContract } from './helpers';
import { IPFSLoader, InMemoryLoader } from './loader';
import { InMemoryRegistry } from './registry';
import { CannonStorage } from './runtime';

describe('helpers.test.ts', () => {
  describe('getDefaultStorage()', () => {
    it('returns', () => {
      const storage = getDefaultStorage();

      expect(storage.loaders.ipfs).toBeInstanceOf(IPFSLoader);
      expect(storage.registry).toBeInstanceOf(InMemoryRegistry);
    });
  });

  describe('getCannonContract()', () => {
    const fakeStorage = new CannonStorage(new InMemoryRegistry(), { mem: new InMemoryLoader(1) }, 'mem');

    beforeAll(async () => {
      const deployInfoUrl = await fakeStorage.putDeploy({
        generator: 'cannon test',
        timestamp: 10000000,
        def: { name: 'woot', version: '0.0.1', contract: { Something: { artifact: 'Woot' } } },
        options: {},
        state: {
          'contract.Something': {
            version: 1,
            hash: '',
            artifacts: {
              contracts: {
                Something: {
                  address: '0x1234123412341234123412341234123412341234',
                } as any,
              },
            },
          },
        },
        meta: {},
        miscUrl: '',
      });
      await fakeStorage.registry.publish(['woot:latest'], 282, deployInfoUrl!, '');
    });

    it('uses default storage if not provided', async () => {
      await expect(() =>
        getCannonContract({
          package: 'wooted:latest',
          contractName: 'Something',
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('throws error if package not found', async () => {
      await expect(() =>
        getCannonContract({
          package: 'wooted:latest',
          contractName: 'Something',
          storage: fakeStorage,
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('throws error if contract not found', async () => {
      await expect(() =>
        getCannonContract({
          package: 'woot:latest',
          contractName: 'SomethingElse',
          storage: fakeStorage,
          chainId: 282,
        })
      ).rejects.toThrow();
    });

    it('finds contract', async () => {
      const contract = await getCannonContract({
        package: 'woot:latest',
        contractName: 'Something',
        storage: fakeStorage,
        chainId: 282,
      });

      expect(contract.address).toEqual('0x1234123412341234123412341234123412341234');
    });
  });
});
