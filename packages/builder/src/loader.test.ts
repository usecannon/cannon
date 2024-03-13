import { IPFSLoader } from './loader';

import { OnChainRegistry } from './registry';
import { readIpfs, writeIpfs } from './ipfs';

jest.mock('./ipfs');
jest.mock('./registry');

describe('loader.ts', () => {
  describe('IPFSLoader', () => {
    jest.mocked(OnChainRegistry);

    let loader: IPFSLoader;
    beforeAll(() => {
      loader = new IPFSLoader('hello');
    });

    describe('constructor', () => {
      it('sets props', () => {
        expect(loader.ipfsUrl).toEqual('hello');
      });
    });

    describe('putMisc()', () => {
      it('calls ipfs write and returns the resulting ipfs Qmhash', async () => {
        jest.mocked(writeIpfs).mockResolvedValue('Qmfun');
        expect(await loader.put({ hello: 'fun' })).toEqual('ipfs://Qmfun');
        expect(writeIpfs).toBeCalledWith('hello', { hello: 'fun' }, {}, undefined, 300000, 3);
      });
    });

    describe('readMisc()', () => {
      it('calls readIpfs', async () => {
        jest.mocked(readIpfs).mockResolvedValue({ hello: 'world' });
        const deploy = await loader.read('ipfs://Qmfoobar');
        expect(deploy).toEqual({ hello: 'world' });
      });
    });
  });
});
