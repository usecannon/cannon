import { ChainArtifacts, ChainDefinition, findContract, getArtifacts, renderTrace, TraceEntry } from '@usecannon/builder';
import { bold, gray, green, red, yellow } from 'chalk';
import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { readDeployRecursive } from '../package';
import { getProvider, runRpc } from '../rpc';
import { resolveCliSettings } from '../settings';
import { resolveWriteProvider } from '../util/provider';

const debug = Debug('cannon:cli:trace');

export async function trace({
  packageRef,
  data,
  chainId,
  providerUrl,
  from,
  to,
  value,
  block,
  json = false,
}: {
  packageRef: string;
  data: viem.Hex;
  chainId: number;
  preset: string;
  providerUrl: string;
  from?: viem.Address;
  to?: viem.Address;
  block?: string;
  value?: bigint;
  json: boolean;
}) {
  const cliSettings = resolveCliSettings({ providerUrl });
  // data can be:
  // 1. on-chain transaction hash
  // 2. calldata (will automatically detect contract to execute on)
  //   * in which case, will figure out what to execute
  //   * additional option to override the contract
  //
  // in any case, cannon will run the transaction in anvil. afterwards, it
  // will call `trace_transaction`, and decode as much data from the trace
  // as possible, the same way that an error occurs

  // get transaction data from the provider
  const { provider } = await resolveWriteProvider(cliSettings, chainId);

  // if chain id is not specified, get it from the provider
  if (!chainId) {
    chainId = await provider.getChainId();
  }

  const deployInfos = await readDeployRecursive(packageRef, chainId);

  const artifacts: ChainArtifacts = {};

  for (const di of deployInfos) {
    _.merge(artifacts, getArtifacts(new ChainDefinition(di.def), di.state));
  }

  if (viem.isHash(data)) {
    const txHash = data as viem.Hash;

    try {
      const txData = await provider.getTransaction({ hash: txHash });
      const txReceipt = await provider.getTransactionReceipt({ hash: txHash });

      // this is a transaction hash
      console.log(gray('Detected transaction hash'));

      data = (txData as any).data;
      value = value || txData.value;
      block = block || txReceipt.blockNumber.toString();
      from = from || txData.from;
      if (!to && txData.to) to = txData.to;
    } catch (err) {
      throw new Error('could not get transaction information. The transaction may not exist?');
    }
  } else if (!to) {
    const r = findContract(artifacts, ({ abi }) => {
      try {
        viem.decodeFunctionData({ abi, data });
        return true;
      } catch (_) {
        // intentionally empty
      }

      return false;
    });
    if (r !== null) {
      to = r.contract.address;
      console.log(gray(`Inferred contract for call: ${r.name}`));
    } else {
      console.log(
        yellow(
          'Could not find a contract for this call. Are you sure the call can be traced on a contract on this cannon package? Pass `--to` to set manually if necessary'
        )
      );
    }
  }

  // create an anvil server
  let rpc;
  if (block) {
    // subtract one second because 1 second is added when the block is mined
    const blockInfo = await provider.getBlock(
      (block || 'latest').match(/^[0-9]*$/) ? { blockNumber: BigInt(block) } : { blockTag: block as viem.BlockTag }
    );
    const timestamp = blockInfo.timestamp - BigInt(1);
    rpc = await runRpc(
      {
        port: 0,
        forkBlockNumber: !block || block === 'latest' ? undefined : (blockInfo.number! - BigInt(1)).toString(),
        timestamp,
        chainId,
      },
      { forkProvider: provider as any }
    );
  } else {
    rpc = await runRpc({ port: 0, chainId }, { forkProvider: provider as any });
  }
  const simulateProvider = getProvider(rpc)!;

  const fullTxn = {
    from: from || viem.zeroAddress,
    to: to || viem.zeroAddress,
    data,
    value,
    // set the gas limit very high to make sure the txn does not try to estimate
    gasLimit: 10000000,
  };

  debug('full txn to execute', fullTxn);

  // now we should be able to run the transaction. force it through
  let txnHash: viem.Hash;
  try {
    const signer = (fullTxn.from || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266') as viem.Address;
    if (fullTxn.from) {
      await simulateProvider.impersonateAccount({ address: fullTxn.from });
      await simulateProvider.setBalance({ address: fullTxn.from, value: viem.parseEther('10000') });
    }

    console.log(gray('Simulating transaction (be patient! this could take a while...)'));
    const pushedTxn = await simulateProvider.sendTransaction({ account: signer, chain: simulateProvider.chain, ...fullTxn });

    try {
      await simulateProvider.waitForTransactionReceipt({ hash: pushedTxn });
    } catch {
      // intentionally empty
    }
    txnHash = pushedTxn;
  } catch (err: any) {
    throw new Error(`failed to simulate txn: ${err.toString()}`);
  }

  // once we have forced through the transaction, call `trace_transaction`
  const traces: TraceEntry[] = await simulateProvider.request({ method: 'trace_transaction' as any, params: [txnHash] });

  if (!json) {
    const traceText = renderTrace(artifacts, traces);

    console.log(traceText);

    const receipt = await simulateProvider.getTransactionReceipt({ hash: txnHash });
    const totalGasUsed = computeGasUsed(traces, fullTxn).toLocaleString();
    console.log();
    if (receipt.status == 'success') {
      console.log(
        green(
          bold(
            `Transaction completes successfully with return value: ${
              traces[0].result?.output ?? 'unknown'
            } (${totalGasUsed} gas)`
          )
        )
      );
    } else {
      console.log(
        red(bold(`Transaction completes with error: ${traces[0].result?.output ?? 'unknown'} (${totalGasUsed} gas)`))
      );
    }
  } else {
    console.log(JSON.stringify(traces, null, 2));
  }
}

function computeGasUsed(traces: TraceEntry[], txn: viem.TransactionRequest): number {
  // total gas required for the transaction is whatever was used by the actual txn
  // + 21000 (base transaction cost)
  // + cost of the txn calldata
  const txnData = viem.hexToBytes(txn.data || '0x');
  const zeroDataCount = txnData.filter((d) => d === 0).length;
  const nonZeroDataCount = txnData.length - zeroDataCount;
  return parseInt(traces[0].result?.gasUsed ?? '0') + 21000 + 4 * zeroDataCount + 16 * nonZeroDataCount;
}
