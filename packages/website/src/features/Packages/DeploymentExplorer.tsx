import 'prismjs';
import 'prismjs/components/prism-toml';

import React, { FC } from 'react';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { extractAddressesAbis } from '@/features/Packages/utils/extractAddressesAndABIs';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import { ChainBuilderContext } from '@usecannon/builder';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import ContractsTab from './Tabs/ContractsTab';
import FunctionCallsTab from './Tabs/FunctionCallsTab';
import EventDataTab from './Tabs/EventDataTab';

export const DeploymentExplorer: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const router = useRouter();
  const pathname = usePathname();
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

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

  function mergeArtifactsContracts(obj: any, mergedContracts: any = {}) {
    for (const key in obj) {
      const currentArtifact = obj[key];
      const address = currentArtifact.address;
      const abi = currentArtifact.abi;
      const artifacts = currentArtifact.artifacts;
      const artifactsImports = artifacts?.imports;

      const hasStepDefinition = stepDefinitions.some((step) =>
        currentArtifact.deployedOn?.includes(step)
      );

      if (typeof obj[key] === 'object') {
        if (address && abi && hasStepDefinition) {
          mergedContracts[address] = currentArtifact;
        }

        //Adding contracts imported from subpackages
        if (artifactsImports) {
          const step = key.split('.')[1];
          for (const contract in artifactsImports[step].contracts) {
            currentArtifact.artifacts.imports[step].contracts[
              contract
            ].deployedOn = key;

            // Change deployedOn title to parent package
            mergedContracts[obj[key].contractName || ''] =
              currentArtifact.artifacts.imports[step].contracts[contract];
          }
        }

        // Recursively search through nested objects
        mergeArtifactsContracts(currentArtifact, mergedContracts);
      }
    }

    return mergedContracts;
  }

  const contractState = deploymentInfo?.state
    ? mergeArtifactsContracts(deploymentInfo.state)
    : {};

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

  const getCurrentTab = () => {
    if (pathname.endsWith('/calls')) return 'calls';
    if (pathname.endsWith('/event-data')) return 'event-data';
    return 'contracts';
  };

  const handleTabChange = (value: string) => {
    const basePath = pathname.split('/deployment')[0];
    router.push(`${basePath}/deployment/${value}`);
  };

  return pkg?.deployUrl ? (
    <div className="flex flex-1 flex-col max-h-full max-w-full">
      {deploymentData.isLoading ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : deploymentInfo ? (
        <>
          <div className="sticky top-0 z-[3] md:sticky overflow-x-scroll overflow-y-hidden max-w-full border-b border-border bg-muted">
            <Tabs
              defaultValue={getCurrentTab()}
              onValueChange={handleTabChange}
            >
              <TabsList className="h-full">
                <TabsTrigger value="contracts">
                  Contract Deployments
                </TabsTrigger>
                <TabsTrigger value="calls">Function Calls</TabsTrigger>
                <TabsTrigger value="event-data">Event Data</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            {pathname.endsWith('/contracts') && (
              <ContractsTab
                contractState={contractState}
                addressesAbis={addressesAbis}
                chainId={pkg.chainId}
              />
            )}
            {pathname.endsWith('/calls') && (
              <FunctionCallsTab
                invokeState={invokeState}
                chainId={pkg.chainId}
              />
            )}
            {pathname.endsWith('/event-data') && (
              <EventDataTab extrasState={mergedExtras} />
            )}
          </div>
        </>
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
