import * as viem from 'viem';
import { fetchSolc } from '@usecannon/web-solc';

interface CompileResult {
  sourceName: string;
  contractName: string;
  abi: viem.Abi;
  metadata: string;
  solcVersion: string;
  assembly: string;
  bytecode: string;
  deployedBytecode: string;
  gasEstimates: {
    creation: {
      codeDepositCost: string;
      executionCost: string;
      totalCost: string;
    };
    external: {
      '': string;
    };
  };
}

export async function compileContract(
  contractName: string,
  sourceCode: string,
  evmVersion = 'paris',
  compilerVersion = '0.8.27'
) {
  const { compile, stopWorker } = await fetchSolc(compilerVersion);

  const sourceName = `${contractName}.sol`;

  const input = {
    language: 'Solidity',
    sources: {
      [sourceName]: {
        content: sourceCode,
      },
    },
    settings: {
      outputSelection: {
        '*': { '*': ['*'] },
      },
      evmVersion,
    },
  };

  try {
    const output = await compile(input);

    if (output.errors) {
      throw new Error(
        [
          `There was an error when compiling "${contractName}".`,
          ...output.errors.map((err: { message: string }) => err.message),
        ].join(' ')
      );
    }

    const info = (output.contracts as any)[sourceName][contractName];
    const metadata = JSON.parse(info.metadata);

    const result = {
      contractName,
      sourceName,
      abi: info.abi,
      metadata: info.metadata,
      solcVersion: metadata.compiler.version,
      assembly: info.evm.assembly,
      bytecode: info.evm.bytecode.object,
      deployedBytecode: info.evm.deployedBytecode.object,
      gasEstimates: info.evm.gasEstimates,
    } satisfies CompileResult;

    return { input, output: result };
  } finally {
    stopWorker();
  }
}
