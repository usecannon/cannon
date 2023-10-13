'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQueryCannonSubgraphData } from '@/hooks/subgraph';
import { useQueryIpfsData } from '@/hooks/ipfs';
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
  Text,
} from '@chakra-ui/react';
import { CustomSpinner } from '@/components/CustomSpinner';
import { ChainArtifacts } from '@usecannon/builder';
import { getOutput } from '@/lib/builder';
import { usePathname, useRouter } from 'next/navigation';

type Option = {
  moduleName: string;
  contractName: string;
  contractAddress: string;
};

export const InteractTab: FC<{
  name: string;
  tag: string;
  variant: string;
  children?: ReactNode;
}> = ({ name, tag, variant, children }) => {
  const { data } = useQueryCannonSubgraphData<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  const pathName = usePathname();
  const activeContract = pathName.split('interact/')[1];
  const router = useRouter();

  const [pkg, setPackage] = useState<any | null>(null);
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

  const selectContract = (contractAddress: string) => {
    void router.push(
      `/packages/${name}/${tag}/${variant}/interact/${contractAddress}`
    );
  };

  const deploymentData = useQueryIpfsData(
    currentVariant?.deploy_url,
    !!currentVariant?.deploy_url
  );

  useEffect(() => {
    if (!deploymentData.data) {
      return;
    }

    let highlightedData: any[] = [];
    let allContracts: any[] = [];

    const processContracts = (contracts: any, moduleName: string) => {
      const processedContracts = Object.entries(contracts).map(([k, v]) => ({
        moduleName: moduleName,
        contractName: k,
        contractAddress: (v as any).address,
        highlight: (v as any).highlight,
      }));
      allContracts = allContracts.concat(processedContracts);
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

    if (highlightedContracts.length > 0) {
      highlightedData = highlightedContracts;
    } else if (proxyContracts.length > 0) {
      highlightedData = proxyContracts;
    } else {
      highlightedData = allContracts;
    }

    setHighlightedOptions(highlightedData);

    const otherData = allContracts.filter(
      (contract) => !highlightedData.includes(contract)
    );
    setOtherOptions(otherData);

    if (!activeContract) {
      if (highlightedData.length > 0) {
        selectContract(highlightedData[0].contractAddress);
      } else if (otherData.length > 0) {
        selectContract(otherData[0].contractAddress);
      }
    }
  }, [deploymentData.data]);

  return (
    <>
      <Flex
        overflowX="scroll"
        maxW="100%"
        p={2}
        borderBottom="1px solid"
        borderColor="gray.800"
        flexWrap="nowrap"
      >
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
              activeContract === option.contractAddress
                ? 'teal.900'
                : 'gray.700'
            }
            borderColor={
              activeContract === option.contractAddress
                ? 'teal.600'
                : 'gray.600'
            }
            _hover={
              activeContract === option.contractAddress
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
            onClick={() => selectContract(option.contractAddress)}
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
                      activeContract === option.contractAddress
                        ? 'gray.800'
                        : 'transparent'
                    }
                    _hover={{
                      background: 'gray.800',
                    }}
                    borderBottom="1px solid"
                    borderColor="gray.700"
                    onClick={() => {
                      setIsPopoverOpen(false);
                      selectContract(option.contractAddress);
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
          </Popover>
        )}
      </Flex>

      {currentVariant && !deploymentData.isLoading ? (
        <Box>{children}</Box>
      ) : (
        <CustomSpinner m="auto" />
      )}
    </>
  );
};

export default InteractTab;
