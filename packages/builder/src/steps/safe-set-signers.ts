import Debug from 'debug';
import _ from 'lodash';
import * as viem from 'viem';
import { z } from 'zod';
import { safeSetSignersSchema } from '../schemas';
import { ChainBuilderContext, PackageState, ChainArtifacts, EventMap } from '../types';
import { ChainBuilderRuntime } from '../runtime';
import { encodeFunctionData } from '../util';
import { template } from '../utils/template';
import { CannonAction } from '../actions';

const debug = Debug('cannon:builder:safe-set-signers');

export type Config = z.infer<typeof safeSetSignersSchema>;

const SAFE_ABI = [
  {
    type: 'function',
    name: 'getOwners',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'getThreshold',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'addOwnerWithThreshold',
    inputs: [
      { type: 'address', name: 'owner' },
      { type: 'uint256', name: '_threshold' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'removeOwner',
    inputs: [
      { type: 'address', name: 'prevOwner' },
      { type: 'address', name: 'owner' },
      { type: 'uint256', name: '_threshold' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'swapOwner',
    inputs: [
      { type: 'address', name: 'prevOwner' },
      { type: 'address', name: 'oldOwner' },
      { type: 'address', name: 'newOwner' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'changeThreshold',
    inputs: [{ type: 'uint256', name: '_threshold' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'execTransaction',
    stateMutability: 'payable',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
      { type: 'bytes', name: 'data' },
      { type: 'uint8', name: 'operation' },
      { type: 'uint256', name: 'safeTxGas' },
      { type: 'uint256', name: 'baseGas' },
      { type: 'uint256', name: 'gasPrice' },
      { type: 'address', name: 'gasToken' },
      { type: 'address', name: 'refundReceiver' },
      { type: 'bytes', name: 'signatures' },
    ],
    outputs: [{ type: 'bool', name: 'success' }],
  },
] as const;

const MULTI_SEND_ABI = [
  {
    type: 'function',
    name: 'multiSend',
    inputs: [{ type: 'bytes', name: 'transactions' }],
    outputs: [],
  },
] as const;

const MULTI_SEND_ADDRESS = viem.getAddress('0xA238CBebE9002235B3db6E711818d6D9F36f698e');
const SENTINEL_OWNERS = '0x0000000000000000000000000000000000000001' as viem.Address;

function encodeMultiSend(txs: { to: viem.Address; value: bigint; data: viem.Hex; operation: number }[]): viem.Hex {
  return viem.concat(
    txs.map((tx) => {
      const data = viem.toBytes(tx.data);
      return viem.concat([
        viem.numberToHex(tx.operation, { size: 1 }),
        tx.to,
        viem.numberToHex(tx.value, { size: 32 }),
        viem.numberToHex(data.length, { size: 32 }),
        tx.data,
      ]);
    })
  );
}

const safeSetSignersSpec: CannonAction<Config> = {
  label: 'safe_set_signers',

  validate: safeSetSignersSchema,

  configInject(ctx, config) {
    config = _.cloneDeep(config);
    config.target = template(config.target, ctx);
    config.signers = config.signers.map((s) => template(s, ctx));
    if (config.from) {
      config.from = template(config.from, ctx);
    }
    return config;
  },

  async getState(runtime, ctx, config) {
    const target = config.target as viem.Address;
    if (!viem.isAddress(target)) return null;

    try {
      const owners = (await runtime.provider.readContract({
        address: target,
        abi: SAFE_ABI,
        functionName: 'getOwners',
      })) as viem.Address[];

      const threshold = (await runtime.provider.readContract({
        address: target,
        abi: SAFE_ABI,
        functionName: 'getThreshold',
      })) as bigint;

      return [_.sortBy(owners.map((o: viem.Address) => viem.getAddress(o))), Number(threshold)];
    } catch (err) {
      debug('failed to get safe state', err);
      return null;
    }
  },

  async exec(runtime, ctx, config, packageState): Promise<ChainArtifacts> {
    const target = config.target as viem.Address;
    const desiredSigners = _.sortBy(config.signers.map((s) => viem.getAddress(s)));

    const currentOwners = (await runtime.provider.readContract({
      address: target,
      abi: SAFE_ABI,
      functionName: 'getOwners',
    })) as viem.Address[];

    const currentThresholdBigInt = (await runtime.provider.readContract({
      address: target,
      abi: SAFE_ABI,
      functionName: 'getThreshold',
    })) as bigint;

    const currentThreshold = Number(currentThresholdBigInt);
    const sortedCurrentOwners = _.sortBy(currentOwners.map((o) => viem.getAddress(o)));
    const desiredThreshold = config.threshold ?? currentThreshold;

    if (_.isEqual(sortedCurrentOwners, desiredSigners) && currentThreshold === desiredThreshold) {
      return {};
    }

    const toAdd = _.difference(desiredSigners, sortedCurrentOwners);
    const toRemove = _.difference(sortedCurrentOwners, desiredSigners);

    const calls: { to: viem.Address; value: bigint; data: viem.Hex; operation: number }[] = [];

    // Working copy of owners for computing prevOwner
    const owners = [...currentOwners];
    let simThreshold = currentThreshold;

    const getPrevOwner = (owner: viem.Address) => {
      const idx = owners.findIndex((o) => viem.getAddress(o) === viem.getAddress(owner));
      if (idx === -1) throw new Error(`Owner ${owner} not found in current owners`);
      return idx === 0 ? SENTINEL_OWNERS : viem.getAddress(owners[idx - 1]);
    };

    // Use swapOwner for pairs of (remove, add)
    while (toAdd.length > 0 && toRemove.length > 0) {
      const newOwner = toAdd.shift()!;
      const oldOwner = toRemove.shift()!;
      const prevOwner = getPrevOwner(oldOwner);

      calls.push({
        to: target,
        value: 0n,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'swapOwner',
          args: [prevOwner, oldOwner, newOwner],
        }),
        operation: 0,
      });

      // Update local owners list for subsequent calls
      const idx = owners.findIndex((o) => viem.getAddress(o) === viem.getAddress(oldOwner));
      owners[idx] = newOwner;
    }

    // Add remaining
    while (toAdd.length > 0) {
      const newOwner = toAdd.shift()!;
      // When adding, threshold stays the same, it's always valid as owners.length increases.
      calls.push({
        to: target,
        value: 0n,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'addOwnerWithThreshold',
          args: [newOwner, BigInt(simThreshold)],
        }),
        operation: 0,
      });
      owners.unshift(newOwner);
    }

    // Remove remaining
    while (toRemove.length > 0) {
      const oldOwner = toRemove.shift()!;
      const prevOwner = getPrevOwner(oldOwner);

      // When removing, we must ensure threshold <= new owners length.
      simThreshold = Math.min(simThreshold, owners.length - 1);

      calls.push({
        to: target,
        value: 0n,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'removeOwner',
          args: [prevOwner, oldOwner, BigInt(simThreshold)],
        }),
        operation: 0,
      });

      const idx = owners.findIndex((o) => viem.getAddress(o) === viem.getAddress(oldOwner));
      owners.splice(idx, 1);
    }

    // Finally, adjust threshold if needed
    if (simThreshold !== desiredThreshold) {
      if (owners.length < desiredThreshold) {
        throw new Error(`Cannot set threshold to ${desiredThreshold} with only ${owners.length} signers`);
      }
      calls.push({
        to: target,
        value: 0n,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'changeThreshold',
          args: [BigInt(desiredThreshold)],
        }),
        operation: 0,
      });
      simThreshold = desiredThreshold;
    }

    if (calls.length === 0) {
      return {};
    }

    let txHash: viem.Hex;

    const signer = config.from ? await runtime.getSigner(config.from as viem.Address) : await runtime.getDefaultSigner!({}, '');

    // Signatures for execTransaction (pre-validated signature type 0x1)
    // format: r = address, s = 0, v = 1
    const signature = viem.concat([
      viem.pad(signer.address, { size: 32 }),
      viem.pad(viem.numberToHex(0, { size: 32 }), { size: 32 }),
      viem.numberToHex(1, { size: 1 }),
    ]);

    if (calls.length === 1) {
      const call = calls[0];
      const preparedTxn = await runtime.provider.prepareTransactionRequest({
        account: signer.wallet.account || signer.address,
        to: target,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'execTransaction',
          args: [
            call.to,
            call.value,
            call.data,
            call.operation,
            0n, // safeTxGas
            0n, // baseGas
            0n, // gasPrice
            viem.zeroAddress, // gasToken
            viem.zeroAddress, // refundReceiver
            signature,
          ],
        }),
        chain: null,
      });
      txHash = await signer.wallet.sendTransaction(preparedTxn as any);
    } else {
      // MultiSend
      const multiSendData = encodeFunctionData({
        abi: MULTI_SEND_ABI,
        functionName: 'multiSend',
        args: [encodeMultiSend(calls)],
      });

      const preparedTxn = await runtime.provider.prepareTransactionRequest({
        account: signer.wallet.account || signer.address,
        to: target,
        data: encodeFunctionData({
          abi: SAFE_ABI,
          functionName: 'execTransaction',
          args: [
            MULTI_SEND_ADDRESS,
            0n,
            multiSendData,
            1, // DelegateCall
            0n,
            0n,
            0n,
            viem.zeroAddress,
            viem.zeroAddress,
            signature,
          ],
        }),
        chain: null,
      });
      txHash = await signer.wallet.sendTransaction(preparedTxn as any);
    }

    const receipt = await runtime.provider.waitForTransactionReceipt({ hash: txHash });
    const block = await runtime.provider.getBlock({ blockNumber: receipt.blockNumber });

    return {
      txns: {
        [packageState.currentLabel.split('.')[1]]: {
          hash: txHash,
          blockNumber: receipt.blockNumber.toString(),
          timestamp: block.timestamp.toString(),
          events: {} as EventMap,
          deployedOn: packageState.currentLabel,
          gasUsed: Number(receipt.gasUsed),
          gasCost: receipt.effectiveGasPrice.toString(),
          signer: viem.getAddress(receipt.from),
        },
      },
    };
  },
} satisfies CannonAction<Config>;

export default safeSetSignersSpec;
