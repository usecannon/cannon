import { useSwitchChain, useChainId } from 'wagmi';
import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
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
} from '@chakra-ui/react';
import {
  Ethereum,
  Polygon,
  Avalanche,
  Optimism,
  Arbitrum,
} from '@thirdweb-dev/chain-icons';
import { debounce } from 'lodash';
import { CloseIcon } from '@chakra-ui/icons';

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
  const chainIcons: {
    [key: number]: JSX.Element;
  } = {
    1: <Ethereum width={15} />,
    137: <Polygon width={15} />,
    43114: <Avalanche width={15} />,
    10: <Optimism width={15} />,
    42161: <Arbitrum width={15} />,
  };

  return (
    <Button
      w={'100%'}
      height={'40px'}
      size="sm"
      variant="outline"
      colorScheme="black"
      fontWeight={500}
      textTransform="uppercase"
      letterSpacing="1px"
      fontFamily="var(--font-miriam)"
      textShadow="0px 0px 4px rgba(255, 255, 255, 0.33)"
      fontSize="15px"
      color="gray.200"
      onClick={onClick}
      _hover={{ bg: 'gray.800' }}
    >
      <Flex justifyContent="space-between" alignItems="center" w="100%">
        <Flex gap={2} alignItems="center">
          {chainIcons[chain.id]}
          {chain.name}
        </Flex>
        {connected ? (
          <Text
            color="green.400"
            fontSize="sm"
            textShadow="0px 0px 4px #00ff00"
          >
            Connected
          </Text>
        ) : switching ? (
          <Text
            color="yellow.400"
            fontSize="sm"
            textShadow="0px 0px 4px #ffff00"
          >
            Confirm in wallet
          </Text>
        ) : null}
      </Flex>
    </Button>
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
  const { chains, switchChain, isSuccess, isError, isPending } =
    useSwitchChain();

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
  // Cannon, Ethereum, Polygon, Avalanche, Optimism, Arbitrum
  const popularChainsIds = [13370, 1, 137, 43114, 10, 42161];
  const popularChains = chains.filter((chain) =>
    popularChainsIds.includes(chain.id)
  );

  const otherChains = chains.filter(
    (chain) => !popularChainsIds.includes(chain.id)
  );

  const handleSearchChange = debounce(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      console.log('setting search term', e.target.value);
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
          h={'60%'}
          overflow={'auto'}
        >
          <ModalHeader>Switch Network</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Flex
              direction="column"
              align="center"
              justify="center"
              mb="4"
              mt="2"
              gap={2}
            >
              <Box width="full" paddingBottom={4}>
                <Flex
                  borderStyle={'solid'}
                  borderWidth={1}
                  borderColor={'whiteAlpha.400'}
                  bg="transparent"
                  alignItems="center"
                >
                  <Input
                    type="text"
                    border={'none'}
                    placeholder="Search Network..."
                    onChange={handleSearchChange}
                    ref={searchInputRef}
                    _focus={{ borderColor: 'transparent' }}
                    _focusVisible={{
                      outline: 'none',
                    }}
                  />
                  {/* close button deletes search term */}
                  {searchTerm && (
                    <Button
                      bg={'transparent'}
                      _hover={{ bg: 'transparent' }}
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        if (searchInputRef.current) {
                          searchInputRef.current.value = '';
                        }
                      }}
                    >
                      <CloseIcon color={'gray.200'} />
                    </Button>
                  )}
                </Flex>
              </Box>
              {searchTerm && filteredChains.length === 0 && (
                <Heading size="sm" color="gray.200">
                  No networks found
                </Heading>
              )}
              {searchTerm && filteredChains.length > 0 && (
                <>
                  <Heading size="sm" color="gray.200">
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
                </>
              )}
              {!searchTerm && (
                <>
                  <Heading size="sm" color="gray.200">
                    Popular Networks
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
                  <Heading size="sm" color="gray.200" mt="4" mb="2">
                    Other Networks
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
                </>
              )}
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ChainSelectorModal;
