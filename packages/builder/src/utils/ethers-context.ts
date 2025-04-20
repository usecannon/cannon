import * as viem from 'viem';

const _unitNames = ['wei', 'kwei', 'mwei', 'gwei', 'szabo', 'finney', 'ether'];

// Ethers.js compatible context functions. Consider deprecating.
export const ethersContext = {
  AddressZero: viem.zeroAddress,
  HashZero: viem.zeroHash,
  MaxUint256: viem.maxUint256,

  defaultAbiCoder: {
    encode: (a: string[], v: any[]) => {
      return viem.encodeAbiParameters(
        a.map((arg) => ({ type: arg })),
        v
      );
    },
    decode: (a: string[], v: viem.Hex | viem.ByteArray) => {
      return viem.decodeAbiParameters(
        a.map((arg) => ({ type: arg })),
        v
      );
    },
  },

  zeroPad: (a: viem.Hex, s: number) => viem.padHex(a, { size: s }),
  hexZeroPad: (a: viem.Hex, s: number) => viem.padHex(a, { size: s }),
  hexlify: viem.toHex,
  stripZeros: viem.trim,
  formatBytes32String: (v: string) => viem.stringToHex(v, { size: 32 }),
  parseBytes32String: (v: viem.Hex) => viem.hexToString(v, { size: 32 }),
  id: (v: string) => (v.startsWith('function ') ? viem.toFunctionSelector(v) : viem.keccak256(viem.toHex(v))),
  formatEther: viem.formatEther,
  formatUnits: (s: bigint, units: number | string) => {
    if (typeof units === 'string') {
      const index = _unitNames.indexOf(units);
      if (index < 0) {
        throw new Error(`formatUnits: unknown ethereum unit name: ${units}`);
      }
      units = 3 * index;
    }

    return viem.formatUnits(s, units as number);
  },
  parseEther: viem.parseEther,
  parseUnits: (s: string, units: number | string) => {
    if (typeof units === 'string') {
      const index = _unitNames.indexOf(units);
      if (index < 0) {
        throw new Error(`parseUnits: unknown ethereum unit name: ${units}`);
      }
      units = 3 * index;
    }

    return viem.parseUnits(s, units as number);
  },
  keccak256: viem.keccak256,
  sha256: viem.sha256,
  ripemd160: viem.ripemd160,
  solidityPack: viem.encodePacked,
  solidityKeccak256: (a: string[], v: any[]) => viem.keccak256(viem.encodePacked(a, v)),
  soliditySha256: (a: string[], v: any[]) => viem.sha256(viem.encodePacked(a, v)),
  serializeTransaction: viem.serializeTransaction,
  parseTransaction: viem.parseTransaction,

  encodeFunctionData: viem.encodeFunctionData,
  decodeFunctionData: viem.decodeFunctionData,
  encodeFunctionResult: viem.encodeFunctionResult,
  decodeFunctionResult: viem.decodeFunctionResult,
};
