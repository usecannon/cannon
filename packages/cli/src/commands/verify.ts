import _ from 'lodash';
import axios from 'axios';
import Debug from 'debug';
import * as viem from 'viem';
import { ChainDefinition, getOutputs, ChainBuilderRuntime, DeploymentInfo } from '@usecannon/builder';
import { forPackageTree, PackageReference } from '@usecannon/builder';

import { CliSettings } from '../settings';
import { getProvider, runRpc } from '../rpc';
import { createDefaultReadRegistry } from '../registry';

import { getMainLoader } from '../loader';

import { log, logSpinner, spinner } from '../util/console';
import {
  ETHERSCAN_DEFAULT_SERVER_URL,
  getSourcifyVerificationEndpoint,
  getSourcifyVerificationStatusEndpoint,
  isEtherscanVerified,
  isSourcifyVerified,
  SourcifyVerifyRequest,
  SourcifyVerifyResponse,
  SourcifyVerifyStatusResponse,
} from '../util/verify';

const debug = Debug('cannon:cli:verify');

export async function verify(
  packageRef: string,
  cliSettings: CliSettings,
  chainId: number,
  service: 'etherscan' | 'sourcify' | 'all'
) {
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

  const etherscanApi = cliSettings.etherscanApiUrl || ETHERSCAN_DEFAULT_SERVER_URL;

  if (service === 'etherscan' || (service === 'all' && !cliSettings.etherscanApiKey)) {
    log('Using generic API key for Etherscan. If this is incorrect, specify CANNON_ETHERSCAN_API_KEY');
  }

  const guids: { [c: string]: { [v: string]: string } } = {};

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
        logSpinner(`${c} (${contractInfo.address}): cannot verify: no contract artifact found`);
        continue;
      }

      if (!contractArtifact.source) {
        logSpinner(`${c} (${contractInfo.address}): cannot verify: no source code recorded in deploy data`);
        continue;
      }

      // supply any linked libraries within the inputs since those are calculated at runtime
      const inputData = JSON.parse(contractArtifact.source.input);
      _.set(inputData, 'settings.libraries', contractInfo.linkedLibraries);

      if (service === 'etherscan' || service === 'all') {
        if (await isEtherscanVerified(contractInfo.address, chainId, etherscanApi, cliSettings.etherscanApiKey)) {
          logSpinner(`Etherscan: ✅ ${c} (${contractInfo.address}): Contract source code already verified`);
        } else {
          try {
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
              headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Cannon CLI',
              },
            });

            if (res.data.status === '0') {
              debug('etherscan failed', res.data);
              logSpinner(`Etherscan: ${c} (${contractInfo.address}):\tCannot verify:`, res.data.result);
            } else {
              logSpinner(`Etherscan: ${c} (${contractInfo.address}):\tSubmitted verification (${res.data.result})`);
              guids[c]['etherscan'] = res.data.result;
            }
          } catch (err) {
            logSpinner(`Etherscan: ${c} (${contractInfo.address}): Verification request failed:`, err);
          }
        }
      }

      if (service === 'sourcify' || service === 'all') {
        if (await isSourcifyVerified(contractInfo.address, chainId, cliSettings.sourcifyApiUrl || null)) {
          logSpinner(`Sourcify: ✅ ${c} (${contractInfo.address}): Contract source code already verified`);
          await sleep(500);
          continue;
        }

        try {
          const reqData: SourcifyVerifyRequest = {
            stdJsonInput: inputData,
            compilerVersion: 'v' + contractArtifact.source.solcVersion,
            contractIdentifier: `${contractArtifact.sourceName}:${contractArtifact.contractName}`,
          };

          if (contractInfo.deployTxnHash) {
            reqData.creationTransactionHash = contractInfo.deployTxnHash;
          }

          debug('sourcify verification request', reqData);

          const res = await axios.post<SourcifyVerifyResponse>(
            getSourcifyVerificationEndpoint(chainId, contractInfo.address, cliSettings.sourcifyApiUrl || null),
            reqData,
            {
              headers: {
                'content-type': 'application/json',
                'User-Agent': 'Cannon CLI',
              },
            }
          );

          if (res.status >= 300) {
            debug('sourcify failed', res.data);
            logSpinner(`Sourcify: ${c} (${contractInfo.address}):\tCannot verify:`, res.data);
          } else {
            logSpinner(`Sourcify: ${c} (${contractInfo.address}):\tSubmitted verification (${res.data.verificationId})`);
            _.set(guids, [c, 'sourcify'], res.data.verificationId);
          }
        } catch (err) {
          logSpinner(`Sourcify: ${c} (${contractInfo.address}): Verification request failed:`, err);
        }
      }
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
  spinner?.update({ text: 'Checking verification status...' });
  for (const c in guids) {
    for (const v in guids[c]) {
      for (;;) {
        if (v === 'etherscan') {
          const res = await axios.post(
            etherscanApi,
            {
              apiKey: cliSettings.etherscanApiKey,
              module: 'contract',
              action: 'checkverifystatus',
              guid: guids[c],
            },
            {
              headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Cannon CLI',
              },
            }
          );

          if (res.data.status === '0') {
            if (res.data.result === 'Pending in queue') {
              await sleep(1000);
            } else {
              logSpinner(`Etherscan: ❌ ${c}`, res.data.result);
              logSpinner(res.data);
              break;
            }
          } else {
            logSpinner(`Etherscan: ✅ ${c}`);
            await sleep(500);
            break;
          }
        } else if (v === 'sourcify') {
          const res = await axios.get<SourcifyVerifyStatusResponse>(
            getSourcifyVerificationStatusEndpoint(guids[c][v], cliSettings.sourcifyApiUrl || null),
            {
              headers: {
                'User-Agent': 'Cannon CLI',
              },
            }
          );

          if (res.status === 200) {
            if (!res.data.isJobCompleted) {
              await sleep(1000);
            } else {
              if (res.data.error) {
                logSpinner(`Sourcify: ❌ ${c}`, res.data.error.message);
                logSpinner(res.data.error);
              } else {
                logSpinner(`Sourcify: ✅ ${c} ${res.data.contract.match}`);
              }
              break;
            }
          } else {
            logSpinner(`Sourcify: ❌ ${c}: unknown error (${res.status}): ${res.data}`);
            await sleep(500);
            break;
          }
        }
      }
    }
  }

  node.kill();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
