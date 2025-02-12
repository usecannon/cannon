import { FC, useState } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { DeploymentInfo } from '@usecannon/builder/src/types';
import ChainDefinitionSteps from './ChainDefinitionSteps';
import { isEmpty } from 'lodash';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { CannonfileGraph } from './CannonfileGraph';
import { StepModalProvider } from '@/providers/stepModalProvider';
import { stringify } from '@iarna/toml';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export const CannonfileExplorer: FC<{ pkg: ApiPackage }> = ({ pkg }) => {
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    pkg?.deployUrl,
    !!pkg?.deployUrl
  );
  const deploymentInfo = deploymentData.data;

  const [displayMode, setDisplayMode] = useState(1);

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

  // Deep clone the deploymentInfo.def object
  const clonedDeploymentInfoDef = deploymentInfo?.def
    ? JSON.parse(JSON.stringify(deploymentInfo.def))
    : null;

  // Apply the omitEmptyObjects function to the cloned object
  const processedDeploymentInfo = clonedDeploymentInfoDef
    ? omitEmptyObjects(clonedDeploymentInfoDef)
    : null;

  const pulls = {
    ...(deploymentInfo?.def?.import || {}),
    ...(deploymentInfo?.def?.pull || {}),
  };

  const clones = {
    ...(deploymentInfo?.def?.provision || {}),
    ...(deploymentInfo?.def?.clone || {}),
  };

  const deploys = {
    ...(deploymentInfo?.def?.contract || {}),
    ...(deploymentInfo?.def?.deploy || {}),
  };

  return pkg?.deployUrl ? (
    <div className="flex flex-1 flex-col h-full w-full">
      {deploymentData.isLoading ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : deploymentInfo ? (
        <div className="relative h-full w-full">
          <TooltipProvider>
            <div className="sticky top-0 overflow-x-scroll overflow-y-hidden max-w-full border-b border-border bg-muted">
              <Tabs
                value={displayMode.toString()}
                onValueChange={(value) => setDisplayMode(parseInt(value))}
              >
                <TabsList className="h-full">
                  <TabsTrigger value="1">Dependency Graph</TabsTrigger>
                  <TabsTrigger value="2">Processed Cannonfile</TabsTrigger>
                  <TabsTrigger value="3">Raw Cannonfile</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <StepModalProvider>
              <div
                className={`${displayMode === 1 ? 'block h-full' : 'hidden'} `}
              >
                <div className="h-full">
                  <CannonfileGraph deployInfo={deploymentInfo} />
                </div>
              </div>

              <div
                className={`container mx-auto p-4 ${
                  displayMode === 2 ? 'flex flex-col' : 'hidden'
                }`}
              >
                {Object.entries(settings).length > 0 && (
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-3">Variables</h2>
                    <div className="overflow-x-auto mb-6">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border">
                            <TableHead className="border-border">
                              <code>var</code>
                            </TableHead>
                            <TableHead className="border-border">
                              Value
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="font-mono">
                          {Object.entries(settings).map(([key, value]) => (
                            <TableRow key={key} className="border-border">
                              <TableCell className="border-border">
                                <Tooltip>
                                  <TooltipTrigger>{key}</TooltipTrigger>
                                  <TooltipContent>
                                    <p>{key}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                              <TableCell className="border-border">
                                {value.option ? (
                                  <>{value.option}</>
                                ) : (
                                  <>{value.defaultValue}</>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                {deploymentInfo?.def?.var && (
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-3">
                      Variable Setting
                    </h2>
                    <ChainDefinitionSteps
                      name="var"
                      modules={deploymentInfo?.def?.var}
                    />
                  </div>
                )}
                {!isEmpty(pulls) && (
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-3">
                      Pulled Packages
                    </h2>
                    <ChainDefinitionSteps name="pull" modules={pulls} />
                  </div>
                )}
                {!isEmpty(clones) && (
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-3">
                      Cloned Package
                    </h2>
                    <ChainDefinitionSteps name="clone" modules={clones} />
                  </div>
                )}
                {deploymentInfo?.def?.router && (
                  <div className="mt-4">
                    <h2 className="text-xl font-semibold mb-3">
                      Router Generation
                    </h2>
                    <ChainDefinitionSteps
                      name="router"
                      modules={deploymentInfo.def.router}
                    />
                  </div>
                )}
                {!isEmpty(deploys) && (
                  <div className="mt-4 max-w-full overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-3">
                      Contract Deployments
                    </h2>
                    <ChainDefinitionSteps name="deploy" modules={deploys} />
                  </div>
                )}
                {deploymentInfo?.def?.invoke && (
                  <div className="mt-4 max-w-full overflow-x-auto">
                    <h2 className="text-xl font-semibold mb-3">
                      Function Calls
                    </h2>
                    <ChainDefinitionSteps
                      name="invoke"
                      modules={deploymentInfo.def.invoke}
                    />
                  </div>
                )}
              </div>

              <div
                className={`${displayMode === 3 ? 'h-screen mr-4' : 'hidden'} `}
              >
                <CodePreview
                  code={stringify(processedDeploymentInfo as any)}
                  language="ini"
                  height="100%"
                />
              </div>
            </StepModalProvider>
          </TooltipProvider>
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
