'use client';

import { FC, ReactNode, useEffect, useState, useMemo } from 'react';
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
// import { Interact } from '../Interact';

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
  const [cannonOutputs, setCannonOutputs] = useState<ChainArtifacts>({});
  const [highlightedOptions, setHighlightedOptions] = useState<Option[]>([]);
  const [otherOptions, setOtherOptions] = useState<Option[]>([]);
  const [activeContract, setActiveContract] = useState<string | undefined>();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const currentVariant = useMemo(
    () =>
      pkg?.variants.find((v: any) => v.name === variant && v.tag.name === tag),
    [pkg]
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
        setCannonOutputs(getOutput(_ipfs));

        // TODO: Map cannonOutputs data
        const higlightedData = [
          {
            moduleName: 'perpsFactory',
            contractName: 'PerpsMarketProxy',
            contractAddress: '0x9863Dae3f4b5F4Ffe3A841a21565d57F2BA10E87',
          },
          {
            moduleName: 'perpsFactory',
            contractName: 'PerpsAccountProxy',
            contractAddress: '0x518F2905b24AE298Ca06C1137b806DD5ACD493b6',
          },
        ];
        setHighlightedOptions(higlightedData);

        const otherData = [
          {
            moduleName: 'perpsFactory',
            contractName: 'PerpsMarketRouter',
            contractAddress: '0xB87397e26230850B707c2cf6a13F6DA447f2ca4e',
          },
        ];
        setOtherOptions(otherData);

        if (!activeContract) {
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
              {highlightedOptions.map((option) => (
                <Button
                  key={option.contractAddress}
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
              <Popover
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
                  width="auto"
                  bg="gray.900"
                  borderColor="gray.700"
                >
                  <PopoverBody p={0}>
                    {otherOptions.map((option) => (
                      <Box
                        key={option.contractAddress}
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
            </Box>
            {children}
            {/* <Interact variant={currentVariant} /> */}
          </Box>
        ) : (
          <CustomSpinner m="auto" />
        )}
      </Container>
    </Flex>
  );
};

export default InteractTab;
