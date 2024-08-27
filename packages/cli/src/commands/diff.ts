import Debug from 'debug';
import * as Diff from 'diff';
import * as viem from 'viem';
import { getFoundryArtifact, buildContracts } from '../foundry';
import { bold, yellow } from 'chalk';
import { ChainDefinition, ChainBuilderRuntime, DeploymentInfo, getArtifacts, PackageReference } from '@usecannon/builder';

import { CliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';
import { createDefaultReadRegistry } from '../registry';

import { getMainLoader } from '../loader';

import { log, warn, error } from '../util/console';

const debug = Debug('cannon:cli:diff');

export async function diff(
  packageRef: string,
  cliSettings: CliSettings,
  presetArg: string,
  chainId: number,
  projectDirectory: string,
  matchContract = '',
  matchPath = ''
): Promise<number> {
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

  const { fullPackageRef } = new PackageReference(packageRef);

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node)!;

  const resolver = await createDefaultReadRegistry(cliSettings);

  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId: chainId,
      async getSigner(addr: viem.Address) {
        // on test network any user can be conjured
        return { address: addr, wallet: provider };
      },
      snapshots: false,
      allowPartialDeploy: false,
    },
    resolver,
    getMainLoader(cliSettings)
  );

  const deployData = await runtime.readDeploy(fullPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${fullPackageRef}. please make sure it exists for the given preset and ${chainId} network.`
    );
  }

  // go through all the packages and sub packages and make sure all contracts are being verified
  const foundDiffs = await diffPackage(deployData, runtime, projectDirectory, matchContract, matchPath);

  node.kill();

  return foundDiffs;
}

async function diffPackage(
  deployData: DeploymentInfo,
  runtime: ChainBuilderRuntime,
  contractsDirectory: string,
  matchContract: string,
  matchPath: string
) {
  const miscData = await runtime.readBlob(deployData.miscUrl);

  debug('misc data', miscData);

  const outputs = getArtifacts(new ChainDefinition(deployData.def), deployData.state);

  if (!outputs) {
    throw new Error('No chain outputs found. Has the requested chain already been built?');
  }

  await buildContracts();

  let foundDiffs = 0;
  for (const c in outputs.contracts) {
    if (matchContract && !c.match(new RegExp(matchContract))) {
      debug(`skipping contract ${c}, not matched with ${matchContract}`);
      continue;
    }
    const contractInfo = outputs.contracts[c];

    // contracts can either be imported by just their name, or by a full path.
    // technically it may be more correct to just load by the actual name of the `artifact` property used, but that is complicated
    debug('finding contract:', contractInfo.sourceName, contractInfo.contractName);
    const contractArtifact =
      miscData.artifacts[contractInfo.contractName] ||
      miscData.artifacts[`${contractInfo.sourceName}:${contractInfo.contractName}`];

    if (!contractArtifact) {
      log(`${c}: cannot verify: no contract artifact found`);
      continue;
    }

    if (!contractArtifact.source?.input) {
      log(`${c}: cannot verify: no source code recorded in deploy data`);
      continue;
    }

    let localArtifact;
    try {
      localArtifact = await getFoundryArtifact(
        `${contractInfo.sourceName}:${contractInfo.contractName}`,
        contractsDirectory
      );
    } catch (err) {
      try {
        localArtifact = await getFoundryArtifact(`${contractInfo.contractName}`, contractsDirectory);
      } catch (err) {
        error('❌ ${c}: foundry does not recognize contract artifact for', c);
        foundDiffs++;
        continue;
      }
    }

    // compare the contract artifact sources with those found in the current project directory
    try {
      const { sources } = JSON.parse(contractArtifact.source.input);
      const localSources = JSON.parse(localArtifact.source?.input || '{}').sources;

      for (const source in sources) {
        if (matchPath && !source.match(new RegExp(matchPath))) {
          debug(`skipping source ${source}, not matched with ${matchPath}`);
          continue;
        }

        if (!localSources[source]) {
          log(`❌ ${c}: local artifact does not have ${source}`);
          continue;
        }
        if (localSources[source].content !== sources[source].content) {
          foundDiffs++;
          log(`❌ ${c}: ${source} differs`);
          log(Diff.createPatch(source, localSources[source].content, sources[source].content));
        } else {
          log(`✅ ${c}: ${source} matches`);
        }
      }
    } catch (err) {
      error('could not parse', c, err);
    }
  }

  return foundDiffs;
}
