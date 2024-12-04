'use client';

import { FC, useEffect, useState } from 'react';
import { Box, Button, Flex, Heading, Text, IconButton } from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import { DownloadIcon, InfoOutlineIcon } from '@chakra-ui/icons';
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

const PackageButton: FC<{
  name: string;
  selected: boolean;
  onClick: () => void;
}> = ({ name, selected, onClick }) => {
  return (
    <Button
      color="white"
      borderWidth="2px"
      borderRadius="md"
      variant="outline"
      aria-label="contract name"
      boxShadow="lg"
      flexShrink={0}
      background={selected ? 'teal.900' : 'gray.700'}
      borderColor={selected ? 'teal.600' : 'gray.600'}
      _hover={
        selected
          ? {
              background: 'teal.800',
              borderColor: 'teal.500',
            }
          : {
              background: 'gray.600',
              borderColor: 'teal.500',
            }
      }
      mr={3}
      height="36px"
      px={3}
      onClick={onClick}
    >
      <Box textAlign="left">
        <Heading
          fontWeight="500"
          size="sm"
          color="gray.200"
          letterSpacing="0.1px"
        >
          {name}
        </Heading>
      </Box>
    </Button>
  );
};

export const CodeExplorer: FC<{
  pkg: ApiPackage;
  name: string;
  moduleName?: string;
  source: string;
  functionName?: string;
}> = ({ pkg, name, moduleName, source, functionName }) => {
  const router = useRouter();
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
    // Update state for immediate UI feedback
    setSelectedCode(sourceValue.content);
    setSelectedLanguage('sol');
    setSelectedKey(sourceKey);

    // Use Next.js router for navigation
    router.push(
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
                <Box key={artifactKey} mt={4}>
                  {/* Artifact name */}
                  <SidebarMenuItem>
                    <Flex flexDirection="row" px="2" alignItems="center" mb="1">
                      <Box maxW="210px" overflow="hidden">
                        <Heading
                          fontWeight="500"
                          size="sm"
                          color="gray.200"
                          letterSpacing="0.1px"
                          mr="1"
                          isTruncated
                        >
                          {artifactKey.split(':').length > 1
                            ? artifactKey.split(':')[1]
                            : artifactKey}
                        </Heading>
                      </Box>

                      <Button
                        variant="outline"
                        colorScheme="white"
                        size="xs"
                        color="gray.300"
                        borderColor="gray.500"
                        _hover={{ bg: 'gray.700' }}
                        leftIcon={<DownloadIcon />}
                        onClick={() => {
                          handleDownload(
                            (artifactValue as any)?.abi,
                            'deployments.json'
                          );
                        }}
                        ml="auto"
                      >
                        ABI
                      </Button>
                    </Flex>
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
                </Box>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Metadata */}
      {metadata?.cannonfile !== undefined && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <Flex px="2" alignItems="center" mb="1">
              <Heading
                fontWeight="500"
                size="sm"
                color="gray.200"
                letterSpacing="0.1px"
              >
                Metadata
              </Heading>

              <IconButton
                aria-label="Download Metadata"
                variant="outline"
                colorScheme="white"
                size="xs"
                color="gray.300"
                borderColor="gray.500"
                _hover={{ bg: 'gray.700' }}
                icon={<DownloadIcon />}
                onClick={() => {
                  handleDownload(metadata, 'metadata.json');
                }}
                ml="auto"
              />
            </Flex>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Box
                  py={0.5}
                  px="2"
                  cursor="pointer"
                  fontSize="sm"
                  _hover={{ bg: 'gray.800' }}
                  onClick={() => {
                    setSelectedCode(metadata.cannonfile);
                    setSelectedLanguage('toml');
                    setSelectedKey('cannonfile');
                  }}
                  fontWeight={
                    selectedKey === 'cannonfile' ? 'medium' : undefined
                  }
                  bg={selectedKey === 'cannonfile' ? 'gray.800' : undefined}
                >
                  <Flex alignItems="center">
                    <FileIcon size={16} className="mr-2" />
                    Cannonfile
                  </Flex>
                </Box>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      {isLoading ? (
        <div className="py-20">
          <IpfsSpinner ipfsUrl={pkg?.deployUrl} />
        </div>
      ) : artifacts?.length || provisionedPackagesKeys.length ? (
        <>
          {!!provisionedPackagesKeys.length && (
            <Flex
              top="0"
              zIndex={3}
              bg="gray.900"
              position={{ md: 'sticky' }}
              overflowX="scroll"
              overflowY="hidden"
              maxW="100%"
              p={2}
              borderBottom="1px solid"
              borderColor="gray.800"
              flexWrap="nowrap"
            >
              {!isEmpty(miscData?.artifacts) && (
                <PackageButton
                  key={-1}
                  name={name}
                  selected={isSelectedPackage({ name, key: -1 })}
                  onClick={() => handleSelectPackage({ name, key: -1 })}
                />
              )}
              {provisionedPackagesKeys.map((k: string, i: number) => (
                <PackageButton
                  key={k}
                  name={k}
                  selected={isSelectedPackage({ name: k, key: i })}
                  onClick={() => handleSelectPackage({ name: k, key: i })}
                />
              ))}
            </Flex>
          )}
          <div className="h-[671px]">
            <SidebarLayout
              sidebarContent={sidebarContent}
              centered={false}
              contentHeight="671px"
            >
              <Flex className="h-full">
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
                  <Flex
                    flex="1"
                    height="100%"
                    alignItems="center"
                    justifyContent="center"
                    p={4}
                  >
                    <Text color="gray.400">
                      <InfoOutlineIcon transform="translateY(-1px)" /> Code
                      unavailable
                    </Text>
                  </Flex>
                )}
              </Flex>
            </SidebarLayout>
          </div>
        </>
      ) : (
        <Flex flex="1" alignItems="center" justifyContent="center" p={4}>
          <Text color="gray.400">
            <InfoOutlineIcon transform="translateY(-1px)" /> This package does
            not contain any code.
          </Text>
        </Flex>
      )}
    </Flex>
  );
};
