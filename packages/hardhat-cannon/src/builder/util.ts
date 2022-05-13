import crypto from 'crypto';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';

import fs from 'fs-extra';
import { ChainBuilderContext, InternalOutputs } from './types';

export const ChainDefinitionScriptSchema = {
  properties: {
    exec: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: { type: 'string' } },
    env: { elements: { type: 'string' } },
  },
} as const;

export function hashDirectory(path: string): Buffer {
  const dirHasher = crypto.createHash('sha256');

  // iterate through every file at path and build a checksum
  const subpaths = fs.readdirSync(path);

  for (const subpath of subpaths) {
    const fullname = `${path}/${subpath}`;
    const info = fs.statSync(fullname);
    if (info.isDirectory()) {
      dirHasher.update(hashDirectory(fullname));
    } else if (info.isFile()) {
      const hasher = crypto.createHash('sha256');
      dirHasher.update(hasher.update(fs.readFileSync(fullname)).digest());
    }
  }

  return dirHasher.digest();
}

export async function initializeSigner(hre: HardhatRuntimeEnvironment, address: string): Promise<ethers.Signer> {
  await hre.ethers.provider.send('hardhat_impersonateAccount', [address]);
  await hre.ethers.provider.send('hardhat_setBalance', [address, hre.ethers.utils.parseEther('2').toHexString()]);

  return hre.ethers.getSigner(address);
}

export async function getExecutionSigner(
  hre: HardhatRuntimeEnvironment,
  seed: string,
  fork: boolean
): Promise<ethers.Signer> {
  if (!fork) {
    // TODO: support for getting a different signer from the chain
    const [signer] = await hre.ethers.getSigners();
    return signer;
  }

  const hasher = crypto.createHash('sha256');

  const size = 32;
  for (let i = 0; i < seed.length; i += size) {
    hasher.update(seed.substr(i, size));
  }

  const hash = hasher.digest('hex');
  const address = '0x' + hash.slice(0, 40);

  return initializeSigner(hre, address);
}

export function getContractFromPath(ctx: ChainBuilderContext, path: string) {
  const pathPieces = path.split('.');

  let importsBase: InternalOutputs = ctx;
  for (const p of pathPieces.slice(0, -1)) {
    importsBase = ctx.imports[p];
  }

  const c = importsBase?.contracts?.[pathPieces[pathPieces.length - 1]];

  if (c) {
    return new ethers.Contract(c.address, c.abi);
  }

  return null;
}
