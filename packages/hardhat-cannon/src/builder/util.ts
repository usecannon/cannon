import crypto from 'crypto';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';

export const ChainDefinitionScriptSchema = {
  properties: {
    exec: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: { type: 'string' } },
    env: { elements: { type: 'string' } },
  },
} as const;

export async function getExecutionSigner(
  hre: HardhatRuntimeEnvironment,
  seed: string
): Promise<ethers.Signer> {
  const hash = crypto.createHash('sha256').update(seed, 'hex').digest('hex');
  const address = '0x' + hash.slice(0, 40);

  // ensure this account has a balance
  await hre.ethers.provider.send('hardhat_impersonateAccount', [address]);

  await hre.ethers.provider.send('hardhat_setBalance', [
    address,
    hre.ethers.utils.parseEther('2').toHexString(),
  ]);

  const signer = hre.ethers.getSigner(address);

  return signer;
}
