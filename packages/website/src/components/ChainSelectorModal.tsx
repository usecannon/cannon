import { useSwitchChain, useChainId } from 'wagmi';
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalCloseButton,
  Flex,
  Heading,
  Text,
  Box,
  Input,
  InputGroup,
  InputLeftElement,
} from '@chakra-ui/react';
import { debounce } from 'lodash';
import { SearchIcon } from '@chakra-ui/icons';
import Chain from '@/features/Search/PackageCard/Chain';

const ChainButton = ({
  switching,
  connected,
  chain,
  onClick,
}: {
  switching?: boolean;
  connected: boolean;
  chain: {
    id: number;
    name: string;
  };
  onClick: () => void;
}) => {
  return (
    <Box
      onClick={onClick}
      cursor="pointer"
      display="flex"
      alignItems="center"
      borderWidth="1px"
      borderColor={'gray.700'}
      key={chain.id}
      mb={2}
      px={2}
      py={1}
      borderRadius="md"
      _hover={{ background: 'blackAlpha.400' }}
    >
      <Flex justifyContent="space-between" alignItems="center" w="100%">
        <Flex gap={2} alignItems="center">
          <Chain id={chain.id} />
        </Flex>
        {connected ? (
          <Text
            color="green.400"
            fontSize="sm"
            textShadow="0px 0px 4px #00ff00"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="1.5px"
            fontFamily="var(--font-miriam)"
          >
            Connected
          </Text>
        ) : switching ? (
          <Text
            color="yellow.400"
            fontSize="sm"
            textShadow="0px 0px 4px #ffff00"
            fontWeight="medium"
            textTransform="uppercase"
            letterSpacing="1.5px"
            fontFamily="var(--font-miriam)"
          >
            Confirm in wallet
          </Text>
        ) : null}
      </Flex>
    </Box>
  );
};

const ChainSelectorModal = ({
  onClose,
  isOpen,
}: {
  onClose: () => void;
  isOpen: boolean;
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { chains, switchChain, isSuccess, isError } = useSwitchChain();

  const [switchingToChainId, setSwitchingToChainId] = useState<number | null>(
    null
  );
  const chainId = useChainId();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChains = chains.filter((chain) =>
    chain.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close the modal when the chain switch is successful or failed,
  // use the switchingToChainId to determine if the chain switch is in progress
  useEffect(() => {
    if (isSuccess && switchingToChainId !== null) {
      onClose();
      setSwitchingToChainId(null);
      setSearchTerm('');
    }
  }, [isSuccess, onClose]);

  useEffect(() => {
    if (isError && switchingToChainId !== null) {
      setSwitchingToChainId(null);
    }
  }, [isError, onClose]);

  // Popular chains
  const popularChainsIds = [13370, 1, 10, 8453, 42161];
  const popularChains = chains.filter((chain) =>
    popularChainsIds.includes(chain.id)
  );

  const otherChains = chains.filter(
    (chain) => !popularChainsIds.includes(chain.id)
  );

  const handleSearchChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    300
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay bg={'rgba(0, 0, 0, 0.7)'} />
        <ModalContent
          alignSelf={'center'}
          bg="gray.900"
          color="white"
          borderRadius="xl"
          borderColor="gray.700"
          h={'50%'}
          overflow={'auto'}
        >
          <ModalHeader>Select Chain</ModalHeader>
          <ModalCloseButton mt="1.5" />
          <ModalBody pt={0}>
            <Flex
              direction="column"
              align="center"
              justify="center"
              mb="4"
              gap={2}
            >
              <InputGroup borderColor="gray.600" mb={4}>
                <InputLeftElement pointerEvents="none">
                  <SearchIcon color="gray.500" />
                </InputLeftElement>
                <Input onChange={handleSearchChange} ref={searchInputRef} />
              </InputGroup>

              {searchTerm && filteredChains.length === 0 && (
                <Heading
                  my={32}
                  color="gray.200"
                  fontSize="sm"
                  fontWeight={500}
                >
                  No chains found
                </Heading>
              )}
              {searchTerm && filteredChains.length > 0 && (
                <Box mb="4" w="100%">
                  <Heading
                    mb={2}
                    color="gray.200"
                    fontSize="sm"
                    fontWeight={500}
                  >
                    Search Results
                  </Heading>
                  {filteredChains.map((chain, k) => (
                    <ChainButton
                      key={`${chain.id} - ${k}`}
                      connected={chainId === chain.id}
                      switching={switchingToChainId === chain.id}
                      chain={{
                        id: chain.id,
                        name: chain.name,
                      }}
                      onClick={() => {
                        setSwitchingToChainId(chain.id);
                        switchChain({
                          chainId: chain.id,
                        });
                      }}
                    />
                  ))}
                </Box>
              )}
              {!searchTerm && (
                <Box w="100%">
                  <Box mb="4">
                    <Heading
                      mb={2}
                      color="gray.200"
                      fontSize="sm"
                      fontWeight={500}
                    >
                      Popular Chains
                    </Heading>
                    {popularChains.map((chain, k) => (
                      <ChainButton
                        key={`${chain.id} - ${k}`}
                        connected={chainId === chain.id}
                        switching={switchingToChainId === chain.id}
                        chain={{
                          id: chain.id,
                          name: chain.name,
                        }}
                        onClick={() => {
                          setSwitchingToChainId(chain.id);
                          switchChain({
                            chainId: chain.id,
                          });
                        }}
                      />
                    ))}
                  </Box>
                  <Heading
                    mb={1.5}
                    color="gray.200"
                    fontSize="sm"
                    fontWeight={500}
                  >
                    Other Chains
                  </Heading>
                  {otherChains.map((chain, k) => (
                    <ChainButton
                      key={`${chain.id} - ${k}`}
                      switching={switchingToChainId === chain.id}
                      connected={chainId === chain.id}
                      chain={{
                        id: chain.id,
                        name: chain.name,
                      }}
                      onClick={() => {
                        setSwitchingToChainId(chain.id);
                        switchChain({
                          chainId: chain.id,
                        });
                      }}
                    />
                  ))}
                </Box>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ChainSelectorModal;
