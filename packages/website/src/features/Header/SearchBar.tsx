'use client';

import { getSearch } from '@/helpers/api';
import { SearchIcon } from '@chakra-ui/icons';
import {
  useDisclosure,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  Flex,
  Input,
  Center,
  ModalBody,
  Icon,
  Heading,
  Text,
  useEventListener,
  useUpdateEffect,
  Box,
  Link,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { usePathname, useRouter } from 'next/navigation';
import {
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GoPackage } from 'react-icons/go';
import { BsBoxes } from 'react-icons/bs';
import { PiFileCode } from 'react-icons/pi';
import { FaCode } from 'react-icons/fa6';
import MultiRef from 'react-multi-ref';
import scrollIntoView from 'scroll-into-view-if-needed';
import Chain from '../Search/PackageCard/Chain';

// Borrowing some code from https://github.com/chakra-ui/chakra-ui/blob/main/website/src/components/omni-search.tsx

const PLACEHOLDER = 'Search packages, contracts, functions, and addresses...';

const generateLink = (result: any) => {
  switch (result.type) {
    case 'package':
      return `/packages/${result.name}/${result.version}/${result.chainId}-${result.preset}`;
    case 'namespace':
      return `/packages/${result.name}`;
    case 'contract':
      return `/packages/${result.packageName}/${result.version}/${result.chainId}-${result.preset}/interact/${result.packageName}/${result.name}/${result.address}`;
    case 'function':
      return `/packages/${result.packageName}/${result.version}/${result.chainId}-${result.preset}/interact/${result.packageName}/${result.contractName}/${result.address}#selector-${result.selector}`;
    default:
      return '/';
  }
};

export const SearchBar = () => {
  const pathname = usePathname();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [active, setActive] = useState<number>(0);
  const eventRef = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [shouldCloseModal, setShouldCloseModal] = useState(true);
  const [menuNodes] = useState(() => new MultiRef<number, HTMLElement>());
  const router = useRouter();

  const handleSearch = (value: string) => {
    setSearchTerm(value.trim());
  };
  const debouncedHandleSearch = debounce(handleSearch, 300);

  const searchQuery = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: getSearch,
  });
  const results = searchQuery?.data?.data || [];

  useEffect(() => {
    if (isOpen && searchTerm.length > 0) {
      setSearchTerm('');
    }
  }, [isOpen]);

  useEventListener('keydown', (event) => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);
    const hotkey = isMac ? 'metaKey' : 'ctrlKey';
    if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
      event.preventDefault();
      isOpen ? onClose() : onOpen();
    }
  });

  const onKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e: any) => {
      eventRef.current = 'keyboard';
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (active + 1 < results.length) {
            setActive(active + 1);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (active - 1 >= 0) {
            setActive(active - 1);
          }
          break;
        }
        case 'Control':
        case 'Alt':
        case 'Shift': {
          e.preventDefault();
          setShouldCloseModal(true);
          break;
        }
        case 'Enter': {
          if (results?.length <= 0) {
            break;
          }

          onClose();
          void router.push(generateLink(results[active]));
          break;
        }
      }
    },
    [active, results, router]
  );

  const onKeyUp = useCallback((e: any) => {
    eventRef.current = 'keyboard';
    switch (e.key) {
      case 'Control':
      case 'Alt':
      case 'Shift': {
        e.preventDefault();
        setShouldCloseModal(false);
      }
    }
  }, []);

  useUpdateEffect(() => {
    setActive(0);
  }, [searchTerm]);

  useUpdateEffect(() => {
    if (!menuRef.current || eventRef.current === 'mouse') return;

    const node = menuNodes.map.get(active);
    if (!node) return;

    scrollIntoView(node, {
      scrollMode: 'if-needed',
      block: 'nearest',
      inline: 'nearest',
      boundary: menuRef.current,
    });
  }, [active]);

  return (
    <>
      <Flex
        display="inline-flex"
        alignItems="center"
        borderRadius="md"
        border="1px solid"
        background={pathname.startsWith('/search') ? 'teal.900' : 'black'}
        borderColor={pathname.startsWith('/search') ? 'teal.700' : 'gray.500'}
        transition="all 0.2s"
        _hover={{
          background: pathname.startsWith('/search') ? 'teal.900' : 'teal.900',
          borderColor: pathname.startsWith('/search') ? 'teal.700' : 'teal.500',
        }}
        onClick={onOpen}
        cursor="pointer"
      >
        <IconButton
          size="sm"
          variant="outline"
          border="none"
          _hover={{ background: 'none' }}
          aria-label="Search"
          icon={<SearchIcon color="gray.400" />}
        />
        <Text
          pr={2}
          fontSize="sm"
          color="gray.500"
          display={['none', 'none', 'none', 'none', 'inline-block']}
        >
          {PLACEHOLDER}
        </Text>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent
          bg="gray.900"
          width="100%"
          maxW="container.md"
          mx={4}
          border="1px solid"
          borderColor="gray.800"
        >
          <Flex pos="relative" align="stretch">
            <Input
              maxLength={256}
              aria-autocomplete="list"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              w="100%"
              h="68px"
              pl="68px"
              fontWeight="medium"
              outline="0"
              placeholder={PLACEHOLDER}
              onChange={(e) => debouncedHandleSearch(e.target.value)}
              borderColor="gray.800"
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              _focus={{ boxShadow: 'none', border: 'none' }}
            />
            <Center pos="absolute" left={7} h="68px">
              <SearchIcon color="teal.500" boxSize="20px" />
            </Center>
          </Flex>
          {searchTerm.length > 0 && results.length > 0 && (
            <ModalBody
              pt={6}
              maxH="66vh"
              overflowY="auto"
              ref={menuRef}
              borderTop="1px solid"
              borderColor="gray.800"
            >
              {results.map((result: any, index: number) => (
                <Link
                  textDecoration="none"
                  _hover={{ textDecoration: 'none' }}
                  key={index}
                  ref={menuNodes.ref(index)}
                  onMouseEnter={() => {
                    setActive(index);
                    eventRef.current = 'mouse';
                  }}
                  onClick={() => {
                    if (shouldCloseModal) {
                      onClose();
                    }
                  }}
                  href={generateLink(result)}
                >
                  {(() => {
                    switch (result.type) {
                      case 'package':
                        return (
                          <Flex
                            border="1px solid"
                            bg={index === active ? 'teal.900' : 'gray.800'}
                            borderColor={
                              index === active ? 'teal.500' : 'gray.700'
                            }
                            borderRadius="md"
                            mb={4}
                            p={4}
                            gap={4}
                            alignItems="center"
                          >
                            <Icon as={GoPackage} boxSize="8" color="gray.300" />
                            <Box>
                              <Heading fontWeight={600} size="sm" mb={0.5}>
                                {result.name}
                              </Heading>
                              <Flex gap={3.5}>
                                <Text fontSize="xs" color="gray.400">
                                  Version: {result.version}
                                </Text>
                                <Text fontSize="xs" color="gray.400">
                                  Preset: {result.preset}
                                </Text>
                                <Text
                                  fontSize="xs"
                                  color="gray.400"
                                  as={Flex}
                                  gap={1.5}
                                >
                                  Chain: <Chain id={result.chainId} />
                                </Text>
                              </Flex>
                            </Box>
                          </Flex>
                        );
                      case 'namespace':
                        return (
                          <Flex
                            border="1px solid"
                            bg={index === active ? 'teal.900' : 'gray.800'}
                            borderColor={
                              index === active ? 'teal.500' : 'gray.700'
                            }
                            borderRadius="md"
                            mb={4}
                            p={4}
                            gap={4}
                            alignItems="center"
                          >
                            <Icon as={BsBoxes} boxSize="8" color="gray.300" />
                            <Box>
                              <Heading fontWeight={600} size="sm" mb={0.5}>
                                {result.name}
                              </Heading>
                              <Text fontSize="xs" color="gray.400">
                                {result.count} package
                                {result.count != 1 && 's'}
                              </Text>
                            </Box>
                          </Flex>
                        );
                      case 'contract':
                        return (
                          <Flex
                            border="1px solid"
                            bg={index === active ? 'teal.900' : 'gray.800'}
                            borderColor={
                              index === active ? 'teal.500' : 'gray.700'
                            }
                            borderRadius="md"
                            mb={4}
                            p={4}
                            gap={4}
                            alignItems="center"
                          >
                            <Icon
                              as={PiFileCode}
                              boxSize="8"
                              color="gray.300"
                            />
                            <Box>
                              <Heading fontWeight={600} size="sm" mb={0.5}>
                                {result.name}
                              </Heading>
                              <Text
                                fontSize="xs"
                                color="gray.400"
                                as={Flex}
                                gap={1.5}
                              >
                                {result.address.substring(0, 6)}...
                                {result.address.slice(-4)} in{' '}
                                {result.packageName}:{result.version}@
                                {result.preset} on <Chain id={result.chainId} />
                              </Text>
                            </Box>
                          </Flex>
                        );
                      case 'function':
                        return (
                          <Flex
                            border="1px solid"
                            bg={index === active ? 'teal.900' : 'gray.800'}
                            borderColor={
                              index === active ? 'teal.500' : 'gray.700'
                            }
                            borderRadius="md"
                            mb={4}
                            p={4}
                            gap={4}
                            alignItems="center"
                          >
                            <Icon as={FaCode} boxSize="8" color="gray.300" />
                            <Box>
                              <Heading fontWeight={600} size="sm" mb={0.5}>
                                {result.contractName}.{result.name}
                              </Heading>
                              <Text
                                fontSize="xs"
                                color="gray.400"
                                as={Flex}
                                gap={1.5}
                              >
                                {result.address.substring(0, 6)}...
                                {result.address.slice(-4)} in{' '}
                                {result.packageName}:{result.version}@
                                {result.preset} on <Chain id={result.chainId} />
                              </Text>
                            </Box>
                          </Flex>
                        );
                      default:
                        return null;
                    }
                  })()}
                </Link>
              ))}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
