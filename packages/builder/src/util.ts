import crypto from 'crypto';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import _ from 'lodash';
import { JsonFragment } from '@ethersproject/abi';

import { ChainDefinition } from '.';
import { ChainDefinitionProblems } from './definition';
import { ChainBuilderContext, ChainArtifacts } from './types';

import { CannonWrapperGenericProvider } from './error/provider';

export const ChainDefinitionScriptSchema = {
  properties: {
    exec: { type: 'string' },
  },
  optionalProperties: {
    args: { elements: { type: 'string' } },
    env: { elements: { type: 'string' } },
  },
} as const;

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
  provider: CannonWrapperGenericProvider,
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
  await provider.send('hardhat_setBalance', [address, `0x${(1e22).toString(16)}`]);

  return await provider.getSigner(address);
}

export async function passThroughSigner(
  getSigner: (addr: string) => Promise<ethers.Signer | null>,
  addr: string
): Promise<ethers.Signer> {
  const signer = await getSigner(addr);

  if (!signer) {
    throw new Error(`signer not provided for address ${addr}

This error occurs becuase your cannonfile is requesting to sign a transaction, but the corresponding signer has not been made
available in your configuration. Please double check your configuration & integrations and try again.`);
  }

  return signer;
}

export function getContractDefinitionFromPath(ctx: ChainBuilderContext, path: string) {
  const pathPieces = path.split('.');

  let importsBase: ChainArtifacts = ctx;
  for (const p of pathPieces.slice(0, -1)) {
    importsBase = importsBase.imports![p];
  }

  const c = importsBase?.contracts?.[pathPieces[pathPieces.length - 1]];

  return c || null;
}

export function getMergedAbiFromContractPaths(ctx: ChainBuilderContext, paths: string[]) {
  return paths
    .flatMap((contractPath) => {
      const c = getContractDefinitionFromPath(ctx, contractPath);

      if (!c) {
        throw new Error(`previously deployed contract with identifier "${contractPath}" for factory not found`);
      }

      if (!Array.isArray(c.abi)) {
        throw new Error(`Contract definition for "${contractPath}" does not have a valid abi`);
      }

      return c.abi;
    })
    .filter((a, index, abi) => {
      if (index === 0) return true;
      const alreadyExists = abi.slice(0, index).some((b) => {
        return ethers.utils.Fragment.from(b)?.format('minimal') === ethers.utils.Fragment.from(a)?.format('minimal');
      });

      return !alreadyExists;
    });
}

export function getContractFromPath(ctx: ChainBuilderContext, path: string, customAbi?: JsonFragment[]) {
  const contract = getContractDefinitionFromPath(ctx, path);

  if (contract) {
    return new ethers.Contract(contract.address, customAbi || contract.abi);
  }

  return null;
}

export function getAllContractPaths(ctx: ChainArtifacts): string[] {
  return [
    ...Object.keys(ctx.contracts || {}),
    ..._.sortBy(_.flatMap(ctx.imports, (v, k) => getAllContractPaths(v).map((c) => `${k}.${c}`))),
  ];
}

export function printInternalOutputs(outputs: ChainArtifacts): string[] {
  const str: string[] = [];
  for (const c in outputs.contracts) {
    str.push(`deployed\t${c} at ${outputs.contracts[c].address} (${outputs.contracts[c].deployTxnHash})`);
  }

  for (const t in outputs.txns) {
    const txn = outputs.txns[t];

    str.push(`execed\t${t} (${txn.hash})`);

    // decode events
    for (const n in txn.events) {
      for (const e of txn.events[n]) {
        str.push(`\t-> ${n}(${e.args.map((s) => s.toString()).join(',')})`);
      }
    }

    str.push('');
  }

  return str;
}

export function printChainDefinitionProblems(problems: ChainDefinitionProblems, def?: ChainDefinition): string[] {
  let counter = 1;
  const str: string[] = [];

  for (const missing of problems.missing) {
    str.push(`${counter}: In action "${missing.action}", the dependency "${missing.dependency}" is not defined elsewhere.`);
    counter++;
  }

  if (problems.missing.length && def) {
    str.push(`HELP: The following is the full list of known actions:
${def.allActionNames.join('\n')}`);
  }

  for (const cycle of problems.cycles) {
    str.push(`${counter}: The actions ${cycle.join(', ')} form a dependency cycle and therefore cannot be deployed.`);

    counter++;
  }

  for (const extraneous of problems.extraneous) {
    str.push(
      `${counter}: The action ${extraneous.node} defines an unnecessary dependency ${extraneous.extraneous} (a sub-dependency of ${extraneous.inDep}). Please remove this unnecessary dependency.`
    );

    counter++;
  }

  return str;
}
