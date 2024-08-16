import * as viem from 'viem';
import { AbiFunction, AbiEvent } from 'abitype';
import { bold, gray, green, italic, yellow } from 'chalk';
import { ContractData, DeploymentInfo, decodeTxError } from '@usecannon/builder';

import { log, error, warn } from '../util/console';
import { readDeployRecursive } from '../package';
import { formatAbiFunction, getSighash } from '../helpers';
import { resolveCliSettings } from '../../src/settings';

export async function decode({
  packageRef,
  data,
  chainId,
  presetArg,
  json = false,
}: {
  packageRef: string;
  data: viem.Hash[];
  chainId: number;
  presetArg: string;
  json: boolean;
}) {
  if (!data[0].startsWith('0x')) {
    data[0] = ('0x' + data[0]) as viem.Hash;
  }

  // Handle deprecated preset specification
  if (presetArg) {
    warn(
      yellow(
        bold(
          'The --preset option will be deprecated soon. Reference presets in the package reference using the format name:version@preset'
        )
      )
    );
    packageRef = packageRef.split('@')[0] + `@${presetArg}`;
  }

  const deployInfos = await readDeployRecursive(packageRef, chainId);

  const abis = deployInfos.flatMap((deployData) => _getAbis(deployData));
  const parsed = _parseData(abis, data);

  if (!parsed) {
    const errorMessage = decodeTxError(data[0], abis);
    if (errorMessage) {
      log(errorMessage);
      return;
    }
    throw new Error('Could not decode transaction data');
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

  log();
  log(green(`${formatAbiFunction(fragment as any)}`), `${sighash ? italic(gray(sighash)) : ''}`);

  if ((parsed.result as viem.DecodeErrorResultReturnType).errorName) {
    const errorMessage = decodeTxError(data[0], abis);
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
              v[`${components[i].name}`],
              offset.repeat(4)
            );
          }
          log();
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

  log();
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
      return viem.getAddress(value);
    case type.type == 'bool':
      return typeof value == 'string' && value.startsWith('0x') ? viem.hexToBool(value as viem.Hex) : value;

    case type.type.startsWith('bytes'):
      try {
        return viem.hexToString(value as viem.Hex, { size: 32 });
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

function _parseData(abis: ContractData['abi'][], data: viem.Hash[]) {
  if (data.length === 0) return null;

  for (const abi of abis) {
    const result =
      _try(() => viem.decodeErrorResult({ abi, data: data[0] })) ||
      _try(() => viem.decodeFunctionData({ abi, data: data[0] })) ||
      _try(() =>
        viem.decodeEventLog({
          abi,
          topics: (data.length > 1 ? data.slice(0, -1) : data) as [viem.Hex],
          data: data.length > 1 ? data[data.length - 1] : '0x',
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
