import crypto from 'crypto';
import { ethers } from 'ethers';
import { Buffer } from 'buffer';
import _ from 'lodash';
import { JsonFragment } from '@ethersproject/abi';

import { ChainDefinition } from '.';
import { ChainDefinitionProblems } from './definition';
import { ChainBuilderContext, ChainArtifacts } from './types';

import { CannonWrapperGenericProvider } from './error/provider';

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

This error occurs because your cannonfile is requesting to sign a transaction, but the corresponding signer has not been made
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

  return str;
}

class ExtendableProxy {
  readonly accessed = new Map<string, AccessRecorder>();

  constructor() {
    return new Proxy(this, {
      get: (obj: any, prop: string) => {
        // console.log('LOGGING ACCESS', typeof prop, prop);
        if (prop === 'accessed' || prop === 'getAccesses') {
          return obj[prop];
        }
        if (!this.accessed.has(prop)) {
          this.accessed.set(prop, new AccessRecorder());
        }
        return typeof prop === 'symbol' ? () => '' : this.accessed.get(prop);
      },
    });
  }
}
export class AccessRecorder extends ExtendableProxy {
  getAccesses(depth: number, cur = 1) {
    if (cur == depth) {
      return Array.from(this.accessed.keys());
    }

    const acc: string[] = [];
    for (const k in this.accessed.keys()) {
      acc.push(k);
      acc.push(
        ...this.accessed
          .get(k)!
          .getAccesses(depth, (cur || 1) + 1)
          .map((a) => `${k}.${a}`)
      );
    }

    return acc;
  }
}

export function computeTemplateAccesses(str?: string) {
  if (!str) {
    return [];
  }
  //const recorder = new AccessRecorder();
  const recorders: { [k: string]: AccessRecorder } = {
    contracts: new AccessRecorder(),
    imports: new AccessRecorder(),
    extras: new AccessRecorder(),
    txns: new AccessRecorder(),
    settings: new AccessRecorder(),
  };

  const baseTemplate = _.template(str, {
    imports: {
      ...recorders,
      ...ethers.constants,
      ...ethers.utils,
    },
  });

  baseTemplate();

  const accesses: string[] = [];

  for (const recorder of Object.keys(recorders)) {
    accesses.push(...Array.from(recorders[recorder].accessed.keys()).map((a: string) => `${recorder}.${a}`));
  }

  return accesses;
  //return recorder.getAccesses(2).filter((a) => !a.includes('.'));
}
