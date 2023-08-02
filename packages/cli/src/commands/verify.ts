import { ChainDefinition, getOutputs, ChainBuilderRuntime, DeploymentInfo } from '@usecannon/builder';
import { ethers } from 'ethers';
import axios from 'axios';
import { getChainDataFromId, setupAnvil } from '../helpers';
import { createDefaultReadRegistry } from '../registry';
import { getProvider, runRpc } from '../rpc';
import { resolveCliSettings } from '../settings';
import Debug from 'debug';
import { forPackageTree } from '@usecannon/builder/dist/package';
import { getMainLoader } from '../loader';

const debug = Debug('cannon:cli:verify');

export async function verify(packageRef: string, apiKey: string, preset: string, chainId: number) {
  await setupAnvil();

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node);

  const settings = resolveCliSettings();

  const resolver = await createDefaultReadRegistry(settings);

  const runtime = new ChainBuilderRuntime(
    {
      provider,
      chainId: chainId,
      async getSigner(addr: string) {
        // on test network any user can be conjured
        await provider.send('hardhat_impersonateAccount', [addr]);
        await provider.send('hardhat_setBalance', [addr, `0x${(1e22).toString(16)}`]);
        return provider.getSigner(addr);
      },
      snapshots: false,
      allowPartialDeploy: false,
    },
    resolver,
    getMainLoader(settings)
  );

  const etherscanApi = settings.etherscanApiUrl || getChainDataFromId(chainId)?.etherscanApi;
  //const etherscanUrl = getChainDataFromId(chainId)?.etherscanUrl; // in case we need it later

  if (!etherscanApi) {
    throw new Error(
      `couldn't find etherscan api url for network with ${chainId}. Please set your etherscan URL with CANNON_ETHERSCAN_API_URL`
    );
  }

  apiKey = apiKey || settings.etherscanApiKey;

  if (!apiKey) {
    throw new Error('etherscan api key not supplied. Please set it with --api-key');
  }

  const guids: { [c: string]: string } = {};

  const verifyPackage = async (deployData: DeploymentInfo) => {
    const miscData = await runtime.readBlob(deployData.miscUrl);

    debug('misc data', miscData);

    const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error('No chain outputs found. Has the requested chain already been built?');
    }

    for (const c in outputs.contracts) {
      const contractInfo = outputs.contracts[c];

      // contracts can either be imported by just their name, or by a full path.
      // technically it may be more correct to just load by the actual name of the `artifact` property used, but that is complicated
      debug('finding contract:', contractInfo.sourceName, contractInfo.contractName);
      const contractArtifact =
        miscData.artifacts[contractInfo.contractName] ||
        miscData.artifacts[`${contractInfo.sourceName}:${contractInfo.contractName}`];

      if (!contractArtifact) {
        console.log(`${c}: cannot verify: no contract artifact found`);
        continue;
      }

      if (!contractArtifact.source) {
        console.log(`${c}: cannot verify: no source code recorded in deploy data`);
        continue;
      }

      try {
        // supply any linked libraries within the inputs since those are calculated at runtime
        const inputData = JSON.parse(contractArtifact.source.input);
        inputData.settings.libraries = contractInfo.linkedLibraries;

        const reqData: { [k: string]: string } = {
          apikey: apiKey,
          module: 'contract',
          action: 'verifysourcecode',
          contractaddress: contractInfo.address,
          // need to parse to get the inner structure, then stringify again
          sourceCode: JSON.stringify(inputData),
          codeformat: 'solidity-standard-json-input',
          contractname: `${contractInfo.sourceName}:${contractInfo.contractName}`,
          compilerversion: 'v' + contractArtifact.source.solcVersion,

          // NOTE: below: yes, the etherscan api is misspelling
          constructorArguements: new ethers.utils.Interface(contractArtifact.abi)
            .encodeDeploy(contractInfo.constructorArgs)
            .slice(2),
        };

        debug('verification request', reqData);

        const res = await axios.post(etherscanApi, reqData, {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });

        if (res.data.status === '0') {
          console.log(`${c}:\tcannot verify:`, res.data.result);
        } else {
          console.log(`${c}:\tsubmitted verification (${contractInfo.address})`);
          guids[c] = res.data.result;
        }
      } catch (err) {
        console.log(`verification for ${c} (${contractInfo.address}) failed:`, err);
      }

      await sleep(500);
    }
  };

  const deployData = await runtime.readDeploy(packageRef, preset, chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${packageRef}. please make sure it exists for the given preset and current network.`
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
          apiKey,
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
          console.log(`❌ ${c}`, res.data.result);
          console.log(res.data);
          break;
        }
      } else {
        console.log(`✅ ${c}`);
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
