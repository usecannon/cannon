'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
import axios from 'axios';
import pako from 'pako';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
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
import { useRouter } from 'next/navigation';
import { Interact } from '../Interact';

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
  const { data } = useQuery<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  const router = useRouter();

  const [pkg, setPackage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [activeContract, setActiveContract] = useState<string | undefined>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

  const selectContract = (contractAddress: string) => {
    setActiveContract(contractAddress);
    void router.push(
      `/packages/${name}/${tag}/${variant}/interact/${contractAddress}`
    );
  };

  useEffect(() => {
    if (!currentVariant) return;
    setLoading(true);

    const controller = new AbortController();

    const url = `https://ipfs.io/ipfs/${currentVariant?.deploy_url.replace(
      'ipfs://',
      ''
    )}`;

    axios
      .get(url, { responseType: 'arraybuffer' })
      .then((response) => {
        // Parse IPFS data
        const uint8Array = new Uint8Array(response.data);
        const inflated = pako.inflate(uint8Array);
        const raw = new TextDecoder().decode(inflated);
        const _ipfs = JSON.parse(raw);

        // Get Builder Outputs
        const cannonOutputs: ChainArtifacts = getOutput(_ipfs);

        let higlightedData: Option[] = [];
        if (cannonOutputs.contracts) {
          const contracts = Object.entries(cannonOutputs.contracts).map(
            ([k, v]) => ({
              name: k,
              address: v.address,
              highlight: v.highlight,
            })
          );

          const higlightedContracts = contracts.filter(
            (contract) => contract.highlight
          );

          higlightedData = (
            higlightedContracts.length > 0 ? higlightedContracts : contracts
          ).map((contract) => ({
            moduleName: name,
            contractName: contract.name,
            contractAddress: contract.address,
          }));
        }
        setHighlightedOptions(higlightedData);

        const otherData: Option[] = [];
        const addOtherData = (
          contracts: any,
          moduleName: string,
          imports: any
        ) => {
          if (contracts) {
            Object.entries(contracts).forEach(([k, v]) =>
              otherData.push({
                moduleName,
                contractName: k,
                contractAddress: (v as any).address,
              })
            );
          }

          if (imports) {
            Object.entries(imports).forEach(([k, v]) =>
              addOtherData((v as any).contracts, k, (v as any).imports)
            );
          }
        };
        addOtherData(undefined, '', cannonOutputs.imports);
        setOtherOptions(otherData);

        if (!activeContract && higlightedData.length > 0) {
          selectContract(higlightedData[0].contractAddress);
        }
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [currentVariant]);

  return (
    <Flex flexDirection="column" width="100%">
      <Container maxW="container.lg" my={8}>
        <Alert
          mb="6"
          status="warning"
          bg="gray.800"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="sm"
        >
          <AlertIcon />
          <Text fontWeight="bold">
            Always review transactions carefully in your wallet application
            prior to execution
          </Text>
        </Alert>

        {currentVariant && !loading ? (
          <Box>
            <Box mb={2}>
              {highlightedOptions.map((option, i) => (
                <Button
                  key={i}
                  color="white"
                  borderWidth="2px"
                  borderRadius="md"
                  variant="outline"
                  aria-label="contract name"
                  boxShadow="lg"
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
                  mb={4}
                  height="48px"
                  minWidth="48px"
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
                      mr={4}
                      mb={4}
                      height="48px"
                      width="48px"
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
            </Box>
            {children}
            <Interact variant={currentVariant} />
          </Box>
        ) : (
          <CustomSpinner m="auto" />
        )}
      </Container>
    </Flex>
  );
};

export default InteractTab;
