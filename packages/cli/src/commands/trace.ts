import _ from 'lodash';
import { ethers } from 'ethers';
import { gray, yellow } from 'chalk';
import { readDeployRecursive } from '../package';
import { resolveWriteProvider } from '../util/provider';
import { resolveCliSettings } from '../settings';

import { runRpc, getProvider } from '../rpc';
import { getArtifacts, renderTrace, findContract, ChainDefinition, ChainArtifacts } from '@usecannon/builder';

import Debug from 'debug';

const debug = Debug('cannon:cli:trace');

export async function trace({
  packageName,
  data,
  chainId,
  preset,
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
  from?: string;
  to?: string;
  block?: ethers.BigNumberish;
  value?: ethers.BigNumberish;
  json: boolean;
}) {
  const cliSettings = resolveCliSettings();
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
    console.log();
    _.merge(artifacts, getArtifacts(new ChainDefinition(di.def), di.state));
  }

  // get transaction data from the provider
  const { provider } = await resolveWriteProvider(cliSettings, chainId);

  if (data.length == 66) {
    const txHash = data;

    const txData = await provider.getTransaction(txHash);
    const txReceipt = await provider.getTransactionReceipt(txHash);

    // this is a transaction hash
    console.log(gray('Detected transaction hash'));

    data = txData.data;
    value = value || txData.value;
    block = txReceipt.blockNumber;
    from = from || txData.from;
    to = to || txData.to;
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
    const timestamp = (await provider.getBlock(ethers.BigNumber.from(block).toNumber())).timestamp - 1;
    rpc = await runRpc({ port: 0, forkProvider: provider as any, forkBlockNumber: block, timestamp });
  } else {
    rpc = await runRpc({ port: 0, forkProvider: provider as any });
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
  const traces = await simulateProvider.send('trace_transaction', [txnHash]);

  if (!json) {
    const traceText = renderTrace(artifacts, traces);

    console.log(traceText);
  } else {
    console.log(JSON.stringify(traces, null, 2));
  }
}
