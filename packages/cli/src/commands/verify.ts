import axios from 'axios';
import Debug from 'debug';
import * as viem from 'viem';
import { ChainDefinition, getOutputs, ChainBuilderRuntime, DeploymentInfo } from '@usecannon/builder';
import { forPackageTree, PackageReference } from '@usecannon/builder';

import { CliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';
import { createDefaultReadRegistry } from '../registry';

import { getMainLoader } from '../loader';

import { log } from '../util/console';
import { isVerified } from '../util/verify';

const debug = Debug('cannon:cli:verify');

export async function verify(packageRef: string, cliSettings: CliSettings, chainId: number) {
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

  const etherscanApi = cliSettings.etherscanApiUrl || 'https://api.etherscan.io/v2/api';

  if (!etherscanApi) {
    throw new Error(
      `couldn't find etherscan api url for network with ${chainId}. Please set your etherscan URL with CANNON_ETHERSCAN_API_URL`
    );
  }

  if (!cliSettings.etherscanApiKey) {
    throw new Error(
      'Etherscan Api Key not supplied. Please set it with --api-key or CANNON_ETHERSCAN_API_KEY environment variable'
    );
  }

  const guids: { [c: string]: string } = {};

  const verifiedAddresses = new Set<string>();

  const verifyPackage = async (deployData: DeploymentInfo) => {
    const miscData = await runtime.readBlob(deployData.miscUrl);

    debug('misc data', miscData);

    const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error('No chain outputs found. Has the requested chain already been built?');
    }

    for (const c in outputs.contracts) {
      const contractInfo = outputs.contracts[c];

      // simple safeguard to ensure we dont keep trying to verify the same contract multiple times
      if (verifiedAddresses.has(contractInfo.address)) {
        continue;
      } else {
        verifiedAddresses.add(contractInfo.address);
      }

      // contracts can either be imported by just their name, or by a full path.
      // technically it may be more correct to just load by the actual name of the `artifact` property used, but that is complicated
      debug('finding contract:', contractInfo.sourceName, contractInfo.contractName);
      debug('available artifacts', Object.keys(miscData.artifacts));
      const contractArtifact =
        miscData.artifacts[contractInfo.contractName] ||
        miscData.artifacts[`${contractInfo.sourceName}:${contractInfo.contractName}`];

      if (!contractArtifact) {
        log(`${c}: cannot verify: no contract artifact found`);
        continue;
      }

      if (!contractArtifact.source) {
        log(`${c}: cannot verify: no source code recorded in deploy data`);
        continue;
      }

      if (await isVerified(contractInfo.address, chainId, etherscanApi, cliSettings.etherscanApiKey)) {
        log(`✅ ${c}: Contract source code already verified`);
        await sleep(500);
        continue;
      }

      try {
        // supply any linked libraries within the inputs since those are calculated at runtime
        const inputData = JSON.parse(contractArtifact.source.input);
        inputData.settings.libraries = contractInfo.linkedLibraries;

        const reqData: { [k: string]: string } = {
          apikey: cliSettings.etherscanApiKey,
          chainid: chainId.toString(),
          module: 'contract',
          action: 'verifysourcecode',
          contractaddress: contractInfo.address,
          // need to parse to get the inner structure, then stringify again
          sourceCode: JSON.stringify(inputData),
          codeformat: 'solidity-standard-json-input',
          contractname: `${contractArtifact.sourceName}:${contractArtifact.contractName}`,
          compilerversion: 'v' + contractArtifact.source.solcVersion,

          // NOTE: below: yes, the etherscan api is misspelling
          constructorArguements: viem
            .encodeAbiParameters(
              contractArtifact.abi.find((i: viem.AbiItem) => i.type === 'constructor')?.inputs ?? [],
              contractInfo.constructorArgs || []
            )
            .slice(2),
        };

        debug('verification request', reqData);

        const res = await axios.post(etherscanApi, reqData, {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });

        if (res.data.status === '0') {
          debug('etherscan failed', res.data);
          log(`${c}:\tcannot verify:`, res.data.result);
        } else {
          log(`${c}:\tsubmitted verification (${contractInfo.address})`);
          guids[c] = res.data.result;
        }
      } catch (err) {
        log(`verification for ${c} (${contractInfo.address}) failed:`, err);
      }

      await sleep(500);
    }

    return {};
  };

  const deployData = await runtime.readDeploy(fullPackageRef, chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${fullPackageRef}. please make sure it exists for the given preset and current network.`
    );
  }

  // go through all the packages and sub packages and make sure all contracts are being verified
  await forPackageTree(runtime, deployData, verifyPackage);

  // at this point, all contracts should have been submitted for verification. so we are just printing status.
  for (const c in guids) {
    for (;;) {
      const res = await axios.post(
        etherscanApi,
        {
          apiKey: cliSettings.etherscanApiKey,
          module: 'contract',
          action: 'checkverifystatus',
          guid: guids[c],
        },
        { headers: { 'content-type': 'application/x-www-form-urlencoded' } }
      );

      if (res.data.status === '0') {
        if (res.data.result === 'Pending in queue') {
          await sleep(1000);
        } else {
          log(`❌ ${c}`, res.data.result);
          log(res.data);
          break;
        }
      } else {
        log(`✅ ${c}`);
        await sleep(500);
        break;
      }
    }
  }

  node.kill();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
