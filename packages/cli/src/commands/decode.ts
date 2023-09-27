import { ContractData, DeploymentInfo, decodeTxError } from '@usecannon/builder';
import { ethers } from 'ethers';
import { bold, gray, green, italic, yellow } from 'chalk';
import { readDeployRecursive } from '../package';

import { PackageReference } from '@usecannon/builder/dist/package';

export async function decode({
  packageRef,
  data,
  chainId,
  presetArg,
  json = false,
}: {
  packageRef: string;
  data: string[];
  chainId: number;
  presetArg: string;
  json: boolean;
}) {
  const { preset, basePackageRef } = new PackageReference(packageRef);

  if (!data[0].startsWith('0x')) {
    data[0] = data[0].replace(/^/, '0x');
  }

  if (presetArg && preset) {
    console.warn(
      yellow(
        bold(`Duplicate preset definitions in package reference "${packageRef}" and in --preset argument: "${presetArg}"`)
      )
    );
    console.warn(yellow(bold(`The --preset option is deprecated. Defaulting to package reference "${preset}"...`)));
  }

  const selectedPreset = preset || presetArg || 'main';

  const deployInfos = await readDeployRecursive(basePackageRef, chainId, selectedPreset);

  const abis = deployInfos.flatMap((deployData) => _getAbis(deployData));
  const tx = _parseData(abis, data);

  if (!tx) {
    const errorMessage = decodeTxError(data[0], abis);
    if (errorMessage) {
      console.log(errorMessage);
      return;
    }
    throw new Error('Could not decode transaction data');
  }

  const fragment = _getFragment(tx);

  if (json || !fragment) {
    return console.log(JSON.stringify(tx, null, 2));
  }

  console.log();
  console.log(green(`${fragment.format('full')}`), `${'sighash' in tx ? italic(gray(tx.sighash)) : ''}`);

  if ('errorFragment' in tx) {
    const errorMessage = decodeTxError(data[0], abis);
    if (errorMessage) {
      console.log(errorMessage);
      return;
    }
  }

  const renderParam = (prefix: string, input: ethers.utils.ParamType) =>
    `${prefix}${gray(input.format())} ${bold(input.name)}`;

  const renderArgs = (input: ethers.utils.ParamType, value: ethers.utils.Result, p = '  ') => {
    if (Array.isArray(input)) {
      if (input.length !== value.length) throw new Error('input and value length mismatch');

      for (let i = 0; i < input.length; i++) {
        renderArgs(input[i], value[i], p);
      }
    } else if (input.baseType === 'array') {
      console.log(renderParam(p, input));
      for (let i = 0; i < value.length; i++) {
        if (input.arrayChildren.baseType === 'array') {
          console.log(`${p.repeat(2)}[${i}]`);
          renderArgs(input.arrayChildren, value[i], p.repeat(3));
        } else if (input.arrayChildren.baseType === 'tuple') {
          renderArgs(input.arrayChildren.components[i], value[i], p.repeat(2));
        } else {
          console.log(`${p.repeat(2)}${gray(`[${i}]`)}`, _renderValue(input.arrayChildren, value[i] as any));
        }
      }
    } else {
      console.log(renderParam(p, input), _renderValue(input, value as any));
    }
  };

  for (let index = 0; index < tx.args.length; index++) {
    renderArgs(fragment.inputs[index], tx.args[index]);
  }

  console.log();
}

function _getAbis(deployData: DeploymentInfo) {
  return Object.values(deployData.state)
    .flatMap((step) => Object.values(step.artifacts?.contracts || {}))
    .map((artifact) => artifact.abi);
}

function _renderValue(type: ethers.utils.ParamType, value: string | ethers.BigNumber) {
  switch (true) {
    case ethers.BigNumber.isBigNumber(value):
      return value.toString();
    case type.type === 'address':
      return value;
    case type.type === 'bytes32':
      try {
        return ethers.utils.parseBytes32String(value as string);
      } catch (err) {
        if (process.env.TRACE === 'true') {
          console.error(err);
        }
      }
      return `"${value}"`;
    default:
      return `"${value}"`;
  }
}

function _parseData(abis: ContractData['abi'][], data: string[]) {
  if (data.length === 0) return null;

  for (const abi of abis) {
    const iface = new ethers.utils.Interface(abi as string[]);

    const result =
      _try(() => iface.parseError(data[0])) ||
      _try(() => iface.parseTransaction({ data: data[0] })) ||
      _try(() => iface.parseLog({ topics: data.slice(0, -1), data: data[data.length - 1] }));

    if (result) return result;
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

function _getFragment(value: ReturnType<typeof _parseData>) {
  if (!value) return null;
  return 'functionFragment' in value
    ? value.functionFragment
    : 'errorFragment' in value
    ? value.errorFragment
    : 'eventFragment' in value
    ? value.eventFragment
    : null;
}
