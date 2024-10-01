import * as viem from 'viem';
import { AbiFunction, AbiEvent } from 'abitype';
import { bold, gray, green, italic } from 'chalk';
import { ContractData, DeploymentInfo, decodeTxError } from '@usecannon/builder';

import { log, error } from '../util/console';
import { readDeployRecursive } from '../package';
import { ensureChainIdConsistency, formatAbiFunction, getSighash } from '../helpers';
import { resolveCliSettings } from '../../src/settings';
import { isTxHash } from '../util/is-tx-hash';
import { getChainIdFromRpcUrl, isURL, ProviderAction, resolveProvider } from '../util/provider';

export async function decode({
  packageRef,
  data,
  chainId,
  rpcUrl,
  json = false,
}: {
  packageRef: string;
  data: viem.Hash;
  chainId?: number;
  rpcUrl?: string;
  json: boolean;
}) {
  const cliSettings = resolveCliSettings();

  // Add 0x prefix to data or transaction hash if missing
  if (!data.startsWith('0x')) {
    data = ('0x' + data) as viem.Hash;
  }

  let inputData = data;

  if (isTxHash(data)) {
    if (!chainId && rpcUrl && isURL(rpcUrl)) {
      chainId = await getChainIdFromRpcUrl(rpcUrl);
    } else {
      if (!chainId) throw new Error('--chain-id or --rpc-url is required to decode transaction data');
    }

    await ensureChainIdConsistency(rpcUrl, chainId);

    const { provider } = await resolveProvider({ action: ProviderAction.ReadProvider, quiet: true, cliSettings, chainId });

    const tx = await provider.getTransaction({
      hash: data,
    });

    inputData = tx.input;

    log('     RPC: ', provider.transport.url);
    log('Chain ID: ', tx.chainId);
    log(' TX hash: ', tx.hash);
    if (tx.from) log('    From: ', tx.from);
    if (tx.to) log('      To: ', tx.to);
    if (tx.value) log('   Value: ', tx.value);
    log();
  }

  const deployInfos = await readDeployRecursive(packageRef, chainId!);

  const abis = deployInfos.flatMap((deployData) => _getAbis(deployData));

  const parsed = _parseData(abis, inputData);

  if (!parsed) {
    const errorMessage = decodeTxError(inputData, abis);
    if (errorMessage) {
      log(errorMessage);
      return;
    }
    throw new Error('Could not decode transaction data with the given Cannon package');
  }

  const fragment = viem.getAbiItem({
    abi: parsed.abi,
    args: (parsed.result as any).args,
    name:
      (parsed.result as viem.EncodeFunctionDataParameters).functionName ||
      (parsed.result as viem.DecodeErrorResultReturnType).errorName ||
      (parsed.result as viem.EncodeEventTopicsParameters).eventName ||
      '',
  });

  if (json || !fragment) {
    return log(JSON.stringify(parsed.result, null, 2));
  }

  const sighash = getSighash(fragment as AbiFunction | AbiEvent);

  log(green(`${formatAbiFunction(fragment as any)}`), `${sighash ? italic(gray(sighash)) : ''}`);

  if ((parsed.result as viem.DecodeErrorResultReturnType).errorName) {
    const errorMessage = decodeTxError(inputData, abis);
    if (errorMessage) {
      log(errorMessage);
      return;
    }
  }

  const renderParam = (prefix: string, input: viem.AbiParameter) => `${prefix}${gray(input.type)} ${bold(input.name)}`;

  const renderArgs = (input: viem.AbiParameter, value: any, offset = '  ') => {
    switch (true) {
      case input.type.startsWith('tuple'): {
        // e.g. tuple, tuple[]
        log(renderParam(offset, input));
        // @ts-ignore: TODO - figure out how to type this
        const components = input.components;
        const values = input.type.endsWith('[]') ? value.map(Object.values) : [value];
        for (const v of values) {
          for (let i = 0; i < components.length; i++) {
            renderArgs(
              {
                ...components[i],
                name: `${components[i].name}`,
              },
              v[`${components[i].name}`] ? v[`${components[i].name}`] : v[i],
              offset.repeat(2)
            );
          }
        }
        break;
      }

      case input.type.endsWith('[]'): {
        //e.g. uint256[], bool[], bytes[], bytes8[], bytes32[], etc
        log(renderParam(offset, input));
        for (let i = 0; i < value.length; i++) {
          renderArgs(
            {
              name: `[${i}]`,
              internalType: input.internalType?.replace('[]', ''),
              type: input.type?.replace('[]', ''),
            },
            value[i],
            offset.repeat(2)
          );
        }
        break;
      }

      default: {
        log(renderParam(offset, input), _renderValue(input, value));
      }
    }
  };

  if (parsed.result.args) {
    for (let index = 0; index < parsed.result.args.length; index++) {
      renderArgs((fragment as viem.AbiFunction).inputs[index], parsed.result.args[index]);
    }
  }
}

function _getAbis(deployData: DeploymentInfo) {
  return Object.values(deployData.state)
    .flatMap((step) => Object.values(step.artifacts?.contracts || {}))
    .map((artifact) => artifact.abi);
}

function _renderValue(type: viem.AbiParameter, value: string | bigint) {
  switch (true) {
    case typeof value == 'bigint':
      return value.toString();

    case type.type === 'address':
      return viem.getAddress(value as string);
    case type.type == 'bool':
      return typeof value == 'string' && value.startsWith('0x') ? viem.hexToBool(value as viem.Hex) : value;

    case type.type.startsWith('bytes'):
      try {
        const decodedBytes32 = viem.hexToString(value as viem.Hex, { size: 32 });

        // Check for characters outside the ASCII range (0-127)
        // in case the bytes32 value isnt meant to be converted (e.g an identifier)
        if (/[\u0080-\uFFFF]/.test(decodedBytes32)) {
          return `${value}`;
        }

        return decodedBytes32;
      } catch (err) {
        const settings = resolveCliSettings();
        if (settings.trace) {
          error(err);
        }
      }

      return `"${value}"`;
    default:
      return `"${value}"`;
  }
}

function _parseData(abis: ContractData['abi'][], data: viem.Hash) {
  if (!data) return null;

  for (const abi of abis) {
    const result =
      _try(() => viem.decodeErrorResult({ abi, data: data })) ||
      _try(() => viem.decodeFunctionData({ abi, data: data })) ||
      _try(() =>
        viem.decodeEventLog({
          abi,
          topics: [data] as [viem.Hex],
          data,
        })
      );

    if (result) return { abi, result };
  }

  return null;
}

function _try<T extends (...args: any) => any>(fn: T): ReturnType<T> | null {
  try {
    return fn();
  } catch (err) {
    return null;
  }
}
