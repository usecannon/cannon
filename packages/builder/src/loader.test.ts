import { IPFSLoader } from './loader';
import { ethers } from 'ethers';

import { OnChainRegistry } from './registry';
import { readIpfs, writeIpfs } from './ipfs';

jest.mock('./ipfs');
jest.mock('./registry');

describe('loader.ts', () => {
  describe('IPFSLoader', () => {
    jest.mocked(OnChainRegistry);

    let registry: OnChainRegistry;
    let loader: IPFSLoader;
    beforeAll(() => {
      registry = new OnChainRegistry({
        address: ethers.constants.AddressZero,
        signerOrProvider: ethers.Wallet.createRandom(),
      });
      loader = new IPFSLoader('hello', registry);
    });

    describe('constructor', () => {
      it('sets props', () => {
        expect(loader.ipfsUrl).toEqual('hello');
        expect(loader.resolver).toBe(registry);
      });
    });

    describe('readDeploy()', () => {
      it('returns null when deployment is not found', async () => {
        const deploy = await loader.readDeploy('foobar:1', 'main', 5);
        expect(deploy).toBeNull();
      });

      it('calls readIpfs with correct url', async () => {
        jest.mocked(registry.getUrl).mockResolvedValue('ipfs://Qmfoobar');
        jest.mocked(readIpfs).mockResolvedValue({ hello: 'world' });
        const deploy = await loader.readDeploy('foobar:1', 'main', 5);
        expect(deploy).toEqual({ hello: 'world' });
        expect(readIpfs).toBeCalledWith('hello', 'Qmfoobar', {});
      });
    });

    describe('putDeploy()', () => {
      it('calls ipfs write and returns the resulting ipfs Qmhash', async () => {
        const fakeDeployDefinition = {
          def: { name: 'funny', version: 'woot' },
          state: {},
          meta: '',
          miscUrl: '',
          options: {},
        };
        jest.mocked(writeIpfs).mockResolvedValue('Qmfun');
        expect(await loader.putDeploy(fakeDeployDefinition)).toEqual('ipfs://Qmfun');
        expect(writeIpfs).toBeCalledWith('hello', fakeDeployDefinition, {});
      });
    });

    describe('putMisc()', () => {
      it('calls ipfs write and returns the resulting ipfs Qmhash', async () => {
        jest.mocked(writeIpfs).mockResolvedValue('Qmfun');
        expect(await loader.putMisc({ hello: 'fun' })).toEqual('ipfs://Qmfun');
        expect(writeIpfs).toBeCalledWith('hello', { hello: 'fun' }, {});
      });
    });

    describe('readMisc()', () => {
      it('calls readIpfs', async () => {
        jest.mocked(readIpfs).mockResolvedValue({ hello: 'world' });
        const deploy = await loader.readMisc('ipfs://Qmfoobar');
        expect(deploy).toEqual({ hello: 'world' });
      });
    });
  });
});
