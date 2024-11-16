'use client';

import { FC, useEffect, useState } from 'react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DownloadIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { isEmpty } from 'lodash';
import { DeploymentInfo } from '@usecannon/builder';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from "@/components/ui/button"
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const handleDownload = (content: Record<string, unknown>, filename: string) => {
  const blob = new Blob([JSON.stringify(content, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const CodeExplorer: FC<{
  pkg: ApiPackage;
  name: string;
  moduleName?: string;
  source: string;
  functionName?: string;
}> = ({ pkg, name, moduleName, source, functionName }) => {

  const [selectedCode, setSelectedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedLine, setSelectedLine] = useState<undefined | number>();
  // For the main package, the key is -1
  const [selectedPackage, setSelectedPackage] = useState<{
    name: string;
    key: number;
  }>({
    name,
    key: -1,
  });
  const { data: metadata } = useQueryIpfsDataParsed<{
    cannonfile: string;
  }>(pkg.metaUrl);

  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(pkg.deployUrl);

  // Provisioned packages could be inside the "provision" (old) or "clone" (current) key
  // So we check both in order to keep backwards compatibility
  const provisionedPackagesKeys =
    deploymentData?.data?.def?.provision || deploymentData?.data?.def?.clone
      ? Object.keys(
          deploymentData?.data?.def?.provision ||
            deploymentData?.data?.def?.clone ||
            {}
        )
      : [];
  const provisionArtifacts = provisionedPackagesKeys.map((k: string) => {
    return {
      name: k,
      artifacts: (
        deploymentData?.data?.state[`provision.${k}`] ||
        deploymentData?.data?.state[`clone.${k}`]
      )?.artifacts,
    };
  });

  const availablePackages = [
    {
      name,
      key: -1,
    },
  ].concat(
    provisionedPackagesKeys.map((k: string, i: number) => {
      return {
        name: k,
        key: i,
      };
    })
  );

  const {
    data: provisionedPackageData,
    isLoading: isLoadingProvisionedPackageData,
  } = useQueryIpfsDataParsed<{ miscUrl: string }>(
    provisionArtifacts[selectedPackage.key]?.artifacts?.imports?.[
      selectedPackage.name
    ]?.url,
    !!provisionArtifacts[selectedPackage.key]?.artifacts?.imports?.[
      selectedPackage.name
    ]?.url
  );
  const provisionedMiscUrl = provisionedPackageData?.miscUrl;

  const { data: provisionedMiscData, isLoading: isLoadingProvisionedMiscData } =
    useQueryIpfsDataParsed<{ artifacts: Record<string, unknown> }>(
      provisionedMiscUrl,
      !!provisionedMiscUrl
    );

  let miscUrl: string | undefined;
  if (deploymentData?.data) {
    miscUrl = deploymentData?.data?.miscUrl;
  }

  const { data: miscData, isLoading: isLoadingMiscData } =
    useQueryIpfsDataParsed<{ artifacts: Record<string, unknown> }>(
      miscUrl,
      !!miscUrl
    );

  const isSelectedPackage = ({ key, name }: { key: number; name: string }) =>
    selectedPackage.key === key && selectedPackage.name === name;

  useEffect(() => {
    if (isLoadingMiscData || isLoadingProvisionedMiscData) return;
    // If the selected package is the main package, select the first source code
    const selectedMiscData = isSelectedPackage({
      name,
      key: -1,
    })
      ? miscData
      : provisionedMiscData;

    if (selectedMiscData) {
      const artifacts = Object.entries(selectedMiscData.artifacts).sort(
        ([keyA], [keyB]) => {
          const countA = (keyA.match(/:/g) || []).length;
          const countB = (keyB.match(/:/g) || []).length;
          return countA - countB;
        }
      );

      const availableSources = artifacts.map(([key, value]: [string, any]) => {
        return {
          key,
          value,
          sources: value.source ? JSON.parse(value.source.input).sources : [],
        };
      });

      // find the source code for the selected contract
      for (const s of availableSources) {
        if (s.sources[decodeURIComponent(source)]) {
          const code = (s.sources[decodeURIComponent(source)] as any).content;
          setSelectedCode(code);
          setSelectedLanguage('sol');
          setSelectedKey(decodeURIComponent(source));

          const urlParams = new URLSearchParams({
            source: decodeURIComponent(source),
          });

          // set the selected line if a function name is provided
          const line = functionName
            ? code
                .split('\n')
                // use regex to match the function name
                .findIndex((l: string) => {
                  const escapedFunctionName = functionName.replace(
                    /[-/\\^$*+?.()|[\]{}]/g,
                    '\\$&'
                  );
                  const reg = new RegExp(
                    `\\bfunction\\s+${escapedFunctionName}\\b`,
                    'i'
                  );
                  return reg.test(l);
                })
            : -1;

          if (line > -1 && functionName) {
            setSelectedLine(line);
            urlParams.append('function', functionName);
          }
          window.history.pushState(
            null,
            '',
            `/packages/${name}/${pkg.version}/${pkg.chainId}-${
              pkg.preset
            }/code/${selectedPackage.name}?${urlParams.toString()}`
          );
          return;
        }
      }

      // If the selected contract is not found, select the first source code
      const firstArtifact = artifacts[0];

      if (firstArtifact) {
        const [, firstArtifactValue] = firstArtifact;
        const sortedSources = (firstArtifactValue as any)?.source?.input
          ? Object.entries(
              JSON.parse((firstArtifactValue as any)?.source?.input).sources
            ).sort(([keyA], [keyB]) => {
              const countA = (keyA.match(/\//g) || []).length;
              const countB = (keyB.match(/\//g) || []).length;
              return countA - countB;
            })
          : [];

        if (sortedSources.length) {
          const [sourceKey, sourceValue] = sortedSources[0];
          setSelectedCode((sourceValue as any)?.content);
          setSelectedLanguage('sol');
          setSelectedKey(sourceKey);

          window.history.pushState(
            null,
            '',
            `/packages/${name}/${pkg.version}/${pkg.chainId}-${
              pkg.preset
            }/code/${selectedPackage.name}?source=${encodeURIComponent(
              sourceKey
            )}`
          );
        } else {
          setSelectedCode('');
          setSelectedLanguage('');
          setSelectedKey('');

          /*
          window.history.pushState(
            null,
            '',
            `/packages/${name}/${pkg.version}/${pkg.chainId}-${pkg.preset}/code/${selectedPackage.name}`
          );
          */
        }
      }
    }
  }, [
    miscData,
    provisionedMiscData,
    source,
    isLoadingMiscData,
    isLoadingProvisionedMiscData,
    functionName,
  ]);

  const artifacts =
    // If the selected package is the main package, use the misc data
    isSelectedPackage({ name, key: -1 })
      ? miscData && Object.entries(miscData?.artifacts)
      : provisionedMiscData && Object.entries(provisionedMiscData?.artifacts);

  const handleSelectPackage = (p: { name: string; key: number }) => {
    setSelectedPackage({ name: p.name, key: p.key });
  };

  // Select the right selected module based on the given moduleName
  // If the selected package is the main package, select the first source code
  useEffect(() => {
    if (deploymentData.isLoading) return;
    const foundPackage = availablePackages.find((p) => p.name === moduleName);
    if (foundPackage) {
      setSelectedPackage(foundPackage);
      setSelectedKey(decodeURIComponent(source));
    }
  }, [moduleName, source, availablePackages.length, deploymentData?.isLoading]);

  // Select the first provisioned package if the main package has no code
  useEffect(() => {
    if (deploymentData.isLoading) return;
    if (
      !artifacts?.length &&
      provisionedPackagesKeys.length &&
      selectedPackage.key === -1
    ) {
      setSelectedPackage(availablePackages[1]);
    }
  }, [
    artifacts?.length,
    provisionedPackagesKeys?.length,
    deploymentData?.isLoading,
    selectedPackage.key,
  ]);

  const handleSelectFile = (sourceKey: string, sourceValue: any) => {
    // We can have these lines to keep SPA navigation
    setSelectedCode(sourceValue.content);
    setSelectedLanguage('sol');
    setSelectedKey(sourceKey);

    window.history.pushState(
      null,
      '',
      `/packages/${name}/${pkg.version}/${pkg.chainId}-${pkg.preset}/code/${
        selectedPackage.name
      }?source=${encodeURIComponent(sourceKey)}`
    );
  };

  const isLoading =
    !miscData ||
    isLoadingProvisionedPackageData ||
    isLoadingMiscData ||
    isLoadingProvisionedMiscData;

  return (
    <div className="flex flex-col flex-1 max-h-full max-w-full">
      {isLoading ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : artifacts?.length || provisionedPackagesKeys.length ? (
        <>
          {!!provisionedPackagesKeys.length && (
            <div className="flex sticky top-0 z-[3] md:sticky overflow-x-scroll overflow-y-hidden max-w-full border-b border-gray-800 flex-nowrap">
              <Tabs
                defaultValue={name}
                value={selectedPackage.name}
                onValueChange={(value) => {
                  const pkg = availablePackages.find((p) => p.name === value);
                  if (pkg) {
                    handleSelectPackage(pkg);
                  }
                }}
              >
                <TabsList className="rounded-none">
                  {!isEmpty(miscData?.artifacts) && (
                    <TabsTrigger
                      value={name}
                    >
                      {name}
                    </TabsTrigger>
                  )}
                  {provisionedPackagesKeys.map((k: string) => (
                    <TabsTrigger
                      key={k}
                      value={k}
                    >
                      {k}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
          <div className="flex flex-1 flex-col md:flex-row">
            <div className="flex flex-col overflow-y-auto max-w-full md:max-w-[320px] border-b md:border-b-0 md:border-r border-gray-700 w-full md:w-[320px] max-h-[140px] md:max-h-[calc(100vh-236px)]">
              <div className="px-3 pb-2">
                {artifacts?.map(([artifactKey, artifactValue]: [any, any]) => {
                  return (
                    <div key={artifactKey} className="mt-4">
                      <div className="flex flex-row px-2 items-center mb-1">
                        <div className="text-sm font-medium text-gray-200 tracking-wide mr-1">
                          {artifactKey.split(':').length > 1
                            ? artifactKey.split(':')[1]
                            : artifactKey}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-300 border-gray-500 hover:bg-gray-700 ml-auto"
                          onClick={() => {
                            handleDownload(
                              (artifactValue as any)?.abi,
                              'deployments.json'
                            );
                          }}
                        >
                          <DownloadIcon className="mr-2" />
                          ABI
                        </Button>
                      </div>
                      {(artifactValue as any)?.source?.input &&
                        Object.entries(
                          JSON.parse((artifactValue as any).source.input)
                            .sources
                        )
                          .sort(([keyA], [keyB]) => {
                            const countA = (keyA.match(/\//g) || []).length;
                            const countB = (keyB.match(/\//g) || []).length;
                            return countA - countB; // Sorts in ascending order
                          })
                          .map(([sourceKey, sourceValue]) => {
                            return (
                              <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <div
                                    className={`
                                      border border-gray-800 rounded-md mb-0.5 py-0.5 px-2 
                                      cursor-pointer text-sm hover:bg-gray-800
                                      whitespace-nowrap overflow-hidden text-ellipsis
                                      rtl text-left
                                      ${selectedKey == sourceKey ? 'font-medium bg-gray-800' : ''}
                                    `}
                                    onClick={() =>
                                      handleSelectFile(sourceKey, sourceValue)
                                    }
                                  >
                                    {sourceKey.split('').reverse().join('')}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {sourceKey}
                                </TooltipContent>
                              </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                    </div>
                  );
                })}

                {metadata?.cannonfile !== undefined && (
                  <>
                    <div className="mt-4">
                      <div className="flex flex-row px-2 items-center mb-1">
                        <div className="text-sm font-medium text-gray-200 tracking-wide mr-1">
                          Metadata
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-gray-300 border-gray-500 hover:bg-gray-700 ml-auto"
                          onClick={() => {
                            handleDownload(metadata, 'metadata.json');
                          }}
                        >
                          <DownloadIcon />
                        </Button>
                      </div>
                    </div>

                    <div
                      className="border border-gray-800 rounded-md mb-0.5 py-0.5 px-2 cursor-pointer font-sm hover:bg-gray-800"
                      onClick={() => {
                        setSelectedCode(metadata.cannonfile);
                        setSelectedLanguage('toml');
                        setSelectedKey('cannonfile');
                      }}
                    >
                      Cannonfile
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto md:max-h-[calc(100vh-236px)]">
              {selectedCode.length ? (
                <>
                  {!selectedLine && functionName ? null : (
                    <CodePreview
                      code={selectedCode}
                      language={selectedLanguage}
                      height="100%"
                      line={selectedLine}
                    />
                  )}
                </>
              ) : (
                <div className="flex flex-1 h-full items-center justify-center p-4">
                  <div className="text-gray-400">
                    <InfoOutlineIcon className="transform -translate-y-[1px]" /> 
                    Code unavailable
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-gray-400">
            <InfoOutlineIcon className="transform -translate-y-[1px]" /> This package does
            not contain any code.
          </div>
        </div>
      )}
    </div>
  );
};
