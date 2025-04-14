import 'prismjs';
import 'prismjs/components/prism-toml';

import React, { FC, useEffect, useState, useMemo } from 'react';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import { ChainBuilderContext } from '@usecannon/builder';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRouter, usePathname } from 'next/navigation';
import ContractsTab from './Tabs/ContractsTab';
import FunctionCallsTab from './Tabs/FunctionCallsTab';
import EventDataTab from './Tabs/EventDataTab';
import { extractContractsImports as extractContracts } from './utils/extractContractsImports';
import {
  buildInteractPath,
  ContractOption,
  processDeploymentData,
  markHighlight,
  sortByModulePriority,
} from '@/lib/interact';
import { usePackageNameTagVariantUrlParams } from '@/hooks/routing/usePackageNameTagVariantUrlParams';

const getCreateType = (object: any, key: string): string => {
  if (object && key in object) {
    if (
      'create2' in object[key] &&
      object[key].create2?.toString() === 'true'
    ) {
      return 'Create2';
    }

    for (const k of Object.keys(object[key])) {
      if (typeof object[k] === 'object' && object[k] !== null) {
        const result = getCreateType(object[k], key);
        if (result) return result;
      }
    }
  }
  return 'Create1';
};

const getDeployType = (object: any, operation: string): string => {
  const step = operation.split('.')[0];
  const subKey = operation.split('.')[1];
  if (step == 'invoke') {
    return 'Factory Deployment';
  } else {
    return getCreateType(object[step], subKey);
  }
};

function omitEmptyObjects(config: { [x: string]: any }) {
  for (const key in config) {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
      const value = config[key];
      if (
        value &&
        typeof value === 'object' &&
        Object.keys(value).length === 0
      ) {
        delete config[key];
      } else if (typeof value === 'object') {
        omitEmptyObjects(value);
      }
    }
  }
  return config;
}

export const DeploymentExplorer: FC<{
  pkg: ApiPackage;
}> = ({ pkg }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { name, tag, variant } = usePackageNameTagVariantUrlParams();
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;
  const [contractStateData, setContractStateData] = useState<ContractOption[]>(
    []
  );

  const clonedDeploymentInfoDef = deploymentInfo?.def
    ? JSON.parse(JSON.stringify(deploymentInfo.def))
    : null;

  const processedDeploymentInfo = clonedDeploymentInfoDef
    ? omitEmptyObjects(clonedDeploymentInfoDef)
    : null;

  const contractState = deploymentInfo?.state
    ? extractContracts(deploymentInfo.state)
    : {};

  const contractAllData = useMemo(() => {
    if (!deploymentData.data || !contractState || !processedDeploymentInfo) {
      return [];
    }

    const [rawHighlightedData, rawOtherData] = processDeploymentData(
      deploymentData.data,
      name
    );

    const highlightedData = sortByModulePriority(
      markHighlight(rawHighlightedData, true),
      name
    );

    const otherData = sortByModulePriority(
      markHighlight(rawOtherData, false),
      name
    );

    const combinedAllData: ContractOption[] = [...highlightedData, ...otherData]
      .map((item) => {
        const address = item.contractAddress || '';
        return {
          ...item,
          step:
            contractState[address]?.deployedOn.toString() || item.moduleName,
          deployTxnHash: contractState[address]?.deployTxnHash || '',
          path: buildInteractPath(
            name,
            tag,
            variant,
            item.moduleName,
            item.contractName,
            item.contractAddress
          ),
          deployType: getDeployType(
            processedDeploymentInfo,
            contractState[address]?.deployedOn.toString() || item.moduleName
          ),
        };
      })
      .filter((item) => item !== undefined);

    return combinedAllData;
  }, [deploymentData.data, name, tag, variant]);

  useEffect(() => {
    setContractStateData(contractAllData);
  }, [contractAllData]);

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
                <TabsTrigger
                  value="contracts"
                  data-testid="contract-deployment-button"
                >
                  Contract Deployments
                </TabsTrigger>
                <TabsTrigger value="calls" data-testid="function-call-button">
                  Function Calls
                </TabsTrigger>
                <TabsTrigger value="event-data" data-testid="event-data-button">
                  Event Data
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div>
            {pathname.endsWith('/contracts') && (
              <ContractsTab
                contractState={contractStateData}
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
