import { EOL } from 'node:os';
import { Transform } from 'node:stream';

import _ from 'lodash';
import { AbiItem, getAddress, isAddress } from 'viem';

function formatSolidityConstructorArg(
  inputType: { name: string; type: string; internalType: string } | undefined,
  arg: string | string[]
): [string, string[]] {
  if (inputType && (inputType.type === 'string' || inputType.type === 'bytes')) {
    return [`"${arg}"`, []];
  } else if (
    (inputType && inputType.internalType === 'address') ||
    (!inputType && typeof arg === 'string' && isAddress(arg))
  ) {
    return [`${getAddress(arg as string)}`, []];
  } else if (inputType && inputType.internalType.endsWith('[]')) {
    const typeName = _.last(inputType.internalType.split(' '));
    const args = arg as string[];
    const priorLines = [`${typeName} memory tmparray${inputType.name} = new ${typeName}(${args.length});`];
    for (let i = 0; i < args.length; i++) {
      // TODO: recurse
      priorLines.push(`tmparray${inputType.name}[${i}] = ${args[i]};`);
    }

    return [`tmparray${inputType.name}`, priorLines];
  } else if (inputType && inputType.internalType) {
    return [`${_.last(inputType.internalType.split(' '))}(  ${arg})`, []];
  }
  return [arg as string, []];
}

/**
 * This script is used to deploy contracts using Forge.
 * It outputs a solidity script that can be used to deploy contracts and execute transactions.
 * Note: Make sure you add `.sol` extension to the output file.
 */

const footer = `
    }
}
`;

export const createRenderer = (blockNumber: number) => {
  const lines: string[] = [];
  const imports: Set<string> = new Set();

  return new Transform({
    objectMode: true,
    construct(cb) {
      return cb();
    },
    transform(line, _, cb) {
      const title = `[${line.type}.${line.label}]`;
      const indent = '    '.repeat(2);

      if (!line.result) {
        // Logging non-transaction steps
        lines.push(`${indent}// no on-chain transactions required\n`);
      } else {
        // Loggin txn types
        for (const c in line.result.contracts) {
          const fullContractPath = [...line.cloneNames, c].join('.');
          lines.push(`${indent}// > CONTRACT DEPLOYED: ${line.result.contracts[c].address}\n`);
          lines.push(
            `${indent}addresses[keccak256("${fullContractPath}")] = address(${getAddress(
              line.result.contracts[c].address
            )});\n`
          );
          lines.push(`${indent}vm.label(${getAddress(line.result.contracts[c].address)}, "${fullContractPath}");\n`);
        }

        for (const t in line.result.txns) {
          lines.push(`${indent}// > TRANSACTION EXECUTED: ${Object.keys(line.result.txns[t].events).join(', ')}\n`);
        }

        for (const s in line.result.settings) {
          lines.push(
            `${indent}settings[keccak256("${[...line.cloneNames, s].join('.')}")] = "${line.result.settings[s]}";\n`
          );
        }
      }

      for (const { to, from, input, value } of line.txns) {
        if (from) {
          lines.push(`${indent}vm.broadcast(${getAddress(from)});\n`);
          lines.push(`${indent}data = hex"${input.slice(2)}";\n`);
        }

        lines.push('assembly {\n');
        if (!to) {
          lines.push(`${indent}    pop(create(0, add(data, 0x20), ${input.length / 2 - 1}))\n`);
        } else {
          lines.push(`${indent}    pop(call(gas(), ${to}, ${value}, add(data, 0x20), ${input.length / 2 - 1}, 0, 0))\n`);
        }

        lines.push('}\n');
      }

      if (line.cloneNames.length === 0 && (line.type === 'deploy' || line.type === 'contract')) {
        for (const c in line.result?.contracts) {
          if (!line.result.contracts[c].sourceName || !line.result.contracts[c].contractName) {
            lines.push(
              `${indent}// skip etch for this contract because contract name "${line.result.contracts[c].contractName}" and/or source "${line.result.contracts[c].sourceName}" is not provided.`
            );
            continue;
          }

          lines.push(`${indent}{`);

          const constructorAbiResults = line.result.contracts[c].abi.filter((f: AbiItem) => f.type === 'constructor');

          let constructorAbi = { inputs: [], type: 'constructor', stateMutability: 'nonpayable' } as any;
          if (constructorAbiResults.length !== 0) {
            constructorAbi = constructorAbiResults[0];
          }

          // add etch so that if the contract is later modified, the new source code is used
          imports.add(`import "../${line.result.contracts[c].sourceName}";`);

          const constructorArgs = (line.result.contracts[c].constructorArgs ?? []).map((arg: any, i: number) =>
            formatSolidityConstructorArg(constructorAbi.inputs[i], arg)
          );

          for (const a of constructorArgs) {
            lines.push(a[1].map((v: string) => `${indent}${indent}${v}`).join('\n'));
          }

          lines.push(
            `${indent}${indent}tmp = address(new ${line.result.contracts[c].contractName}(${constructorArgs
              // TODO: why do we need a type here
              .map((a: [string, string[]]) => a[0])
              .join(',')}));\n`
          );
          lines.push(`${indent}${indent}vm.etch(${getAddress(line.result.contracts[c].address)}, tmp.code);\n`);

          lines.push(`${indent}}`);
        }
      }

      lines.push(`${indent}// ${line.phase === 'pre' ? 'START' : 'END'} ${title}${EOL}`);

      if (line.phase === 'post') {
        lines.push(EOL);
      }

      return cb();
    },
    flush(cb) {
      const header = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";

${Array.from(imports).join('\n')}

/**
 * @notice The following script is automatically generated by https://usecannon.com
 */
contract CannonDeploy is Script {
    uint256 public deployBlockNumber = ${blockNumber};
    mapping(bytes32 => address) public addresses;
    mapping(bytes32 => string) public settings;

    function getAddress(string memory label) external returns (address) {
        return addresses[keccak256(bytes(label))];
    }

    function getSetting(string memory label) external returns (string memory) {
        return settings[keccak256(bytes(label))];
    }

    function run() external {
        bytes memory data;
        address tmp;
      `;

      this.push(header);
      this.push(lines.join('\n'));
      this.push(footer);
      return cb();
    },
  });
};
