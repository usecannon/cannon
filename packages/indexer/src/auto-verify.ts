import _ from 'lodash';
import * as rkey from './db';
import { useRedis, commandOptions } from './redis';
import { config } from './config';
import {
  forPackageTree,
  DeploymentInfo,
  ChainDefinition,
  CannonStorage,
  getOutputs,
  IPFSLoader,
  InMemoryRegistry,
} from '@usecannon/builder';
import * as viem from 'viem';
import axios from 'axios';

/* eslint no-console: "off" */
interface EtherscanContract {
  SourceCode: string;
  ABI: string;
  ContractName: string;
  CompilerVersion: string;
  OptimizationUsed: string;
  Runs: string;
  ConstructorArguments: string;
  EVMVersion: string;
  Library: string;
  LicenseType: string;
  Proxy: string;
  Implementation: string;
  SwarmSource: string;
}

interface EtherscanGetSourceCodeNotOkResponse {
  status: '0';
  message: 'NOTOK';
  result: string;
}

interface EtherscanGetSourceCodeOkResponse {
  status: '1';
  message: 'OK';
  result: EtherscanContract[];
}

// etherscan only supports some chain ids
// https://docs.etherscan.io/contract-verification/supported-chains
// for the chain ids not on this list, we should consider supporting blockscout api as needed in the future as well
const SUPPORTED_CHAIN_IDS = [
  1, 5, 11155111, 17000, 56, 97, 204, 5611, 250, 4002, 10, 420, 11155420, 137, 42161, 421614, 1284, 1287, 1285, 199, 1028,
  42220, 44787, 100, 42170, 8453, 84532, 1101, 59144, 59140, 534352, 534351, 1111, 1112, 255, 2358, 252, 2522, 43114, 43113,
  81457, 23888,
];

if (!config.ETHERSCAN_API_KEY) {
  throw new Error('must specify ETHERSCAN_API_KEY');
}

export type EtherscanGetSourceCodeResponse = EtherscanGetSourceCodeNotOkResponse | EtherscanGetSourceCodeOkResponse;

export async function doContractVerify(ipfsHash: string, loader: CannonStorage) {
  const guids: { [c: string]: string } = {};

  const verifyPackage = async (deployData: DeploymentInfo) => {
    if (SUPPORTED_CHAIN_IDS.includes(deployData.chainId || 0)) {
      console.log('not verifying, unsupported chain id', deployData.chainId);
      return {};
    }

    const miscData = await loader.readBlob(deployData.miscUrl);

    const outputs = await getOutputs(null, new ChainDefinition(deployData.def), deployData.state);

    if (!outputs) {
      throw new Error('No chain outputs found. Has the requested chain already been built?');
    }

    for (const c in outputs.contracts) {
      const contractInfo = outputs.contracts[c];

      // contracts can either be imported by just their name, or by a full path.
      // technically it may be more correct to just load by the actual name of the `artifact` property used, but that is complicated
      console.log('finding contract:', contractInfo.sourceName, contractInfo.contractName);
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

      if (await isVerified(contractInfo.address, deployData.chainId!, config.ETHERSCAN_API_URL, config.ETHERSCAN_API_KEY)) {
        console.log(`✅ ${c}: Contract source code already verified`);
        await sleep(500);
        continue;
      }

      try {
        // supply any linked libraries within the inputs since those are calculated at runtime
        const inputData = JSON.parse(contractArtifact.source.input);
        inputData.settings.libraries = contractInfo.linkedLibraries;

        const reqData: { [k: string]: string } = {
          apikey: config.ETHERSCAN_API_KEY,
          module: 'contract',
          action: 'verifysourcecode',
          chainId: deployData.chainId!.toString(),
          contractaddress: contractInfo.address,
          // need to parse to get the inner structure, then stringify again
          sourceCode: JSON.stringify(inputData),
          codeformat: 'solidity-standard-json-input',
          contractname: `${contractInfo.sourceName}:${contractInfo.contractName}`,
          compilerversion: 'v' + contractArtifact.source.solcVersion,

          // NOTE: below: yes, the etherscan api is misspelling
          constructorArguements: viem
            .encodeAbiParameters(
              contractArtifact.abi.find((i: viem.AbiItem) => i.type === 'constructor')?.inputs ?? [],
              contractInfo.constructorArgs || []
            )
            .slice(2),
        };

        const res = await axios.post(config.ETHERSCAN_API_URL, reqData, {
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
        });

        if (res.data.status === '0') {
          console.error(`${c}:\tcannot verify:`, res.data.result);
        } else {
          console.log(`${c}:\tsubmitted verification (${contractInfo.address})`);
          guids[c] = res.data.result;
        }
      } catch (err) {
        console.error(`verification for ${c} (${contractInfo.address}) failed:`, err);
      }

      await sleep(500);
    }

    return {};
  };

  const deployData = await loader.readBlob(ipfsHash);

  if (!deployData) {
    throw new Error(`loader could not load: ${ipfsHash}.`);
  }

  // go through all the packages and sub packages and make sure all contracts are being verified
  await forPackageTree(loader, deployData, verifyPackage);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a smart contract is verified on Etherscan.
 * @link https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
 * @param address - The address of the smart contract.
 * @param apiUrl - Etherscan API URL.
 * @param apiKey - Etherscan API Key.
 * @returns True if the contract is verified, false otherwise.
 */

export async function isVerified(address: string, chainId: number, apiUrl: string, apiKey: string): Promise<boolean> {
  const parameters = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'getsourcecode',
    chainId: chainId.toString(),
    address,
  });

  const url = new URL(apiUrl);
  url.search = parameters.toString();

  try {
    const response = await fetch(url);

    // checking that status is in the range 200-299 inclusive
    if (!response.ok) {
      throw new Error(`Network response failed (${response.status}: ${response.statusText})`);
    }

    const json = (await response.json()) as EtherscanGetSourceCodeResponse;

    if (json.message !== 'OK') {
      return false;
    }

    const sourceCode = json.result[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== null && sourceCode !== '';
  } catch (e) {
    return false;
  }
}

export async function loop() {
  const rdb = await useRedis();

  let lastKey = await rdb.get(rkey.RKEY_REGISTRY_STREAM + ':auto-verify-last');

  const loader = new CannonStorage(new InMemoryRegistry(), {
    // shorter than usual timeout becuase we need to move on if its not resolving well
    ipfs: new IPFSLoader(config.IPFS_URL, {}, 15000),
  });

  let e = await rdb.xRead(
    commandOptions({ isolated: true }),
    { key: rkey.RKEY_REGISTRY_STREAM, id: lastKey || '0-0' },
    { BLOCK: 600, COUNT: 1 }
  );
  while (e) {
    try {
      lastKey = e[0].messages[0].id;
      const evt = e[0].messages[0].message;
      // run the cannon verify command from the cli
      await doContractVerify(evt.packageUrl, loader);

      await rdb.set(rkey.RKEY_REGISTRY_STREAM + ':auto-verify-last', lastKey);
      e = await rdb.xRead(
        commandOptions({ isolated: true }),
        { key: rkey.RKEY_REGISTRY_STREAM, id: lastKey || '0-0' },
        { BLOCK: 600, COUNT: 1 }
      );
    } catch (err) {
      console.error('during processing', err, e);
    }
  }
}
