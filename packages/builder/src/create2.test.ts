import * as viem from 'viem';
import { ARACHNID_DEFAULT_DEPLOY_ADDR, ensureArachnidCreate2Exists, makeArachnidCreate2Txn } from './create2';
import { fakeRuntime, makeFakeSigner } from './steps/utils.test.helper';

const DEFAULT_ARACHNID_ADDRESS = '0x4e59b44847b379578588920cA78FbF26c0B4956C';

describe('util.ts', () => {
  describe('ensureArachnidCreate2Exists()', () => {
    it('does nothing if create2 exists', async () => {
      jest.mocked(fakeRuntime.provider.getBytecode).mockResolvedValue('0x1234');

      // if it tries to do get a signer that function isnt defined so it will fail
      expect(await ensureArachnidCreate2Exists(fakeRuntime, ARACHNID_DEFAULT_DEPLOY_ADDR)).toEqual(DEFAULT_ARACHNID_ADDRESS);
    });

    it('fails if deploy signer is not defined', async () => {
      jest.mocked(fakeRuntime.provider.getBytecode).mockResolvedValue('0x');
      (fakeRuntime.getSigner as any) = async () => {
        throw new Error('no signer');
      };

      await expect(() => ensureArachnidCreate2Exists(fakeRuntime, ARACHNID_DEFAULT_DEPLOY_ADDR)).rejects.toThrowError(
        'could not populate arachnid signer address'
      );
    });

    it('calls sendTransaction to create aracnid contract if not deployed', async () => {
      jest.mocked(fakeRuntime.provider.getBytecode).mockResolvedValue('0x');

      const fakeSigner = makeFakeSigner(ARACHNID_DEFAULT_DEPLOY_ADDR);

      (fakeRuntime.getSigner as any) = async () => fakeSigner;

      //jest.mocked((fakeRuntime.provider as unknown as viem.WalletClient).sendRawTransaction).mockResolvedValue({ wait: jest.fn() } as any);

      await ensureArachnidCreate2Exists(fakeRuntime, ARACHNID_DEFAULT_DEPLOY_ADDR);

      expect((fakeSigner.wallet as unknown as viem.WalletClient).sendTransaction).toHaveBeenCalled();
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
        '0x1234567890',
        DEFAULT_ARACHNID_ADDRESS
      );

      expect(txn.to).toEqual(DEFAULT_ARACHNID_ADDRESS);
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
