'use client';

import {
  FC,
  ReactNode,
  useEffect,
  useState,
  createContext,
  useMemo,
} from 'react';
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
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { CustomSpinner } from '@/components/CustomSpinner';
import { usePackageByRef } from '@/hooks/api/usePackage';
import SearchInput from '@/components/SearchInput';
import { Address } from 'viem';

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

  return useMemo(() => {
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
  }, [pathName]);
}

type AllContracts = {
  moduleName: string;
  contractName: string;
  contractAddress: Address;
  highlight: boolean;
};

const processContracts = (
  allContractsRef: AllContracts[], // array passed by reference
  contracts: ChainArtifacts['contracts'],
  moduleName: string
) => {
  if (!contracts) return allContractsRef;

  const processedContracts = Object.entries(contracts).map(
    ([contractName, contractInfo]) => ({
      moduleName: moduleName,
      contractName,
      contractAddress: contractInfo.address,
      highlight: Boolean(contractInfo.highlight),
    })
  );

  // Add to the existing array (modifying the reference)
  allContractsRef.push(...processedContracts);
};

const processImports = (
  allContractsRef: AllContracts[], // array passed by reference
  imports: ChainArtifacts['imports'],
  parentModuleName = ''
) => {
  if (imports) {
    Object.entries(imports).forEach(([_moduleName, bundle]) => {
      // Concatenate module names
      const moduleName = `${parentModuleName}.${_moduleName}`;
      processContracts(allContractsRef, bundle.contracts, moduleName);
      // recursively process imports
      processImports(allContractsRef, bundle.imports, moduleName);
    });
  }
};

export const InteractTab: FC<{
  children?: ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const { name, tag, preset, chainId, variant } =
    usePackageNameTagVersionUrlParams();
  const packagesQuery = usePackageByRef({ name, tag, preset, chainId });

  const activeContractOption = useActiveContract();
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // const [routing, setRouting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const deploymentData = useQueryIpfsDataParsed<DeploymentInfo>(
    packagesQuery?.data?.deployUrl,
    !!packagesQuery?.data?.deployUrl
  );

  const hasSubnav = otherOptions.length > 0 || highlightedOptions.length > 1;

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

    const allContracts: AllContracts[] = [];
    const cannonOutputs = getOutput(deploymentData.data);
    processContracts(allContracts, cannonOutputs.contracts, name);
    processImports(allContracts, cannonOutputs.imports);

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
      const _contract = highlightedData[0] || otherData[0];
      if (_contract) {
        void router.push(
          `/packages/${name}/${tag}/${variant}/interact/${_contract.moduleName}/${_contract.contractName}/${_contract.contractAddress}`
        );
      }
    }
  }, [activeContractOption, deploymentData.data, name, router, tag, variant]);

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
                  onClick={async () =>
                    await router.push(
                      `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
                    )
                  }
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
                        {otherOptions.length > 5 && (
                          <Box mt={4} mx={4} minWidth={300}>
                            <SearchInput onSearchChange={setSearchTerm} />
                          </Box>
                        )}
                        {otherOptions
                          .filter((o) =>
                            searchTerm
                              ? o.contractName
                                  .toLowerCase()
                                  .includes(searchTerm)
                              : true
                          )
                          .map((option, i) => (
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
                                await router.push(
                                  `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
                                );
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

      {deploymentData.isLoading || packagesQuery.isLoading ? (
        <Flex
          justifyContent="center"
          alignItems="center"
          flexGrow={1}
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
