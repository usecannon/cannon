import { isHash } from 'viem';

export const isTxHash = (hash: string): boolean => {
  // Check for exact 66-character length (including '0x' prefix)
  const is66CharHex = /^0x[a-fA-F0-9]{64}$/.test(hash);

  return is66CharHex && isHash(hash);
};
