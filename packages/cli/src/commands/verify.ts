import { ChainDefinition, getOutputs, ChainBuilderRuntime, IPFSLoader } from '@usecannon/builder';
import { ethers } from 'ethers';
import axios from 'axios';
import { getChainDataFromId, readMetadataCache, setupAnvil } from '../helpers';
import { createDefaultReadRegistry } from '../registry';
import { getProvider, runRpc } from '../rpc';
import { resolveCliSettings } from '../settings';

export async function verify(packageRef: string, apiKey: string, chainId: number) {
  await setupAnvil();

  // create temporary provider
  // todo: really shouldn't be necessary
  const node = await runRpc({
    port: 30000 + Math.floor(Math.random() * 30000),
  });
  const provider = getProvider(node);

  const settings = resolveCliSettings();

  const resolver = createDefaultReadRegistry(settings);

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

      baseDir: null,
      snapshots: false,
      allowPartialDeploy: false,
    },
    new IPFSLoader(settings.ipfsUrl, resolver)
  );

  const deployData = await runtime.loader.readDeploy(packageRef, 'main', chainId);

  if (!deployData) {
    throw new Error(
      `deployment not found: ${packageRef}. please make sure it exists for the given preset and current network.`
    );
  }

  const outputs = await getOutputs(runtime, new ChainDefinition(deployData.def), deployData.state);

  if (!outputs) {
    throw new Error('No chain outputs found. Has the requested chain already been built?');
  }

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

  const pkgMetadata = await readMetadataCache(packageRef);

  const guids: { [c: string]: string } = {};

  for (const c in outputs.contracts) {
    const contractInfo = outputs.contracts[c];

    const rawContractSourceInfo = pkgMetadata[`sources:${contractInfo.sourceName}:${contractInfo.contractName}`];

    if (!rawContractSourceInfo) {
      console.log(`${c}: cannot verify: no source code recorded in build data`);
      continue;
    }

    const contractSourceInfo = JSON.parse(rawContractSourceInfo);

    // find out if we have to supply libraries linked
    contractSourceInfo.input.settings.libraries = contractInfo.linkedLibraries;

    const reqData: { [k: string]: string } = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractInfo.address,
      // need to parse to get the inner structure, then stringify again
      sourceCode: JSON.stringify(contractSourceInfo.input),
      codeformat: 'solidity-standard-json-input',
      contractname: `${contractInfo.sourceName}:${contractInfo.contractName}`,
      compilerversion: 'v' + contractSourceInfo.solcVersion,
      //optimizationused: contractSourceInfo.input.settings.optimizer.enabled ? '1' : '0',
      //runs: contractSourceInfo.input.settings.optimizer.runs,

      // NOTE: below: yes, the etherscan api is misspelling
      constructorArguements: new ethers.utils.Interface(outputs.contracts[c].abi)
        .encodeDeploy(contractInfo.constructorArgs)
        .slice(2),
    };

    const res = await axios.post(etherscanApi, reqData, {
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });

    if (res.data.status === '0') {
      console.log(`${c}:\tcannot verify:`, res.data.result);
    } else {
      console.log(`${c}:\tsubmitted verification (${contractInfo.address})`);
      guids[c] = res.data.result;
    }
  }
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
        break;
      }
    }
  }

  node.kill();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
