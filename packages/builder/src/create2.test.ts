import { ARACHNID_CREATE2_PROXY } from './constants';
import { makeArachnidCreate2Txn } from './create2';

describe('util.ts', () => {
  describe('deployArachnidCreate2()', async () => {
    // todo when we have mock/dummy runtime
  });

  describe('makeArachnidCreate2Txn', () => {
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
