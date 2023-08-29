import { readIpfs, writeIpfs, deleteIpfs, listPinsIpfs, isIpfsGateway } from './ipfs';

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
        await writeIpfs(IPFS_API_URL, { hello: 'world' });
      });
    }
  });

  describe('deleteIpfs()', () => {
    it('throws on gateway', async () => {
      await expect(() => deleteIpfs('http://arstarst.com', 'ipfs://Qmfake')).rejects.toBeTruthy();
    });

    if (IPFS_API_URL) {
      it('deletes', async () => {
        const url = await writeIpfs(IPFS_API_URL, { hello: 'world' });
        await deleteIpfs(IPFS_API_URL, url!);

        expect(await readIpfs(IPFS_API_URL, url!)).toEqual(null);
      });
    }
  });

  describe('listPinsIpfs()', () => {
    it('returns empty array on gateway', async () => {
      expect(await listPinsIpfs('http://arstarst.com')).toEqual([]);
    });

    if (IPFS_API_URL) {
      it('returns empty array when no pins are present', async () => {
        const url = await writeIpfs(IPFS_API_URL, { hello: 'world' });
        expect(await listPinsIpfs(IPFS_API_URL)).toContain(url);
      });
    }
  });
});
