import { CannonHelperContext, ChainBuilderContext, combineCtx } from './types';
import * as viem from 'viem';

const CUR_TIME = 1708947946123;

jest.mock('viem');

jest.useFakeTimers().setSystemTime(CUR_TIME);

// prevent dumb bugs
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('types.ts', () => {
  describe('combineCtx()', () => {
    it('combines context array', () => {
      const ctxs: ChainBuilderContext[] = [
        {
          timestamp: '0',
          chainId: 0,
          package: {},
          overrideSettings: {
            foo: 'bar',
          },
          contracts: {
            fake: {
              address: '0xfbfb',
              abi: [],
              contractName: 'Foo',
              sourceName: 'Foo.sol',
              deployedOn: 'contract.something',
              gasUsed: 100,
              gasCost: '100',
              deployTxnHash: '0x83823b',
            },
            fake2: {
              address: '0xfbfc',
              abi: [],
              contractName: 'Foo',
              sourceName: 'Foo.sol',
              deployedOn: 'contract.something',
              gasUsed: 100,
              gasCost: '100',
              deployTxnHash: '0x83823b',
            },
          },
          txns: {
            fake: {
              hash: '0x1234',
              events: {},
              deployedOn: 'invoke.something',
              gasUsed: 100,
              gasCost: '100',
              signer: '0x9293',
            },
          },
          imports: {
            fake: {
              url: 'http://two',
            },
          },
          settings: {},
        },
        {
          timestamp: '0',
          chainId: 0,
          package: {},
          overrideSettings: {},
          contracts: {},
          txns: {},
          imports: {},
          settings: {
            fake: 'hello',
          },
        },
        {
          timestamp: '0',
          chainId: 0,
          package: {},
          overrideSettings: {},
          contracts: {
            faker: {
              address: '0xfbff',
              abi: [],
              contractName: 'Foo',
              sourceName: 'Foo.sol',
              deployedOn: 'contract.something',
              gasUsed: 100,
              gasCost: '100',
              deployTxnHash: '0x83823b',
            },
            faker2: {
              address: '0x1111',
              abi: [],
              contractName: 'Foo',
              sourceName: 'Foo.sol',
              deployedOn: 'contract.something',
              gasUsed: 100,
              gasCost: '100',
              deployTxnHash: '0x83823b',
            },
          },
          txns: {},
          settings: {},
          imports: {},
        },
      ];

      const combinedCtx = combineCtx(ctxs);

      expect(combinedCtx.timestamp).toEqual(Math.floor(CUR_TIME / 1000).toString());
      expect(Object.keys(combinedCtx.contracts)).toEqual(expect.arrayContaining(['fake', 'fake2', 'faker', 'faker2']));
      expect(Object.keys(combinedCtx.txns)).toEqual(expect.arrayContaining(['fake']));
      expect(Object.keys(combinedCtx.settings)).toEqual(expect.arrayContaining(['fake']));
      expect(Object.keys(combinedCtx.imports)).toEqual(expect.arrayContaining(['fake']));
    });
  });

  describe('CannonHelperContext', () => {
    describe('parseUnits()', () => {
      beforeAll(() => {
        jest.mocked(viem.parseUnits).mockReturnValue(100n);
      });
      it('parses with string unit', () => {
        expect(CannonHelperContext.parseUnits('1', 'ether').toString()).toEqual('100');
        expect(jest.mocked(viem.parseUnits)).toHaveBeenCalledWith('1', 18);
      });

      it('parses with decimal unit', () => {
        expect(CannonHelperContext.parseUnits('1', 17).toString()).toEqual('100');
        expect(jest.mocked(viem.parseUnits)).toHaveBeenCalledWith('1', 17);
      });

      it('fails with unknown unit', () => {
        expect(() => CannonHelperContext.parseUnits('1', 'woot')).toThrow();
      });
    });

    describe('formatUnits()', () => {
      beforeAll(() => {
        jest.mocked(viem.formatUnits).mockReturnValue('100');
      });
      it('parses with string unit', () => {
        expect(CannonHelperContext.formatUnits(BigInt(1e18), 'ether')).toEqual('100');
        expect(jest.mocked(viem.formatUnits)).toHaveBeenCalledWith(BigInt(1e18), 18);
      });

      it('parses with decimal unit', () => {
        expect(CannonHelperContext.formatUnits(BigInt(1e16), 'ether')).toEqual('100');
        expect(jest.mocked(viem.formatUnits)).toHaveBeenCalledWith(BigInt(1e16), 18);
      });

      it('fails with unknown uni', () => {
        expect(() => CannonHelperContext.formatUnits(BigInt(1e17), 'woot')).toThrow();
      });
    });

    describe('defaultAbiCoder', () => {
      beforeAll(() => {
        jest.mocked(viem.encodeAbiParameters).mockReturnValue('0x828282');
        jest.mocked(viem.decodeAbiParameters).mockReturnValue(['hello', 1234]);
      });
      it('decodes', () => {
        expect(CannonHelperContext.defaultAbiCoder.decode(['string', 'uint256'], '0x828282')).toEqual(['hello', 1234]);
        expect(jest.mocked(viem.decodeAbiParameters)).toHaveBeenCalledWith(
          [{ type: 'string' }, { type: 'uint256' }],
          '0x828282'
        );
      });
      it('encodes', () => {
        expect(CannonHelperContext.defaultAbiCoder.encode(['string', 'uint256'], ['hello', 1234])).toEqual('0x828282');
        expect(jest.mocked(viem.encodeAbiParameters)).toHaveBeenCalledWith(
          [{ type: 'string' }, { type: 'uint256' }],
          ['hello', 1234]
        );
      });
    });

    describe('zeroPad()', () => {
      beforeAll(() => {
        jest.mocked(viem.padHex).mockReturnValue('0x12340000');
      });
      it('works', () => {
        expect(CannonHelperContext.zeroPad('0x1234', 4)).toEqual('0x12340000');
        expect(jest.mocked(viem.padHex)).toHaveBeenCalledWith('0x1234', { size: 4 });
      });
    });

    describe('hexZeroPad()', () => {
      beforeAll(() => {
        jest.mocked(viem.padHex).mockReturnValue('0x12340000');
      });
      it('works', () => {
        expect(CannonHelperContext.hexZeroPad('0x1234', 4)).toEqual('0x12340000');
        expect(jest.mocked(viem.padHex)).toHaveBeenCalledWith('0x1234', { size: 4 });
      });
    });

    describe('formatBytes32String()', () => {
      beforeAll(() => {
        jest.mocked(viem.stringToHex).mockReturnValue('0x12340000');
      });
      it('works', () => {
        expect(CannonHelperContext.formatBytes32String('woot')).toEqual('0x12340000');
        expect(jest.mocked(viem.stringToHex)).toHaveBeenCalledWith('woot', { size: 32 });
      });
    });

    describe('parseBytes32String()', () => {
      beforeAll(() => {
        jest.mocked(viem.hexToString).mockReturnValue('woot');
      });
      it('works', () => {
        expect(CannonHelperContext.parseBytes32String('0x12340000')).toEqual('woot');
        expect(jest.mocked(viem.hexToString)).toHaveBeenCalledWith('0x12340000', { size: 32 });
      });
    });

    describe('id()', () => {
      it('works if it starts with function', () => {
        jest.mocked(viem.toFunctionSelector).mockReturnValue('0x12340000');
        expect(CannonHelperContext.id('function woot()')).toEqual('0x12340000');
        expect(jest.mocked(viem.toFunctionSelector)).toHaveBeenCalledWith('function woot()');
      });

      it('works if its just a non-function string', () => {
        jest.mocked(viem.keccak256).mockReturnValue('0x12340000');
        jest.mocked(viem.toHex).mockReturnValue('0x8383');
        expect(CannonHelperContext.id('hello')).toEqual('0x12340000');
        expect(jest.mocked(viem.toHex)).toHaveBeenCalledWith('hello');
        expect(jest.mocked(viem.keccak256)).toHaveBeenCalledWith('0x8383');
      });
    });

    describe('solidityKeccak256()', () => {
      it('works', () => {
        jest.mocked(viem.keccak256).mockReturnValue('0x12340000');
        jest.mocked(viem.encodePacked).mockReturnValue('0x8383');
        expect(CannonHelperContext.solidityKeccak256(['world'], ['hello'])).toEqual('0x12340000');
        expect(jest.mocked(viem.encodePacked)).toHaveBeenCalledWith(['world'], ['hello']);
        expect(jest.mocked(viem.keccak256)).toHaveBeenCalledWith('0x8383');
      });
    });

    describe('soliditySha256()', () => {
      it('works', () => {
        jest.mocked(viem.keccak256).mockReturnValue('0x12340000');
        jest.mocked(viem.encodePacked).mockReturnValue('0x8383');
        expect(CannonHelperContext.solidityKeccak256(['world'], ['hello'])).toEqual('0x12340000');
        expect(jest.mocked(viem.encodePacked)).toHaveBeenCalledWith(['world'], ['hello']);
        expect(jest.mocked(viem.keccak256)).toHaveBeenCalledWith('0x8383');
      });
    });
  });
});
