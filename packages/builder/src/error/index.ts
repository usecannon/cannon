import Debug from 'debug';
/* eslint-disable no-case-declarations */
import * as viem from 'viem';
import { estimateContractGas, estimateGas, prepareTransactionRequest, simulateContract } from 'viem/actions';
import { parseContractErrorReason, renderTrace, TraceEntry } from '../trace';
import { ChainArtifacts, ContractData } from '../types';

const NONCE_EXPIRED = 'NONCE_EXPIRED';
const debug = Debug('cannon:builder:error');

export function traceActions(artifacts: ChainArtifacts) {
  return (client: viem.Client) => {
    return {
      estimateGas: async (args: viem.EstimateGasParameters) => {
        try {
          return await estimateGas(client, args);
        } catch (err) {
          await handleTxnError(artifacts, client, err, args as viem.PrepareTransactionRequestParameters);
        }
      },
      estimateContractGas: async (args: viem.EstimateContractGasParameters) => {
        try {
          return await estimateContractGas(client, args);
        } catch (err) {
          await handleTxnError(artifacts, client, err, {
            account: args.account,
            to: args.address,
            value: args.value,
            data: viem.encodeFunctionData(args),
            chain: client.chain,
          });
        }
      },
      prepareTransactionRequest: async (args: viem.PrepareTransactionRequestParameters) => {
        try {
          return await prepareTransactionRequest(client, args);
        } catch (err) {
          await handleTxnError(artifacts, client, err, args);
        }
      },
      simulateContract: async (args: viem.SimulateContractParameters) => {
        try {
          return await simulateContract(client, args);
        } catch (err) {
          await handleTxnError(artifacts, client, err, {
            account: args.account,
            to: args.address,
            chain: args.chain,
            data: viem.encodeFunctionData(args),
            value: args.value,
          });
        }
      },
    };
  };
}

export async function handleTxnError(
  artifacts: ChainArtifacts,
  provider: viem.Client,
  err: any,
  txnData?: viem.PrepareTransactionRequestParameters
): Promise<any> {
  if (err instanceof CannonTraceError || (err?.toString() as string).includes('CannonTraceError')) {
    // error already parsed
    debug('skipping trace of error because already processed', err.toString());
    throw err;
  }

  debug('handle txn error received', err.toString(), JSON.stringify(err, null, 2));
  debug('the txn data', txnData);

  let errorCodeHex: viem.Hex | null = null;
  let txnHash: viem.Hash | null = null;

  let traces: TraceEntry[] = [];

  if (viem.isHex(err.data)) {
    errorCodeHex = err.data;
  }
  if (viem.isHex(err.error?.data)) {
    errorCodeHex = err.error.data;
  }
  if (err.cause) {
    await handleTxnError(artifacts, provider, err.cause, txnData);
  }

  if (txnData && (await isAnvil(provider))) {
    const fullTxn = {
      gasLimit: 20000000, // should ensure we get an actual failed receipt
      ...txnData,
    };

    // then, run it for real so we can get a trace
    try {
      fullTxn.account = fullTxn.account || viem.zeroAddress;
      const accountAddr: viem.Address =
        typeof fullTxn.account === 'string' ? fullTxn.account : (fullTxn.account as viem.Account).address;
      const fullProvider = provider.extend(viem.publicActions).extend(viem.walletActions);
      await fullProvider.request({ method: 'anvil_impersonateAccount' as any, params: [accountAddr] });
      await fullProvider.request({
        method: 'anvil_setBalance' as any,
        params: [accountAddr, viem.toHex(viem.parseEther('10000'))],
      });

      // TODO: reevaluate typings
      txnHash = await fullProvider.sendTransaction(fullTxn as any);

      await fullProvider.waitForTransactionReceipt({
        hash: txnHash,
        pollingInterval: 50,
      });
    } catch (err) {
      debug('warning: failed to force through transaction:', err);
    }
  }

  if (txnHash) {
    // try getting trace data
    try {
      traces = await provider.request({ method: 'trace_transaction' as any, params: [txnHash] });
    } catch (err) {
      debug('warning: trace api unavailable', err);
    }
  }

  if (traces.length || txnHash || txnData || errorCodeHex) {
    throw new CannonTraceError(err, artifacts, errorCodeHex, traces);
  } else {
    throw err;
  }
}

class CannonTraceError extends Error {
  error: Error;

  // this is needed here to prevent ethers from intercepting the error
  // `NONCE_EXPIRED` is a very innocent looking error, so ethers will simply forward it.
  code: string = NONCE_EXPIRED;

  constructor(error: Error, ctx: ChainArtifacts, errorCodeHex: viem.Hex | null, traces: TraceEntry[]) {
    let contractName = 'unknown';
    let decodedMsg = error.message;
    if (errorCodeHex) {
      try {
        const r = findContract(ctx, ({ abi }) => {
          try {
            viem.decodeErrorResult({ abi, data: errorCodeHex });
            return true;
          } catch (_) {
            // intentionally empty
          }

          return false;
        });
        if (r !== null) {
          contractName = r?.name;
        }

        decodedMsg = parseContractErrorReason(r?.contract ?? null, errorCodeHex);
      } catch {
        // intentionally empty
      }
    }

    // now we can make ourselves a thing
    const message = [`transaction reverted in contract ${contractName}: ${decodedMsg}`];

    if (Array.isArray(traces) && traces.length) {
      message.push(renderTrace(ctx, traces));
    }

    super(message.join('\n\n'));

    this.error = error;
  }
}

async function isAnvil(provider: viem.Client) {
  return (await provider.request({ method: 'web3_clientVersion' })).includes('anvil');
}

export function findContract(
  ctx: ChainArtifacts,
  condition: (v: { address: viem.Address; abi: viem.Abi }) => boolean,
  prefix = ''
): { name: string; contract: ContractData } | null {
  for (const name in ctx.contracts) {
    if (condition(ctx.contracts[name])) {
      return {
        name: prefix + name,
        contract: ctx.contracts[name],
      };
    }
  }

  for (const name in ctx.imports) {
    const result = findContract(ctx.imports[name], condition, `${prefix}${name}.`);
    if (result) {
      return result;
    }
  }

  return null;
}
