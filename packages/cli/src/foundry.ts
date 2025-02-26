import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { ContractArtifact } from '@usecannon/builder';
import _ from 'lodash';
import Debug from 'debug';

import { execPromise } from './helpers';
import { warn } from './util/console';

const debug = Debug('cannon:cli:foundry');

interface FoundryOpts {
  src: string;
  test: string;
  script: string;
  out: string;
  evm_version: string;
}

export async function getFoundryOpts(): Promise<FoundryOpts> {
  return JSON.parse(
    await _.memoize(
      () => execPromise('forge config --json'),
      () => '',
    )(),
  );
}

export async function buildContracts(): Promise<void> {
  await execPromise('forge build');
}

export async function getFoundryArtifact(name: string, baseDir = '', includeSourceCode = true): Promise<ContractArtifact> {
  const foundryOpts = await getFoundryOpts();

  const splitName = name.split(':');
  const inputContractName = _.last(splitName)!;
  const inputSourceName = splitName.length > 1 ? splitName[0] : '';

  // Finds root of the foundry project based n owhere the foundry.toml file is within the relative path
  // Linear time complexity O(n) where n is the depth of the directory structure from the initial currentPath to the project root.
  function findProjectRoot(currentPath: string): string {
    const markerFile = 'foundry.toml';

    // append 'foundry.toml' to filepath
    const filePath = path.join(currentPath, markerFile);

    // If filepath exists it means we're already at root of the project
    // so just return currentPath
    if (fs.existsSync(filePath)) {
      return currentPath;
    }

    // Reached the filesystem root without finding the marker file
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      warn('Could not find foundry project, make sure your cannonfiles are stored within the root of a foundry project.');
      return parentPath;
    }

    //Otherwise loop
    return findProjectRoot(parentPath);
  }

  baseDir = findProjectRoot(baseDir);

  const outPath = path.join(baseDir, foundryOpts.out);

  const possibleArtifactPaths = await glob(outPath + `/**/${inputContractName}.json`);

  const possibleArtifacts = [];
  for (const artifactPath of possibleArtifactPaths) {
    const artifactBuffer = await fs.readFile(artifactPath);
    possibleArtifacts.push(JSON.parse(artifactBuffer.toString()) as any);
  }

  if (!possibleArtifacts.length) {
    throw new Error(`no contract was found by name: ${inputContractName} (from ${name})`);
  }

  let artifact = possibleArtifacts[0];
  const sourceNames = possibleArtifacts.map((v) => v.ast?.absolutePath ?? '').filter((v) => v);
  if (sourceNames.length > 1) {
    if (!inputSourceName) {
      throw new Error(
        `more than one contract was found with the name ${inputContractName}. Please tell us which file for the contract to use:\n${sourceNames
          .map((v) => `${v}:${inputContractName}`)
          .join('\n')}`,
      );
    }

    const matchingArtifact = possibleArtifacts.find((v) => v.ast.absolutePath == inputSourceName);
    if (!matchingArtifact) {
      throw new Error(
        `no artifact was found at the given source name "${inputSourceName}". Should be one of:\n${sourceNames.join('\n')}`,
      );
    }

    artifact = matchingArtifact;
  }

  // if source code is not included, we can skip here for a massive speed boost by not executing the inspect commands
  if (includeSourceCode) {
    // save build metadata
    const evmVersionInfo = foundryOpts.evm_version;

    debug('detected foundry info', artifact.metadata);
    debug('evm version', evmVersionInfo);

    const solcVersion = artifact.metadata.compiler.version;
    const sources = _.mapValues(artifact.metadata.sources, (v, sourcePath) => {
      return {
        content: fs.readFileSync(path.join(baseDir, sourcePath)).toString(),
      };
    });

    const source = {
      solcVersion,
      input: JSON.stringify({
        language: 'Solidity',
        sources,
        settings: {
          optimizer: artifact.metadata.settings.optimizer,
          evmVersion: evmVersionInfo,
          remappings: artifact.metadata.settings.remappings,
          outputSelection: {
            '*': {
              '*': ['*'],
            },
          },
        },
      }),
    };

    return {
      contractName: inputContractName,
      sourceName: artifact.ast.absolutePath,
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      deployedBytecode: artifact.deployedBytecode.object,
      linkReferences: artifact.bytecode.linkReferences,
      source,
    };
  }

  return {
    contractName: inputContractName,
    sourceName: artifact.ast.absolutePath,
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    deployedBytecode: artifact.deployedBytecode.object,
    linkReferences: artifact.bytecode.linkReferences,
  };
}
