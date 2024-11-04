import 'prismjs';
import 'prismjs/components/prism-toml';

import React, { FC, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ContractsTable } from './ContractsTable';
import { InvokesTable } from './InvokesTable';
import { EventsTable } from './EventsTable';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import SearchInput from '@/components/SearchInput';
import isEmpty from 'lodash/isEmpty';
import { ChainBuilderContext } from '@usecannon/builder';
import { IpfsSpinner } from '@/components/IpfsSpinner';

export const DeploymentExplorer: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const [contractSearchTerm, setContractSearchTerm] = useState<string>('');
  const [invokeSearchTerm, setInvokeSearchTerm] = useState<string>('');

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

  const settings: { [key: string]: any } = {};
  if (deploymentInfo?.def?.setting) {
    for (const key in deploymentInfo.def.setting) {
      if (
        deploymentInfo?.options &&
        deploymentInfo.options[key] !== undefined
      ) {
        settings[key] = {
          ...deploymentInfo.def.setting[key],
          option: deploymentInfo.options[key],
        };
      } else {
        settings[key] = { ...deploymentInfo.def.setting[key] };
      }
    }
  }

  const stepDefinitions: string[] = [
    'deploy',
    'contract',
    'provision',
    'clone',
    'import',
    'pull',
    'router',
    'invoke',
    'run',
  ];

  function mergeArtifactsContracts(obj: any, mergedContracts: any = {}): any {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (obj[key].address && obj[key].abi) {
          if (
            stepDefinitions.some((step) => obj[key].deployedOn.includes(step))
          ) {
            mergedContracts[obj[key].contractName || ''] = obj[key];
          }
        }

        //Adding contracts imported from subpackages
        if (obj[key].artifacts && obj[key].artifacts.imports) {
          const step = key.split('.')[1];
          for (const contract in obj[key].artifacts.imports[step].contracts) {
            obj[key].artifacts.imports[step].contracts[contract].deployedOn =
              key;

            // Change deployedOn title to parent package
            mergedContracts[obj[key].contractName || ''] =
              obj[key].artifacts.imports[step].contracts[contract];
          }
        }

        // Recursively search through nested objects
        mergeArtifactsContracts(obj[key], mergedContracts);
      }
    }

    return mergedContracts;
  }

  const contractState: ChainBuilderContext['contracts'] = deploymentInfo?.state
    ? mergeArtifactsContracts(deploymentInfo.state)
    : {};

  // Filter and sort based on search term and sort order of steps
  const contractEntries = Object.entries(contractState);
  const filteredContractState = Object.fromEntries(
    contractEntries
      .sort(
        ([, { deployedOn: propA }], [, { deployedOn: propB }]) =>
          stepDefinitions.findIndex((val) => propA.includes(val)) -
          stepDefinitions.findIndex((val) => propB.includes(val))
      )
      .filter(([, val]) =>
        Object.values(val).some(
          (v) =>
            typeof v === 'string' &&
            v.toLowerCase().includes(contractSearchTerm.toLowerCase())
        )
      )
  );

  function mergeInvoke(obj: any, mergedInvokes: any = {}): any {
    for (const key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        // If the current object has both address and abi keys
        if (key === 'txns') {
          for (const key2 in obj[key]) {
            mergedInvokes[obj[key][key2].deployedOn] = obj[key][key2];
          }
        }
        // Recursively search through nested objects
        mergeInvoke(obj[key], mergedInvokes);
      }
    }

    return mergedInvokes;
  }

  const invokeState: ChainBuilderContext['txns'] = deploymentInfo?.state
    ? mergeInvoke(deploymentInfo.state)
    : {};

  const invokeEntries = Object.entries(invokeState);
  const filteredInvokeState = Object.fromEntries(
    invokeEntries.filter(([, func]) =>
      Object.values(func).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(invokeSearchTerm.toLowerCase())
      )
    )
  );

  const addressesAbis = deploymentInfo?.state
    ? extractAddressesAbis(deploymentInfo.state)
    : {};

  type NestedObject = { [key: string]: any };
  function mergeExtras(obj: NestedObject): NestedObject {
    const result: NestedObject = {};

    // Base cases
    if (typeof obj !== 'object' || obj === null) {
      return result;
    }

    // Check current object for "extras"
    if (
      Object.prototype.hasOwnProperty.call(obj, 'extras') &&
      typeof obj['extras'] === 'object'
    ) {
      Object.assign(result, obj['extras']);
    }

    // Recursive case
    for (const key in obj) {
      if (typeof obj[key] === 'object' && key !== 'extras') {
        Object.assign(result, mergeExtras(obj[key]));
      }
    }

    return result;
  }

  const mergedExtras = mergeExtras(deploymentInfo?.state || {});

  return pkg?.deployUrl ? (
    <div>
      {deploymentData.isLoading ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : deploymentInfo ? (
        <div>
          <h2 className="text-muted-foreground px-4 pt-8">
            {pkg.chainId === 13370
              ? 'The following operations will be executed by this package.'
              : 'The following operations were executed when building this package or a package it upgraded from.'}
          </h2>

          <div className="pt-6 pb-2 px-4 flex flex-col md:flex-row justify-start items-center">
            <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[32px]">
              <h2 className="text-2xl font-bold tracking-tight">
                Contract Deployments
              </h2>
            </div>
            <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
              <SearchInput size="sm" onSearchChange={setContractSearchTerm} />
            </div>
          </div>

          {!isEmpty(filteredContractState) && !isEmpty(addressesAbis) ? (
            <div className="max-w-full mx-4 mt-2">
              <ContractsTable
                contractState={filteredContractState}
                chainId={pkg.chainId}
              />
            </div>
          ) : (
            <div className="mt-6">
              <div className="px-4 mb-3 flex justify-center flex-col md:flex-row">
                <h3 className="text-lg font-semibold">No Contracts Found</h3>
              </div>
            </div>
          )}

          <div className="pt-6 pb-2 px-4 flex flex-col md:flex-row justify-start items-center">
            <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[32px]">
              <h2 className="text-2xl font-bold tracking-tight">
                Function Calls
              </h2>
            </div>
            <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
              <SearchInput size="sm" onSearchChange={setInvokeSearchTerm} />
            </div>
          </div>

          {!isEmpty(invokeState) ? (
            <div className="max-w-full mx-4 mt-2">
              <InvokesTable
                invokeState={filteredInvokeState}
                chainId={pkg.chainId}
              />
            </div>
          ) : (
            <div className="mt-6">
              <div className="px-4 mb-3 flex justify-center flex-col md:flex-row">
                <h3 className="text-lg font-semibold">No Functions Found</h3>
              </div>
            </div>
          )}

          {!isEmpty(mergedExtras) && (
            <div className="mt-6">
              <div className="px-4 mb-3 flex items-center">
                <h2 className="text-2xl font-bold tracking-tight">
                  Event Data
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-5 w-5 text-gray-400 ml-2" />
                    </TooltipTrigger>
                    <TooltipContent>
                      This includes event data captured during the build, to be
                      referenced in dependent operations.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="max-w-full mx-4 mt-2">
                <EventsTable extrasState={mergedExtras} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 opacity-50">
          Unable to retrieve deployment data
        </div>
      )}
    </div>
  ) : (
    <div className="text-center py-20 opacity-50">
      No metadata is associated with this package
    </div>
  );
};
