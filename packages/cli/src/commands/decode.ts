import { ContractData, DeploymentInfo } from '@usecannon/builder';
import { ethers } from 'ethers';
import { bold, gray, green, italic } from 'chalk';
import { readDeployRecursive } from '../package';

export async function decode({
  packageName,
  data,
  chainId,
  preset,
  json = false,
}: {
  packageName: string;
  data: string[];
  chainId: number;
  preset: string;
  json: boolean;
}) {
  const deployInfos = await readDeployRecursive(packageName, chainId, preset);

  const abis = deployInfos.flatMap((deployData) => _getAbis(deployData));
  const tx = _parseData(abis, data);

  if (!tx) {
    throw new Error('Could not decode transaction data');
  }

  const fragment = _getFragment(tx);

  if (json || !fragment) {
    return console.log(JSON.stringify(tx, null, 2));
  }

  console.log();
  console.log(green(`${fragment.format('full')}`), `${'sighash' in tx ? italic(gray(tx.sighash)) : ''}`);

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
  return ethers.BigNumber.isBigNumber(value)
    ? value.toString()
    : type.type === 'address'
    ? value
    : type.type === 'bytes32'
    ? ethers.utils.parseBytes32String(value)
    : `"${value}"`;
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
