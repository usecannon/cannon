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
import { PiGraphLight, PiCodeLight, PiListBullets } from 'react-icons/pi';
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
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

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
      <div className="h-[710px]">
        <SidebarLayout contentHeight="710px">
          {deploymentData.isLoading ? (
            <div className="py-20">
              <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
            </div>
          ) : deploymentInfo ? (
            <div className="relative h-full w-full">
              <TooltipProvider>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center rounded-full border border-gray-500 bg-black z-50 overflow-hidden">
                  <button
                    onClick={() => setDisplayMode(1)}
                    className={`p-3 pl-4 hover:bg-gray-900 ${
                      displayMode === 1 ? 'text-[#1ad6ff]' : 'text-white'
                    }`}
                  >
                    <PiGraphLight size="24" />
                  </button>
                  <button
                    onClick={() => setDisplayMode(2)}
                    className={`p-3 hover:bg-gray-900 ${
                      displayMode === 2 ? 'text-[#1ad6ff]' : 'text-white'
                    }`}
                  >
                    <PiListBullets size="24" />
                  </button>
                  <button
                    onClick={() => setDisplayMode(3)}
                    className={`p-3 pr-4 hover:bg-gray-900 ${
                      displayMode === 3 ? 'text-[#1ad6ff]' : 'text-white'
                    }`}
                  >
                    <PiCodeLight size="24" />
                  </button>
                </div>

                <StepModalProvider>
                  <div
                    className={`${displayMode === 1 ? 'h-full' : 'hidden'} `}
                  >
                    <CannonfileGraph
                      deploymentDefinition={deploymentInfo.def}
                    />
                  </div>

                  <div
                    className={`container mx-auto max-w-5xl py-14 px-4 ${
                      displayMode === 2 ? 'flex flex-col' : 'hidden'
                    }`}
                  >
                    {Object.entries(settings).length > 0 && (
                      <div className="mt-4">
                        <h2 className="text-xl font-semibold mb-3">
                          Variables
                        </h2>
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
                    className={`${displayMode === 3 ? 'h-full' : 'hidden'} `}
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
        </SidebarLayout>
      </div>
    </div>
  ) : (
    <div className="text-center py-20 opacity-50">
      No metadata is associated with this package
    </div>
  );
};
