import path from 'path';
import fs from 'fs-extra';
import { ContractArtifact } from '@usecannon/builder';
import _ from 'lodash';
import { execPromise } from './helpers';

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

export async function getFoundryArtifact(name: string, baseDir = ''): Promise<ContractArtifact> {
  // TODO: Theres a bug that if the file has a different name than the contract it would not work
  const foundryOpts = await getFoundryOpts();

  // Finds root of the foundry project based on where the foundry.toml file is within the relative path
  function findProjectRoot(currentPath: string): string {
    const markerFile = 'foundry.toml';

    // append 'foundry.toml' to filepath
    const filePath = path.join(currentPath, markerFile);
  
    // If filepath exists its already root of the project
    // so just return currentPath
    if (fs.existsSync(filePath)) {
      return currentPath;
    }
  
    const parentPath = path.dirname(currentPath);

    // Reached the filesystem root without finding the marker file
    if (parentPath === currentPath) {
      throw new Error(`Could not find foundry project root in ${currentPath}, please run this command from the root of your foundry project`)
    }
  
    return findProjectRoot(parentPath);
  }

  baseDir = findProjectRoot(baseDir);
  
  const artifactPath = path.join(path.join(baseDir, foundryOpts.out), `${name}.sol`, `${name}.json`);
  const artifactBuffer = await fs.readFile(artifactPath);
  const artifact = JSON.parse(artifactBuffer.toString()) as any;

  // save build metadata
  const foundryInfo = JSON.parse(
    await execPromise(`forge inspect ${name} metadata` + (baseDir ? ` --root ${baseDir}` : ''))
  );

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
