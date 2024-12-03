import crypto from 'crypto';
import * as viem from 'viem';
import { Buffer } from 'buffer';
import _ from 'lodash';

import { ChainDefinition } from '.';
import { ChainDefinitionProblems } from './definition';
import { ChainArtifacts, CannonSigner, Contract } from './types';

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
  provider: viem.TestClient,
  txn: Omit<viem.SendTransactionParameters, 'account' | 'chain'>,
  salt = ''
): Promise<CannonSigner> {
  const hasher = crypto.createHash('sha256');

  // create a hashable string out of relevant properties
  const seed = (txn.to || '') + txn.data + (txn.value || '') + Buffer.from(salt || '', 'utf8').toString('hex');

  const size = 32;
  for (let i = 0; i < seed.length; i += size) {
    hasher.update(seed.substring(i, i + size));
  }

  const hash = hasher.digest('hex');
  const address = ('0x' + hash.slice(0, 40)) as viem.Address;

  await provider.impersonateAccount({ address });
  await provider.setBalance({ address, value: viem.parseEther('10000') });

  const client = viem.createWalletClient({
    account: address,
    chain: provider.chain,
    transport: viem.custom(provider.transport),
  });

  return { wallet: client, address };
}

export async function passThroughSigner(
  getSigner: (addr: string) => Promise<CannonSigner | null>,
  addr: string
): Promise<CannonSigner> {
  const signer = await getSigner(addr);

  if (!signer) {
    throw new Error(`signer not provided for address ${addr}

This error occurs because your cannonfile is requesting to sign a transaction, but the corresponding signer has not been made
available in your configuration. Please double check your configuration & integrations and try again.`);
  }

  return signer;
}

export function getContractDefinitionFromPath(ctx: ChainArtifacts, path: string) {
  const pathPieces = path.split('.');

  let importsBase: ChainArtifacts = ctx;
  for (const p of pathPieces.slice(0, -1)) {
    importsBase = importsBase.imports![p];
  }

  const c = importsBase?.contracts?.[pathPieces[pathPieces.length - 1]];

  return c || null;
}

export function getMergedAbiFromContractPaths(ctx: ChainArtifacts, paths: string[]) {
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
        return _.isEqual(a, b);
      });

      return !alreadyExists;
    });
}

export const removeConstructorFromAbi = (abi: any[]) => {
  return abi.filter((a) => a.type !== 'constructor');
};

export function getContractFromPath(ctx: ChainArtifacts, path: string): Contract | null {
  const contract = getContractDefinitionFromPath(ctx, path);

  if (contract) {
    return { address: contract.address, abi: contract.abi };
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
    str.push(
      `${counter}: In operation "${missing.action}", the dependency "${missing.dependency}" is not defined elsewhere.`
    );
    counter++;
  }

  if (problems.missing.length && def) {
    str.push(`HELP: The following is the full list of known operations:
${def.allActionNames.join('\n')}`);
  }

  for (const cycle of problems.cycles) {
    str.push(`${counter}: The actions ${cycle.join(', ')} form a dependency cycle.`);

    counter++;
  }

  for (const clash of problems.outputClashes) {
    str.push(`${counter}: The following actions output the field '${clash.output}': ${clash.actions.join(', ')}. (Only one action can occupy a particular output name)`)
  }

  return str;
}

function fixViemBoolArgs(options: { args?: readonly unknown[] }) {
  const newArgs: any[] = [];
  for (const arg of options.args || []) {
    if (typeof arg === 'string') {
      if (arg.toLowerCase() === 'true') {
        // NOTE: if the actual objcet is supposed to parse into a string, then `toString` will be called on the boolean and its fine (tested)
        newArgs.push(true);
      } else if (arg.toLowerCase() === 'false') {
        newArgs.push(false);
      } else {
        newArgs.push(arg);
      }
    } else {
      newArgs.push(arg);
    }
  }

  options.args = newArgs;
}

// Noticed that viem is not adding the '0x' at the beggining, contratry to what
// the docs say, so just keeping the check in case is needed in the future.
// also support for booleans in strings which they refuse to do
export function encodeDeployData(options: Parameters<typeof viem.encodeDeployData>[0]) {
  fixViemBoolArgs(options);
  const data = viem.encodeDeployData(options);
  return data.startsWith('0x') ? data : (`0x${data}` as viem.Hex);
}

// viem to allow for parsing of booleans as strings
export function encodeFunctionData(options: Parameters<typeof viem.encodeFunctionData>[0]) {
  fixViemBoolArgs(options);
  return viem.encodeFunctionData(options);
}
