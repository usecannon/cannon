'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { Download, Info } from 'lucide-react';
import { isEmpty } from 'lodash';
import { DeploymentInfo } from '@usecannon/builder';
import { ApiPackage } from '@usecannon/api/dist/src/types';
import { IpfsSpinner } from '@/components/IpfsSpinner';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';
import { buildFileTree } from '@/features/Packages/code/utilts';
import { FileTreeItem } from '@/features/Packages/code/FileTreeItem';
import { FileIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';

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

// Utility function to handle URL updates
const updateUrl = (
  router: AppRouterInstance,
  params: {
    name: string;
    version: string;
    chainId: string | number;
    preset: string;
    packageName: string;
    source: string;
    functionName?: string;
  }
) => {
  const urlParams = new URLSearchParams();
  urlParams.append('source', params.source);
  if (params.functionName) {
    urlParams.append('function', params.functionName);
  }

  router.replace(
    `/packages/${params.name}/${params.version}/${params.chainId}-${
      params.preset
    }/code/${params.packageName}?${urlParams.toString()}`
  );
};

// Utility function to find function line in code
const findFunctionLine = (code: string, functionName: string): number => {
  if (!functionName) return -1;

  const escapedFunctionName = functionName.replace(
    /[-/\\^$*+?.()|[\]{}]/g,
    '\\$&'
  );
  const reg = new RegExp(`\\bfunction\\s+${escapedFunctionName}\\b`, 'i');

  return code.split('\n').findIndex((l: string) => reg.test(l));
};

// Utility function to handle source selection
const handleSourceSelection = (
  sourceKey: string,
  sourceContent: string,
  functionName?: string
) => {
  const line = findFunctionLine(sourceContent, functionName || '');

  return {
    code: sourceContent,
    language: 'sol',
    key: sourceKey,
    line: line > -1 ? line : undefined,
  };
};

export const CodeExplorer: FC<{
  pkg: ApiPackage;
  name: string;
  moduleName?: string;
  source: string;
  functionName?: string;
}> = ({ pkg, name, moduleName, source, functionName }) => {
  const router = useRouter();
  const { tag, variant } = usePackageNameTagVersionUrlParams();
  const [chainId, preset] = variant.split('-');
  const [selectedCode, setSelectedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedLine, setSelectedLine] = useState<undefined | number>();
  const [selectedPackage, setSelectedPackage] = useState<{
    name: string;
    key: number;
  }>({
    name: moduleName || name,
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

  // Update selected package key when provisioned packages are loaded
  useEffect(() => {
    if (provisionedPackagesKeys.length > 0) {
      if (moduleName) {
        const idx = provisionedPackagesKeys.indexOf(moduleName);
        if (idx >= 0) {
          setSelectedPackage({
            name: moduleName,
            key: idx,
          });
        }
      } else if (selectedPackage.name !== name) {
        const idx = provisionedPackagesKeys.indexOf(selectedPackage.name);
        if (idx >= 0) {
          setSelectedPackage((prev) => ({
            ...prev,
            key: idx,
          }));
        }
      }
    }
  }, [name, moduleName, selectedPackage.name, provisionedPackagesKeys]);

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

  const { data: provisionedMiscData, isLoading: isLoadingProvisionedMiscData } =
    useQueryIpfsDataParsed<{ artifacts: Record<string, unknown> }>(
      provisionedPackageData?.miscUrl,
      !!provisionedPackageData?.miscUrl
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

  const isSelectedPackage = useCallback(
    ({ key, name }: { key: number; name: string }) =>
      selectedPackage.key === key && selectedPackage.name === name,
    [selectedPackage.key, selectedPackage.name]
  );

  // Main effect for handling source code selection
  useEffect(() => {
    if (isLoadingMiscData || isLoadingProvisionedMiscData) return;

    const selectedMiscData = isSelectedPackage({ name, key: -1 })
      ? miscData
      : provisionedMiscData;

    if (!selectedMiscData) return;

    const artifacts = Object.entries(selectedMiscData.artifacts).sort(
      ([keyA], [keyB]) => {
        const countA = (keyA.match(/:/g) || []).length;
        const countB = (keyB.match(/:/g) || []).length;
        return countA - countB;
      }
    );

    const availableSources = artifacts.map(([key, value]: [string, any]) => ({
      key,
      value,
      sources: value.source ? JSON.parse(value.source.input).sources : [],
    }));

    // Try to find the specified source
    const sourceFound = availableSources.some((s) => {
      const decodedSource = decodeURIComponent(source);
      const sourceContent = s.sources[decodedSource]?.content;
      if (sourceContent) {
        const selection = handleSourceSelection(
          decodedSource,
          sourceContent,
          functionName
        );

        setSelectedCode(selection.code);
        setSelectedLanguage(selection.language);
        setSelectedKey(selection.key);
        setSelectedLine(selection.line);

        updateUrl(router, {
          name,
          version: pkg.version,
          chainId: pkg.chainId,
          preset: pkg.preset,
          packageName: selectedPackage.name,
          source: decodedSource,
          functionName,
        });

        return true;
      }
      return false;
    });

    // If source not found, select first available source
    if (!sourceFound) {
      const firstArtifact = artifacts[0];
      if (firstArtifact) {
        const [, firstArtifactValue] = firstArtifact;
        const sortedSources = Object.entries(
          JSON.parse((firstArtifactValue as any)?.source?.input).sources
        ).sort(([keyA], [keyB]) => {
          const countA = (keyA.match(/\//g) || []).length;
          const countB = (keyB.match(/\//g) || []).length;
          return countA - countB;
        });

        if (sortedSources.length) {
          const [sourceKey, sourceValue] = sortedSources[0];
          const selection = handleSourceSelection(
            sourceKey,
            (sourceValue as any)?.content,
            functionName
          );

          setSelectedCode(selection.code);
          setSelectedLanguage(selection.language);
          setSelectedKey(selection.key);
          setSelectedLine(selection.line);

          updateUrl(router, {
            name,
            version: pkg.version,
            chainId: pkg.chainId,
            preset: pkg.preset,
            packageName: selectedPackage.name,
            source: sourceKey,
            functionName,
          });
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
    isSelectedPackage,
    name,
    router,
    pkg.version,
    pkg.chainId,
    pkg.preset,
    selectedPackage.name,
  ]);

  const artifacts =
    // If the selected package is the main package, use the misc data
    isSelectedPackage({ name, key: -1 })
      ? miscData && Object.entries(miscData?.artifacts)
      : provisionedMiscData && Object.entries(provisionedMiscData?.artifacts);

  const handleSelectPackage = (p: { name: string; key: number }) => {
    setSelectedPackage(p);

    // Only navigate if this was triggered by a user action (not initial load)
    if (p.name !== selectedPackage.name) {
      const urlParams = new URLSearchParams();
      if (source) {
        urlParams.append('source', source);
      }
      if (functionName) {
        urlParams.append('function', functionName);
      }

      const newPath = `/packages/${name}/${tag}/${chainId}-${preset}/code${
        p.key !== -1 ? `/${p.name}` : ''
      }`;
      const fullUrl = urlParams.toString()
        ? `${newPath}?${urlParams.toString()}`
        : newPath;
      router.replace(fullUrl);
    }
  };

  // Select the right selected module based on the given moduleName
  // If the selected package is the main package, select the first source code
  useEffect(() => {
    if (deploymentData.isLoading) return;

    const foundPackage = availablePackages.find((p) => p.name === moduleName);
    const decodedSource = decodeURIComponent(source);
    if (
      foundPackage &&
      (foundPackage.name !== selectedPackage.name ||
        selectedKey !== decodedSource)
    ) {
      setSelectedPackage(foundPackage);
      setSelectedKey(decodedSource);
    }
  }, [
    moduleName,
    source,
    availablePackages.length,
    deploymentData.isLoading,
    availablePackages,
    selectedPackage.name,
    selectedKey,
  ]);

  // Select the first provisioned package if the main package has no code and no specific package is specified
  useEffect(() => {
    if (deploymentData.isLoading) return;

    const hasMainPackageArtifacts = !isEmpty(miscData?.artifacts);
    const isRootView = !moduleName && !source && !functionName;

    // Only redirect if we're at the root view with no artifacts in main package
    if (
      !hasMainPackageArtifacts &&
      provisionedPackagesKeys.length > 0 &&
      selectedPackage.key === -1 &&
      isRootView
    ) {
      // Just update the selected package without triggering navigation
      setSelectedPackage(availablePackages[1]);

      // Navigate to the first package without any additional parameters
      const newPath = `/packages/${name}/${tag}/${chainId}-${preset}/code/${availablePackages[1].name}`;
      router.replace(newPath);
    }
  }, [
    miscData?.artifacts,
    provisionedPackagesKeys.length,
    deploymentData.isLoading,
    selectedPackage.key,
    availablePackages,
    moduleName,
    source,
    functionName,
    name,
    tag,
    chainId,
    preset,
    router,
  ]);

  const handleSelectFile = (sourceKey: string, sourceValue: any) => {
    const selection = handleSourceSelection(
      sourceKey,
      sourceValue.content,
      functionName
    );

    setSelectedCode(selection.code);
    setSelectedLanguage(selection.language);
    setSelectedKey(selection.key);
    setSelectedLine(selection.line);

    updateUrl(router, {
      name,
      version: pkg.version,
      chainId: pkg.chainId,
      preset: pkg.preset,
      packageName: selectedPackage.name,
      source: sourceKey,
      functionName,
    });
  };

  const isLoading =
    !miscData ||
    isLoadingProvisionedPackageData ||
    isLoadingMiscData ||
    isLoadingProvisionedMiscData;

  const sidebarContent = (
    <SidebarContent className="overflow-y-auto">
      {/* Artifacts */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {artifacts?.map(([artifactKey, artifactValue]: [any, any]) => {
              const sources = artifactValue?.source?.input
                ? JSON.parse(artifactValue.source.input).sources
                : {};

              const fileTree = buildFileTree(Object.entries(sources));

              return (
                <div key={artifactKey} className="mb-2">
                  <SidebarMenuItem>
                    <div className="flex flex-row pr-2 items-center h-7">
                      <div className="max-w-[210px] overflow-hidden">
                        <SidebarGroupLabel>
                          {artifactKey.split(':').length > 1
                            ? artifactKey.split(':')[1]
                            : artifactKey}
                          .sol
                        </SidebarGroupLabel>
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="xs"
                            className="ml-auto w-6 h-6 p-0"
                            onClick={() => {
                              handleDownload(
                                (artifactValue as any)?.abi,
                                'deployments.json'
                              );
                            }}
                          >
                            <Download className="scale-75" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download ABI</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </SidebarMenuItem>
                  {/* File tree */}
                  {Object.values(fileTree).map((node) => (
                    <FileTreeItem
                      key={node.path}
                      node={node}
                      level={0}
                      onSelectFile={handleSelectFile}
                      selectedKey={selectedKey}
                    />
                  ))}
                </div>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Metadata */}
      {metadata?.cannonfile !== undefined && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <div className="flex px-2 items-center mb-1">
              <h3 className="font-medium text-sm text-gray-200 tracking-[0.1px]">
                Metadata
              </h3>

              <Button
                variant="outline"
                size="sm"
                className="ml-auto text-gray-300 border-gray-500 hover:bg-gray-700 w-6 h-6 p-0"
                onClick={() => {
                  handleDownload(metadata, 'metadata.json');
                }}
              >
                <Download className="scale-75" />
              </Button>
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div
                  className={`py-0.5 px-2 cursor-pointer text-sm hover:bg-gray-800 
                    ${
                      selectedKey === 'cannonfile'
                        ? 'font-medium bg-gray-800'
                        : ''
                    }`}
                  onClick={() => {
                    setSelectedCode(metadata.cannonfile);
                    setSelectedLanguage('toml');
                    setSelectedKey('cannonfile');
                  }}
                >
                  <div className="flex items-center">
                    <FileIcon size={16} className="mr-2" />
                    Cannonfile
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );

  const contentHeight =
    'calc(100vh -  var(--header-height) - var(--package-header-height) - var(--package-nav-height) - var(--package-code-contracts-nav-height) - var(--footer-height) )';

  return (
    <div className="flex flex-1 flex-col max-h-full max-w-full">
      {isLoading ? (
        <div
          className="flex items-center justify-center"
          style={{ height: contentHeight }}
        >
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : artifacts?.length || provisionedPackagesKeys.length ? (
        <>
          {/* List of SC tabs */}
          <div className="sticky top-0 z-[3] md:sticky h-[--package-code-contracts-nav-height] overflow-x-scroll overflow-y-hidden max-w-full border-b border-border bg-muted">
            <Tabs
              defaultValue={moduleName || name}
              value={selectedPackage.name}
              onValueChange={(value) => {
                const pkg = availablePackages.find((p) => p.name === value);
                if (pkg && pkg.name !== selectedPackage.name) {
                  handleSelectPackage(pkg);

                  // Preserve current source and function parameters
                  const urlParams = new URLSearchParams();
                  if (source) {
                    urlParams.append('source', source);
                  }
                  if (functionName) {
                    urlParams.append('function', functionName);
                  }

                  // Navigate to the new package
                  const newPath = `/packages/${name}/${tag}/${chainId}-${preset}/code/${value}`;
                  const fullUrl = urlParams.toString()
                    ? `${newPath}?${urlParams.toString()}`
                    : newPath;

                  // Use replace instead of push to avoid adding to history stack
                  router.replace(fullUrl);
                }
              }}
            >
              <TabsList className="h-full font-mono">
                {!isEmpty(miscData?.artifacts) && (
                  <TabsTrigger value={name} disabled={isLoading}>
                    {name}
                  </TabsTrigger>
                )}
                {provisionedPackagesKeys.map((k: string) => (
                  <TabsTrigger key={k} value={k} disabled={isLoading}>
                    [clone.{k}]
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <SidebarLayout
            sidebarContent={sidebarContent}
            centered={false}
            extraContentHeight="var(--package-header-height) - var(--package-nav-height) - var(--package-code-contracts-nav-height)"
          >
            <div className="h-full flex">
              {selectedCode.length ? (
                <>
                  {/* Make sure code preview is not rendered if function name exists but no selected line is set yet */}
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
                <div className="flex-1 flex items-center justify-center h-full">
                  <span className="text-gray-400">
                    <Info className="inline mr-2 -translate-y-[1px]" />
                    This package does not contain any code.
                  </span>
                </div>
              )}
            </div>
          </SidebarLayout>
        </>
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ height: contentHeight }}
        >
          <span className="text-gray-400">
            <Info className="inline mr-2 -translate-y-[1px]" />
            This package does not contain any code.
          </span>
        </div>
      )}
    </div>
  );
};
