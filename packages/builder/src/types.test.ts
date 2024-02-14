import { CannonHelperContext } from './types';

describe('types.ts', () => {
  describe('CannonHelperContext', () => {
    describe('parseUnits()', () => {
      it('parses with string unit', () => {
        expect(CannonHelperContext.parseUnits('1', 'ether')).toEqual(BigInt(1e18));
      });

      it('parses with decimal unit', () => {
        expect(CannonHelperContext.parseUnits('1', 17)).toEqual(BigInt(1e17));
      });

      it('fails with unknown uni', () => {
        expect(() => CannonHelperContext.parseUnits('1', 'woot')).toThrow();
      });
    });

    describe('formatUnits()', () => {
      it('parses with string unit', () => {
        expect(CannonHelperContext.formatUnits(BigInt(1e18), 'ether')).toEqual('1');
      });

      it('parses with decimal unit', () => {
        expect(CannonHelperContext.formatUnits(BigInt(1e16), 17)).toEqual('0.1');
      });

      it('fails with unknown uni', () => {
        expect(() => CannonHelperContext.formatUnits(BigInt(1e17), 'woot')).toThrow();
      });
    });
  });
});
