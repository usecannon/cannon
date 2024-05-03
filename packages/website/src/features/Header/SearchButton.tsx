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
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { GoPackage } from 'react-icons/go';

const PLACEHOLDER =
  'Search for packages, contracts, functions, addresses, and transactions...';

export const SearchButton = () => {
  const pathname = usePathname();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };
  const debouncedHandleSearch = debounce(handleSearch, 300);

  const searchQuery = useQuery({
    queryKey: ['search', searchTerm],
    queryFn: getSearch,
  });

  useEventListener('keydown', (event) => {
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator?.platform);
    const hotkey = isMac ? 'metaKey' : 'ctrlKey';
    if (event?.key?.toLowerCase() === 'k' && event[hotkey]) {
      event.preventDefault();
      isOpen ? onClose() : onOpen();
    }
  });

  return (
    <>
      <Flex
        display="inline-flex"
        alignItems="center"
        borderRadius="md"
        border="1px solid"
        background={pathname.startsWith('/search') ? 'teal.900' : 'black'}
        borderColor={pathname.startsWith('/search') ? 'teal.700' : 'gray.500'}
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
          pr={3}
          fontSize="sm"
          color="gray.500"
          display={['none', 'none', 'none', 'none', 'inline-block']}
        >
          {PLACEHOLDER}
        </Text>
      </Flex>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent bg="gray.900" width="100%" maxW="container.md" mx={4}>
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
            />
            <Center pos="absolute" left={7} h="68px">
              <SearchIcon color="teal.500" boxSize="20px" />
            </Center>
          </Flex>
          {searchTerm.length > 0 && searchQuery?.data?.data?.length > 0 && (
            <ModalBody pt={6}>
              {searchQuery?.data?.data?.map((result: any, index: number) => {
                switch (result.type) {
                  case 'package':
                    return (
                      <Flex
                        bg="gray.800"
                        borderRadius="md"
                        mb={4}
                        p={4}
                        key={index}
                        gap={4}
                        alignItems="middle"
                      >
                        <Icon as={GoPackage} boxSize="6" color="gray.300" />
                        <Heading fontWeight={600} size="sm">
                          {result.name}
                        </Heading>
                      </Flex>
                    );
                  case 'namespace':
                    return <>coming soon</>;
                  case 'contract':
                    return <>coming soon</>;
                  case 'function':
                    return <>coming soon</>;
                  case 'address':
                    return <>coming soon</>;
                  case 'transaction':
                    return <>coming soon</>;
                  default:
                    return null;
                }
              })}
            </ModalBody>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};
