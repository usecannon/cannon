'use client';

import { FC, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Tooltip,
  IconButton,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import 'prismjs';
import 'prismjs/components/prism-toml';
import { CodePreview } from '@/components/CodePreview';
import { useQueryIpfsData } from '@/hooks/ipfs';
import { DownloadIcon, InfoOutlineIcon } from '@chakra-ui/icons';
import { CustomSpinner } from '@/components/CustomSpinner';
import { isEmpty } from 'lodash';

const handleDownload = (content: JSON, filename: string) => {
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
  pkg: any;
  name: string;
  moduleName?: string;
  source: string;
  functionName?: string;
}> = ({ pkg, name, moduleName, source, functionName }) => {
  // For the main package, the key is -1
  const [selectedPackage, setSelectedPackage] = useState<{
    name: string;
    key: number;
  }>({
    name,
    key: -1,
  });
  const { data: metadata } = useQueryIpfsData(pkg?.metaUrl, !!pkg?.metaUrl);

  const deploymentData = useQueryIpfsData(pkg?.deployUrl, !!pkg?.deployUrl);

  // Provisioned packages could be inside the "provision" (old) or "clone" (current) key
  // So we check both in order to keep backwards compatibility
  const provisionedPackagesKeys =
    deploymentData?.data?.def?.provision || deploymentData?.data?.def?.clone
      ? Object.keys(
          deploymentData?.data?.def?.provision ||
            deploymentData?.data?.def?.clone
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
  } = useQueryIpfsData(
    provisionArtifacts[selectedPackage.key]?.artifacts?.imports[
      selectedPackage.name
    ]?.url,
    !!provisionArtifacts[selectedPackage.key]?.artifacts?.imports[
      selectedPackage.name
    ]?.url
  );

  const provisionedMiscUrl = provisionedPackageData?.miscUrl;
  const { data: provisionedMiscData, isLoading: isLoadingProvisionedMiscData } =
    useQueryIpfsData(provisionedMiscUrl, !!provisionedMiscUrl);

  let miscUrl: string | undefined;
  if (deploymentData?.data) {
    miscUrl =
      typeof deploymentData?.data === 'string'
        ? JSON.parse(deploymentData?.data)?.miscUrl
        : JSON.parse(JSON.stringify((deploymentData as any)?.data))?.miscUrl;
  }

  const { data: miscData, isLoading: isLoadingMiscData } = useQueryIpfsData(
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
          sources: JSON.parse(value.source.input).sources,
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
            `/packages/${name}/${pkg.version}/${pkg.name}/code/${
              selectedPackage.name
            }?${urlParams.toString()}`
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

        const [sourceKey, sourceValue] = sortedSources[0];
        setSelectedCode((sourceValue as any)?.content);
        setSelectedLanguage('sol');
        setSelectedKey(sourceKey);

        window.history.pushState(
          null,
          '',
          `/packages/${name}/${pkg.version}/${pkg.name}/code/${
            selectedPackage.name
          }?source=${encodeURIComponent(sourceKey)}`
        );
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

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const [selectedCode, setSelectedCode] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedLine, setSelectedLine] = useState<undefined | number>();

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
      `/packages/${name}/${pkg.version}/${pkg.name}/code/${
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
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      {isLoading ? (
        <CustomSpinner m="auto" />
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
          <Flex flex="1" direction={['column', 'column', 'row']}>
            <Flex
              flexDirection="column"
              overflowY="auto"
              maxWidth={['100%', '100%', '320px']}
              borderRight={isSmall ? 'none' : '1px solid'}
              borderBottom={isSmall ? '1px solid' : 'none'}
              borderColor={isSmall ? 'gray.600' : 'gray.700'}
              width={['100%', '100%', '320px']}
              maxHeight={['140px', '140px', 'calc(100vh - 236px)']}
            >
              <Box px={3} pb={2}>
                {artifacts.map(([artifactKey, artifactValue]: [any, any]) => {
                  return (
                    <Box key={artifactKey} mt={4}>
                      <Flex
                        flexDirection="row"
                        px="2"
                        alignItems="center"
                        mb="1"
                      >
                        <Heading
                          fontWeight="500"
                          size="sm"
                          color="gray.200"
                          letterSpacing="0.1px"
                          mr="1"
                        >
                          {artifactKey.split(':').length > 1
                            ? artifactKey.split(':')[1]
                            : artifactKey}
                        </Heading>

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
                              <Tooltip
                                label={sourceKey}
                                key={sourceKey}
                                placement="right"
                              >
                                <Box
                                  borderRadius="md"
                                  mb={0.5}
                                  py={0.5}
                                  px="2"
                                  cursor="pointer"
                                  fontSize="sm"
                                  _hover={{ background: 'gray.800' }}
                                  onClick={() =>
                                    handleSelectFile(sourceKey, sourceValue)
                                  }
                                  whiteSpace="nowrap"
                                  overflow="hidden"
                                  textOverflow="ellipsis"
                                  style={{
                                    direction: 'rtl', // Reverses the text display order
                                    unicodeBidi: 'bidi-override', // Overrides the default bidi algorithm
                                  }}
                                  textAlign="left" // Left-aligns the text
                                  fontWeight={
                                    selectedKey == sourceKey
                                      ? 'medium'
                                      : undefined
                                  }
                                  background={
                                    selectedKey == sourceKey
                                      ? 'gray.800'
                                      : undefined
                                  }
                                >
                                  {sourceKey.split('').reverse().join('')}
                                </Box>
                              </Tooltip>
                            );
                          })}
                    </Box>
                  );
                })}

                {metadata?.cannonfile && (
                  <>
                    <Box mt={4}>
                      <Flex
                        flexDirection="row"
                        px="2"
                        alignItems="center"
                        mb="1"
                      >
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
                        ></IconButton>
                      </Flex>
                    </Box>

                    <Box
                      borderRadius="md"
                      mb={0.5}
                      py={0.5}
                      px="2"
                      cursor="pointer"
                      fontSize="sm"
                      _hover={{ background: 'gray.800' }}
                      onClick={() => {
                        setSelectedCode(metadata.cannonfile);
                        setSelectedLanguage('toml');
                        setSelectedKey('cannonfile');
                      }}
                      fontWeight={
                        selectedKey == 'cannonfile' ? 'medium' : undefined
                      }
                    >
                      Cannonfile
                    </Box>
                  </>
                )}
              </Box>
            </Flex>

            <Box
              flex="1"
              overflowY="auto"
              maxHeight={['none', 'none', 'calc(100vh - 236px)']}
              background="gray.800"
            >
              {/* Make sure code preview is not rendered if function name exists but no selected line is set yet */}
              {!selectedLine && functionName ? null : (
                <CodePreview
                  code={selectedCode}
                  language={selectedLanguage}
                  height="100%"
                  line={selectedLine}
                />
              )}
            </Box>
          </Flex>
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
