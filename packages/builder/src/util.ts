import crypto from 'crypto';
import { ethers } from 'ethers';

import fs, { existsSync } from 'fs-extra';
import path from 'path';
import { CannonRegistry, ChainBuilder, getChartDir, getLayerFiles, getSavedChartsDir } from '.';
import { ChainBuilderContext, ContractArtifact, ChainArtifacts } from './types';

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

/**
 * Used as the `getDefaultSigner` implementation if none is specified to the chain builder. Creates a new
 * usable signer on the fly and attempts to populate it with hardhat functions `impersonateAccount`.
 * This will fail if running on a live network, so be sure to set your own `getDefaultSigner` if that
 * situation applies to you.
 * @param provider the provider set on the chain builder
 * @param txn the transaction that is to be executed
 * @param seed additional text which can be used to execute the same transaction with different addresses
 * @returns ethers signer
 */
export async function getExecutionSigner(
  provider: ethers.providers.JsonRpcProvider,
  txn: ethers.providers.TransactionRequest,
  salt = ''
): Promise<ethers.Signer> {
  const hasher = crypto.createHash('sha256');

  // create a hashable string out of relevant properties
  const seed = (txn.to || '') + txn.data + (txn.value || '') + Buffer.from(salt || '', 'utf8').toString('hex');

  const size = 32;
  for (let i = 0; i < seed.length; i += size) {
    hasher.update(seed.substr(i, size));
  }

  const hash = hasher.digest('hex');
  const address = '0x' + hash.slice(0, 40);

  await provider.send('hardhat_impersonateAccount', [address]);
  await provider.send('hardhat_setBalance', [address, ethers.utils.parseEther('10000').toHexString()]);

  return await (provider as ethers.providers.JsonRpcProvider).getSigner(address);
}

/**
 * Loads an artifact from the internal cannon storage.
 * @param name name of the cached contract artifact
 */
export async function getStoredArtifact(chartDir: string, name: string) {
  const artifactFile = path.join(chartDir, 'contracts', name + '.json');

  const artifactContent = await fs.readFile(artifactFile);
  const artifactData: ContractArtifact = JSON.parse(artifactContent.toString());

  if (!artifactData) {
    throw new Error(`Artifact not saved for "${name}"`);
  }

  return artifactData;
}

export async function passThroughArtifact(
  chartDir: string,
  getArtifact: (name: string) => Promise<ContractArtifact>,
  name: string
) {
  const artifactFile = path.join(chartDir, 'contracts', name + '.json');
  const artifact = await getArtifact(name);

  await fs.mkdirp(path.dirname(artifactFile));
  await fs.writeFile(artifactFile, JSON.stringify(artifact));

  return artifact;
}

export async function clearArtifacts(chartDir: string) {
  await fs.rm(chartDir, { recursive: true });
}

export function getContractFromPath(ctx: ChainBuilderContext, path: string) {
  const pathPieces = path.split('.');

  let importsBase: ChainArtifacts = ctx;
  for (const p of pathPieces.slice(0, -1)) {
    importsBase = ctx.imports[p];
  }

  const c = importsBase?.contracts?.[pathPieces[pathPieces.length - 1]];

  if (c) {
    return new ethers.Contract(c.address, c.abi);
  }

  return null;
}

export function printInternalOutputs(outputs: ChainArtifacts) {
  for (const c in outputs.contracts) {
    console.log(`deployed\t${c} at ${outputs.contracts[c].address} (${outputs.contracts[c].deployTxnHash})`);
  }

  for (const t in outputs.txns) {
    const txn = outputs.txns[t];

    console.log(`execed\t${t} (${txn.hash})`);

    // decode events
    for (const n in txn.events) {
      for (const e of txn.events[n]) {
        console.log(`\t-> ${n}(${e.args.map((s) => s.toString()).join(',')})`);
      }
    }

    console.log();
  }
}
