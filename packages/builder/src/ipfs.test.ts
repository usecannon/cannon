import { readIpfs, writeIpfs, isIpfsGateway } from './ipfs';

describe('ipfs.ts', () => {
  const IPFS_GATEWAY_URL = process.env.IPFS_GATEWAY_URL;
  const IPFS_API_URL = process.env.IPFS_API_URL;

  describe('isIpfsGateway()', () => {
    it('returns false when port is 5001', () => {
      expect(isIpfsGateway('http://arstarst.com:5001')).toBe(false);
    });

    it('returns false when scheme is ipfs+http(s)', () => {
      expect(isIpfsGateway('http+ipfs://arstarst.com')).toBe(false);
      expect(isIpfsGateway('https+ipfs://arstarst.com')).toBe(false);
    });

    it('returns true if it does not meet the requirements for a gateway', () => {
      expect(isIpfsGateway('http://arstarst.com')).toBe(true);
    });
  });

  describe('readIpfs()', () => {
    const knownIpfsResource = 'ipfs://';

    if (IPFS_GATEWAY_URL) {
      it('can download and decompress cannon info on gateway', async function () {
        expect(await readIpfs(IPFS_GATEWAY_URL, knownIpfsResource)).toEqual({ hello: 'world' });
      });
    }

    if (IPFS_API_URL) {
      it('can download and decompress cannon info on ipfs api', async function () {
        expect(await readIpfs(IPFS_API_URL, knownIpfsResource)).toEqual({ hello: 'world' });
      });
    }
  });

  describe('writeIpfs()', () => {
    it('returns null on gateway', async () => {
      expect(await writeIpfs('http://arstarst.com', { hello: 'world' })).toBeNull();
    });

    if (IPFS_API_URL) {
      it('uploads compressed archive that can be read back', async () => {
        const url = await writeIpfs(IPFS_API_URL, { hello: 'world' });

        expect(url).toMatch(/ipfs:\/\/Qm.*/);

        expect(await readIpfs(IPFS_API_URL, url!)).toEqual({ hello: 'world' });
      });
    }
  });
});
