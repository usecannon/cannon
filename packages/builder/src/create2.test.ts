import { ARACHNID_CREATE2_PROXY } from './constants';
import { ARACHNID_DEPLOY_ADDR, ARACHNID_DEPLOY_TXN, ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from './create2';

import { fakeRuntime, makeFakeSigner } from './steps/utils.test';

describe('util.ts', () => {
  describe('ensureArachnidCreate2Exists()', () => {
    it('does nothing if create2 exists', async () => {
      jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0x1234');

      // if it tries to do get a signer that function isnt defined so it will fail
      await ensureArachnidCreate2Exists(fakeRuntime);
    });

    it('fails if deploy signer is not defined', async () => {
      jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0x');
      (fakeRuntime.getSigner as any) = async () => {
        throw new Error('no signer');
      };

      await expect(() => ensureArachnidCreate2Exists(fakeRuntime)).rejects.toThrowError(
        'could not populate arachnid signer address'
      );
    });

    it('calls sendTransaction to create aracnid contract if not deployed', async () => {
      jest.mocked(fakeRuntime.provider.getCode).mockResolvedValue('0x');

      const fakeSigner = makeFakeSigner(ARACHNID_DEPLOY_ADDR);

      (fakeRuntime.getSigner as any) = async () => fakeSigner;

      jest.mocked(fakeRuntime.provider.sendTransaction).mockResolvedValue({ wait: jest.fn() } as any);

      await ensureArachnidCreate2Exists(fakeRuntime);

      expect(fakeRuntime.provider.sendTransaction).toBeCalledWith(ARACHNID_DEPLOY_TXN);
    });
  });

  describe('makeArachnidCreate2Txn()', () => {
    it('returns the correct address', async () => {
      const [, addr] = makeArachnidCreate2Txn(
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        '0x00',
        '0x0000000000000000000000000000000000000000'
      );

      expect(addr).toEqual('0x4D1A2e2bB4F88F0250f26Ffff098B0b30B26BF38');
    });

    it('returns the correct txn', async () => {
      const [txn] = makeArachnidCreate2Txn(
        '0x0987654321000000000000000000000000000000000000000000000000000000',
        '0x1234567890'
      );

      expect(txn.to).toEqual(ARACHNID_CREATE2_PROXY);
      expect(txn.data).toEqual('0x09876543210000000000000000000000000000000000000000000000000000001234567890');
    });

    it('works with arbitrary string salt', async () => {
      const [, addr] = makeArachnidCreate2Txn(
        'hello world', // arbitrary string salt
        '0x00',
        '0x0000000000000000000000000000000000000000'
      );

      expect(addr).toEqual('0x69D36DFe281136ef662ED1A2E80a498A5461226D');
    });
  });
});
