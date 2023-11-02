import _ from 'lodash';
import { ethers } from 'ethers';
import { gray, yellow, green, red, bold } from 'chalk';
import { readDeployRecursive } from '../package';
import { resolveWriteProvider } from '../util/provider';
import { resolveCliSettings } from '../settings';

import { runRpc, getProvider } from '../rpc';
import { getArtifacts, renderTrace, findContract, ChainDefinition, ChainArtifacts, TraceEntry } from '@usecannon/builder';

import Debug from 'debug';

const debug = Debug('cannon:cli:trace');

export async function trace({
  packageName,
  data,
  chainId,
  preset,
  providerUrl,
  from,
  to,
  value,
  block,
  json = false,
}: {
  packageName: string;
  data: string;
  chainId: number;
  preset: string;
  providerUrl: string;
  from?: string;
  to?: string;
  block?: string;
  value?: ethers.BigNumberish;
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
  const deployInfos = await readDeployRecursive(packageName, chainId, preset);

  const artifacts: ChainArtifacts = {};

  for (const di of deployInfos) {
    _.merge(artifacts, getArtifacts(new ChainDefinition(di.def), di.state));
  }

  // get transaction data from the provider
  const { provider } = await resolveWriteProvider(cliSettings, chainId);

  if (data.length == 66) {
    const txHash = data;

    try {
      const txData = await provider.getTransaction(txHash);
      const txReceipt = await provider.getTransactionReceipt(txHash);

      // this is a transaction hash
      console.log(gray('Detected transaction hash'));

      data = txData.data;
      value = value || txData.value;
      block = block || txReceipt.blockNumber.toString();
      from = from || txData.from;
      to = to || txData.to;
    } catch (err) {
      throw new Error('could not get transaction information. The transaction may not exist?');
    }
  } else if (!to) {
    const r = findContract(artifacts, ({ address, abi }) => {
      try {
        new ethers.Contract(address, abi).interface.parseTransaction({ data, value });
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
    const blockInfo = await provider.getBlock((block || 'latest').match(/^[0-9]*$/) ? parseInt(block) : block);
    const timestamp = blockInfo.timestamp - 1;
    rpc = await runRpc(
      { port: 0, forkBlockNumber: !block || block === 'latest' ? undefined : (blockInfo.number - 1).toString(), timestamp },
      { forkProvider: provider as any }
    );
  } else {
    rpc = await runRpc({ port: 0 }, { forkProvider: provider as any });
  }
  const simulateProvider = getProvider(rpc);

  const fullTxn = {
    from,
    to,
    data,
    value,
    // set the gas limit very high to make sure the txn does not try to estimate
    gasLimit: 10000000,
  };

  debug('full txn to execute', fullTxn);

  // now we should be able to run the transaction. force it through
  let txnHash: string;
  try {
    let signer = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    if (fullTxn.from) {
      await simulateProvider.send('hardhat_impersonateAccount', [fullTxn.from]);
      await simulateProvider.send('hardhat_setBalance', [fullTxn.from, ethers.utils.parseEther('10000').toString()]);
      signer = fullTxn.from;
    }
    console.log(gray('Simulating transaction (be patient! this could take a while...)'));
    const pushedTxn = await simulateProvider.getSigner(signer).sendTransaction(fullTxn);

    try {
      await pushedTxn.wait();
    } catch {
      // intentionally empty
    }
    txnHash = pushedTxn.hash;
  } catch (err: any) {
    throw new Error(`failed to simulate txn: ${err.toString()}`);
  }

  // once we have forced through the transaction, call `trace_transaction`
  const traces: TraceEntry[] = await simulateProvider.send('trace_transaction', [txnHash]);

  if (!json) {
    const traceText = renderTrace(artifacts, traces);

    console.log(traceText);

    const receipt = await simulateProvider.getTransactionReceipt(txnHash);
    const totalGasUsed = computeGasUsed(traces, fullTxn).toLocaleString();
    console.log();
    if (receipt.status == 1) {
      console.log(
        green(bold(`Transaction completes successfully with return value: ${traces[0].result.output} (${totalGasUsed} gas)`))
      );
    } else {
      console.log(red(bold(`Transaction completes with error: ${traces[0].result.output} (${totalGasUsed} gas)`)));
    }
  } else {
    console.log(JSON.stringify(traces, null, 2));
  }
}

function computeGasUsed(traces: TraceEntry[], txn: ethers.providers.TransactionRequest): number {
  // total gas required for the transaction is whatever was used by the actual txn
  // + 21000 (base transaction cost)
  // + cost of the txn calldata
  const txnData = ethers.utils.arrayify(txn.data || '0x');
  const zeroDataCount = txnData.filter((d) => d === 0).length;
  const nonZeroDataCount = txnData.length - zeroDataCount;
  return parseInt(traces[0].result.gasUsed) + 21000 + 4 * zeroDataCount + 16 * nonZeroDataCount;
}
