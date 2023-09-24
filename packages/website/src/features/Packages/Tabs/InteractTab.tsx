'use client';

import { FC, useEffect, useState } from 'react';
import { GET_PACKAGE } from '@/graphql/queries';
import { useQuery } from '@apollo/client';
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
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
} from '@chakra-ui/react';
import { Interact } from '@/features/Packages/Interact';
import { CustomSpinner } from '@/components/CustomSpinner';

export const InteractTab: FC<{
  name: string;
  tag: string;
  variant: string;
}> = ({ name, tag, variant }) => {
  const { data } = useQuery<any, any>(GET_PACKAGE, {
    variables: { name },
  });

  useEffect(() => {
    if (data?.packages[0]) setPackage(data?.packages[0]);
  }, [data]);

  const [pkg, setPackage] = useState<any | null>(null);

  const currentVariant = pkg?.variants.find(
    (v: any) => v.name === variant && v.tag.name === tag
  );

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

        {currentVariant ? (
          <Box>
            <Box mb={2}>
              <Button
                color="white"
                borderWidth="2px"
                borderRadius="md"
                variant="outline"
                aria-label="contract name"
                boxShadow="lg"
                background={'teal.900'}
                borderColor={'teal.600'}
                _hover={{
                  background: 'teal.800',
                  borderColor: 'teal.500',
                }}
                mr={4}
                mb={4}
                height="48px"
                minWidth="48px"
                px={2}
              >
                <Box textAlign="left">
                  <Text
                    fontSize="xs"
                    display="block"
                    fontWeight="normal"
                    color="gray.400"
                    mb="1px"
                  >
                    perpsFactory
                  </Text>
                  <Heading
                    fontWeight="500"
                    size="sm"
                    color="gray.200"
                    letterSpacing="0.1px"
                  >
                    PerpsMarketProxy
                  </Heading>
                </Box>
              </Button>
              <Button
                color="white"
                borderWidth="2px"
                borderRadius="md"
                variant="outline"
                aria-label="contract name"
                boxShadow="lg"
                background={'gray.700'}
                borderColor={'gray.600'}
                _hover={{
                  background: 'gray.600',
                  borderColor: 'teal.500',
                }}
                mr={4}
                mb={4}
                height="48px"
                minWidth="48px"
                px={2}
              >
                <Box textAlign="left">
                  <Text
                    fontSize="xs"
                    display="block"
                    fontWeight="normal"
                    color="gray.400"
                    mb="1px"
                  >
                    perpsFactory
                  </Text>
                  <Heading
                    fontWeight="500"
                    size="sm"
                    color="gray.200"
                    letterSpacing="0.1px"
                  >
                    PerpsAccountProxy
                  </Heading>
                </Box>
              </Button>
              <Popover>
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
                    <Box
                      textAlign="left"
                      p={2}
                      _hover={{
                        background: 'gray.800',
                      }}
                      borderBottom="1px solid"
                      borderColor="gray.700"
                    >
                      <Text
                        fontSize="xs"
                        display="block"
                        fontWeight="normal"
                        color="gray.400"
                        mb="1px"
                      >
                        not highlighted
                      </Text>
                      <Heading
                        fontWeight="500"
                        size="sm"
                        color="gray.200"
                        letterSpacing="0.1px"
                      >
                        ContractName
                      </Heading>
                    </Box>

                    <Box
                      textAlign="left"
                      p={2}
                      _hover={{
                        background: 'gray.800',
                      }}
                    >
                      <Text
                        fontSize="xs"
                        display="block"
                        fontWeight="normal"
                        color="gray.400"
                        mb="1px"
                      >
                        not highlighted
                      </Text>
                      <Heading
                        fontWeight="500"
                        size="sm"
                        color="gray.200"
                        letterSpacing="0.1px"
                      >
                        ContractName
                      </Heading>
                    </Box>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Box>
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
