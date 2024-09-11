'use client';

import { FC, ReactNode, useEffect, useState, createContext } from 'react';
import { useQueryIpfsDataParsed } from '@/hooks/ipfs';
import {
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
} from '@chakra-ui/react';
import { ChainArtifacts, DeploymentInfo } from '@usecannon/builder';
import { getOutput } from '@/lib/builder';
import { useRouter } from 'next/router';
import { usePackageVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePackageByRef } from '@/hooks/api/usePackage';

type Option = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
};

export const SubnavContext = createContext<{ hasSubnav: boolean }>({
  hasSubnav: true,
});

function useActiveContract() {
  const pathName = useRouter().asPath;
  // first remove the hash and selected method
  // then split the path by the interact keyword
  const activeContractPath = pathName.split('#')[0].split('interact/')[1];

  if (activeContractPath) {
    const [moduleName, contractName, contractAddress] =
      activeContractPath.split('/');

    return {
      moduleName,
      contractName,
      contractAddress,
    };
  }

  return undefined;
}

export const InteractTab: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { name, tag, preset, chainId, variant } = usePackageVersionUrlParams();
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const activeContractOption = useActiveContract();
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [routing, setRouting] = useState(false);
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const hasSubnav = otherOptions.length > 0 || highlightedOptions.length > 1;

  const selectContract = async (contract: Option) => {
    setRouting(true);
    await router.replace(
      `/packages/${name}/${tag}/${variant}/interact/${contract.moduleName}/${contract.contractName}/${contract.contractAddress}`,
      undefined,
      { shallow: true }
    );
    setRouting(false);
  };

  const isActiveContract = (contract: Option) => {
    if (!activeContractOption) return false;
    return (
      activeContractOption.moduleName === contract.moduleName &&
      activeContractOption.contractName === contract.contractName &&
      activeContractOption.contractAddress === contract.contractAddress
    );
  };

  useEffect(() => {
    if (!deploymentData.data) {
      return;
    }

    let allContracts: any[] = [];

    const processContracts = (contracts: any, moduleName: string) => {
      if (contracts) {
        const processedContracts = Object.entries(contracts).map(([k, v]) => ({
          moduleName: moduleName,
          contractName: k,
          contractAddress: (v as any).address,
          highlight: (v as any).highlight,
        }));
        allContracts = allContracts.concat(processedContracts);
      }
    };

    const cannonOutputs: ChainArtifacts = getOutput(deploymentData.data);

    if (cannonOutputs.contracts) {
      processContracts(cannonOutputs.contracts, name);
    }

    const processImports = (imports: any, parentModuleName: string) => {
      if (imports) {
        Object.entries(imports).forEach(([k, v]) => {
          const moduleName = parentModuleName ? `${parentModuleName}.${k}` : k;
          processContracts((v as any).contracts, moduleName);
          processImports((v as any).imports, moduleName);
        });
      }
    };

    processImports(cannonOutputs.imports, '');

    const highlightedContracts = allContracts.filter(
      (contract) => contract.highlight
    );
    const proxyContracts = allContracts.filter((contract) =>
      contract.contractName.toLowerCase().includes('proxy')
    );

    let highlightedData: any[] = [];
    if (highlightedContracts.length > 0) {
      highlightedData = highlightedContracts;
    } else if (proxyContracts.length > 0) {
      highlightedData = proxyContracts;
    } else {
      highlightedData = allContracts;
    }

    const uniqueAddresses = new Set();
    for (const contractData of highlightedData) {
      uniqueAddresses.add(contractData.contractAddress);
    }

    for (const uniqueAddress of uniqueAddresses) {
      const excessContracts = highlightedData.filter(
        (contract) => contract.contractAddress === uniqueAddress
      );
      excessContracts.sort((a, b) => {
        const accumulateDeepLevel = (acc: number, cur: string) =>
          cur === '.' ? acc + 1 : acc;
        const getModuleNameDeepLevel = (moduleName: string) =>
          moduleName.split('').reduce(accumulateDeepLevel, 0);
        const aDeepLevel = getModuleNameDeepLevel(a.moduleName);
        const bDeepLevel = getModuleNameDeepLevel(b.moduleName);
        return aDeepLevel - bDeepLevel;
      });
      excessContracts.shift();
      highlightedData = highlightedData.filter(
        (contract) => !excessContracts.includes(contract)
      );
    }

    setHighlightedOptions(
      highlightedData.sort((a, b) => {
        const valueA: string = a['contractName'];
        const valueB: string = b['contractName'];
        return valueA.localeCompare(valueB);
      })
    );

    const otherData = allContracts.filter(
      (contract) => !highlightedData.includes(contract)
    );
    setOtherOptions(
      otherData.sort((a, b) => {
        const valueA: string = a['contractName'];
        const valueB: string = b['contractName'];
        return valueA.localeCompare(valueB);
      })
    );

    if (!activeContractOption) {
      if (highlightedData.length > 0) {
        void selectContract(highlightedData[0]);
      } else if (otherData.length > 0) {
        void selectContract(otherData[0]);
      }
    }
  }, [deploymentData.data]);

  return (
    <SubnavContext.Provider value={{ hasSubnav: true }}>
      {hasSubnav && (
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
          {
            <>
              {/* Tabs options */}
              {highlightedOptions.map((option, i) => (
                <Button
                  key={i}
                  color="white"
                  borderWidth="2px"
                  borderRadius="md"
                  variant="outline"
                  aria-label="contract name"
                  boxShadow="lg"
                  flexShrink={0}
                  background={
                    isActiveContract(option) ? 'teal.900' : 'gray.700'
                  }
                  borderColor={
                    isActiveContract(option) ? 'teal.600' : 'gray.600'
                  }
                  _hover={
                    isActiveContract(option)
                      ? {
                          background: 'teal.800',
                          borderColor: 'teal.500',
                        }
                      : {
                          background: 'gray.600',
                          borderColor: 'teal.500',
                        }
                  }
                  mr={4}
                  height="48px"
                  px={2}
                  onClick={() => selectContract(option)}
                >
                  <Box textAlign="left">
                    <Text
                      fontSize="xs"
                      display="block"
                      fontWeight="normal"
                      color="gray.400"
                      mb="1px"
                    >
                      {option.moduleName}
                    </Text>
                    <Heading
                      fontWeight="500"
                      size="sm"
                      color="gray.200"
                      letterSpacing="0.1px"
                    >
                      {option.contractName}
                    </Heading>
                  </Box>
                </Button>
              ))}
              {/* other options (dots) */}
              {otherOptions.length > 0 && (
                <Popover
                  placement="bottom-start"
                  isOpen={isPopoverOpen}
                  onOpen={() => setIsPopoverOpen(true)}
                  onClose={() => setIsPopoverOpen(false)}
                >
                  <PopoverTrigger>
                    <Button
                      color="white"
                      borderColor={'gray.600'}
                      borderWidth="2px"
                      borderRadius="md"
                      variant="outline"
                      background={'gray.700'}
                      aria-label="Settings"
                      boxShadow="lg"
                      _hover={{
                        background: 'gray.600',
                        borderColor: 'teal.500',
                      }}
                      height="48px"
                      width="48px"
                      flexShrink={0}
                      p={0}
                    >
                      <Icon
                        boxSize={48}
                        opacity={0.5}
                        _hover={{ opacity: 1 }}
                        viewBox="0 0 48 48"
                        width="48px"
                        height="48px"
                        fill="white"
                        stroke="none"
                      >
                        <circle cx="13" cy="24" r="3"></circle>
                        <circle cx="24" cy="24" r="3"></circle>
                        <circle cx="35" cy="24" r="3"></circle>
                      </Icon>
                    </Button>
                  </PopoverTrigger>
                  <Portal>
                    <PopoverContent
                      maxHeight={'45vh'}
                      overflowY={'auto'}
                      overflowX={'hidden'}
                      width="auto"
                      bg="gray.900"
                      borderColor="gray.700"
                    >
                      <PopoverBody p={0}>
                        {otherOptions.map((option, i) => (
                          <Box
                            key={i}
                            cursor={'pointer'}
                            textAlign="left"
                            p={2}
                            background={
                              isActiveContract(option)
                                ? 'gray.800'
                                : 'transparent'
                            }
                            _hover={{
                              background: 'gray.800',
                            }}
                            borderBottom="1px solid"
                            borderColor="gray.700"
                            onClick={async () => {
                              setIsPopoverOpen(false);
                              await selectContract(option);
                            }}
                          >
                            <Text
                              fontSize="xs"
                              display="block"
                              fontWeight="normal"
                              color="gray.400"
                              mb="1px"
                            >
                              {option.moduleName}
                            </Text>
                            <Heading
                              fontWeight="500"
                              size="sm"
                              color="gray.200"
                              letterSpacing="0.1px"
                            >
                              {option.contractName}
                            </Heading>
                          </Box>
                        ))}
                      </PopoverBody>
                    </PopoverContent>
                  </Portal>
                </Popover>
              )}
            </>
          }
        </Flex>
      )}

      {deploymentData.isLoading || packagesQuery.isLoading || routing ? (
        <Flex
          justifyContent="center"
          alignItems="center"
          height="100%"
          width="100%"
        >
          <CustomSpinner />
        </Flex>
      ) : (
        <Box>{children}</Box>
      )}
    </SubnavContext.Provider>
  );
};

export default InteractTab;
