import { ContractData, DeploymentInfo, decodeTxError } from '@usecannon/builder';
import viem from 'viem';
import { resolveCliSettings } from '../../src/settings';
import { bold, gray, green, italic, yellow } from 'chalk';
import { readDeployRecursive } from '../package';

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
    data[0] = '0x' + data[0] as viem.Hash;
  }

  // Handle deprecated preset specification
  if (presetArg) {
    console.warn(
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
      console.log(errorMessage);
      return;
    }
    throw new Error('Could not decode transaction data');
  }

  const fragment = viem.getAbiItem({
    abi: parsed.abi,
    name: (parsed.result as viem.EncodeFunctionDataParameters).functionName ||
          (parsed.result as viem.DecodeErrorResultReturnType).errorName ||
          (parsed.result as viem.EncodeEventTopicsParameters).eventName ||
    ''
  });

  if (json || !fragment) {
    return console.log(JSON.stringify(parsed.result, null, 2));
  }

  console.log();
  // TODO: can we format the fragment name? is it possible?
  console.log(green(`${(fragment as any).name}`), `${'sighash' in parsed.result ? italic(gray(parsed.result.sighash)) : ''}`);

  if ((parsed.result as viem.DecodeErrorResultReturnType).errorName) {
    const errorMessage = decodeTxError(data[0], abis);
    if (errorMessage) {
      console.log(errorMessage);
      return;
    }
  }

  const renderParam = (prefix: string, input: viem.AbiParameter) =>
    `${prefix}${gray(input.type)} ${bold(input.name)}`;

  const renderArgs = (input: viem.AbiParameter, value: any, p = '  ') => {
    if (Array.isArray(input)) {
      if (input.length !== value.length) throw new Error('input and value length mismatch');

      for (let i = 0; i < input.length; i++) {
        renderArgs(input[i], value[i], p);
      }
    } else if (input.type === 'array') {
      console.log(renderParam(p, input));
      for (let i = 0; i < value.length; i++) {
        if ((input as any).arrayChildren.baseType === 'array') {
          console.log(`${p.repeat(2)}[${i}]`);
          renderArgs((input as any).arrayChildren, value[i], p.repeat(3));
        } else if ((input as any).arrayChildren.baseType === 'tuple') {
          renderArgs((input as any).arrayChildren.components[i], value[i], p.repeat(2));
        } else {
          console.log(`${p.repeat(2)}${gray(`[${i}]`)}`, _renderValue((input as any).arrayChildren, value[i] as any));
        }
      }
    } else {
      console.log(renderParam(p, input), _renderValue(input, value as any));
    }
  };

  if (parsed.result.args) {
    for (let index = 0; index < parsed.result.args.length; index++) {
      renderArgs((fragment as viem.AbiFunction).inputs[index], parsed.result.args[index]);
    }
  }

  console.log();
}

function _getAbis(deployData: DeploymentInfo) {
  return Object.values(deployData.state)
    .flatMap((step) => Object.values(step.artifacts?.contracts || {}))
    .map((artifact) => artifact.abi);
}

function _renderValue(type: viem.AbiParameter, value: string | BigInt) {
  switch (true) {
    case (typeof value == 'bigint'):
      return value.toString();
    case type.type === 'address':
      return value;
    case type.type === 'bytes32':
      try {
        return viem.stringToHex(value as string);
      } catch (err) {
        const settings = resolveCliSettings();
        if (settings.trace) {
          console.error(err);
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
    //const iface = new ethers.utils.Interface(abi as viem.Abi);

    const result =
      _try(() => viem.decodeErrorResult({ abi, data: data[0] })) ||
      _try(() => viem.decodeFunctionData({ abi, data: data[0] })) ||
      _try(() => viem.decodeEventLog({ abi, topics: (data.length > 1 ? data.slice(0, -1) : data) as [viem.Hex], data: data.length > 1 ? data[data.length - 1] : '0x' }));

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
