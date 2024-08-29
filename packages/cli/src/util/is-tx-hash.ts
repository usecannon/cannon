import { isHash } from 'viem';

/**
 * Checks if a string is a valid Ethereum transaction hash.
 *
 * An Ethereum transaction hash should be a 32-byte (64 characters) hexadecimal string
 * prefixed with '0x', totaling 66 characters.
 *
 * @param {string} hash - The string to be checked.
 * @returns {boolean} True if the string is a valid Ethereum transaction hash, false otherwise.
 *
 */
export const isTxHash = (hash: string): boolean => {
  // Check for exact 66-character length (including '0x' prefix)
  const is66CharHex = /^0x[a-fA-F0-9]{64}$/.test(hash);

  return is66CharHex && isHash(hash);
};
