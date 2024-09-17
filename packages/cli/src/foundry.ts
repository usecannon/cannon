import path from 'path';
import fs from 'fs-extra';
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
}

export async function getFoundryOpts(): Promise<FoundryOpts> {
  return JSON.parse(
    await _.memoize(
      () => execPromise('forge config --json'),
      () => ''
    )()
  );
}

export async function buildContracts(): Promise<void> {
  await execPromise('forge build');
}

export async function getFoundryArtifact(name: string, baseDir = '', includeSourceCode = true): Promise<ContractArtifact> {
  // TODO: Theres a bug that if the file has a different name than the contract it would not work
  const foundryOpts = await getFoundryOpts();

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

  const artifactPath = path.join(path.join(baseDir, foundryOpts.out), `${name}.sol`, `${name}.json`);
  const artifactBuffer = await fs.readFile(artifactPath);
  const artifact = JSON.parse(artifactBuffer.toString()) as any;

  // if source code is not included, we can skip here for a massive speed boost by not executing the inspect commands
  if (includeSourceCode) {
    // save build metadata
    const foundryInfo = JSON.parse(
      await execPromise(`forge inspect ${name} metadata  ${baseDir ? `--root ${baseDir}` : ''} --build-info`)
    );

    const evmVersionInfo = JSON.parse(await execPromise('forge config --json')).evm_version;

    debug('detected foundry info', foundryInfo);
    debug('evm version', evmVersionInfo);

    const solcVersion = foundryInfo.compiler.version;
    const sources = _.mapValues(foundryInfo.sources, (v, sourcePath) => {
      return {
        content: fs.readFileSync(path.join(baseDir, sourcePath)).toString(),
      };
    });

    const source = {
      solcVersion: solcVersion,
      input: JSON.stringify({
        language: 'Solidity',
        sources,
        settings: {
          optimizer: foundryInfo.settings.optimizer,
          evmVersion: evmVersionInfo,
          remappings: foundryInfo.settings.remappings,
          outputSelection: {
            '*': {
              '*': ['*'],
            },
          },
        },
      }),
    };

    return {
      contractName: name,
      sourceName: artifact.ast.absolutePath,
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      deployedBytecode: artifact.deployedBytecode.object,
      linkReferences: artifact.bytecode.linkReferences,
      source,
    };
  }

  return {
    contractName: name,
    sourceName: artifact.ast.absolutePath,
    abi: artifact.abi,
    bytecode: artifact.bytecode.object,
    deployedBytecode: artifact.deployedBytecode.object,
    linkReferences: artifact.bytecode.linkReferences,
  };
}
