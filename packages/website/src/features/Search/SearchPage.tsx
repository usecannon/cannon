'use client';

import { useState } from 'react';
import {
  Flex,
  Box,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  useBreakpointValue,
  Container,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { debounce, groupBy } from 'lodash';
import { ChainFilter } from './ChainFilter';
import chains from '@/helpers/chains';
import { useQuery } from '@tanstack/react-query';
import { getChains, getPackages } from '@/helpers/api';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);

  const isSmall = useBreakpointValue({
    base: true,
    sm: true,
    md: false,
  });

  const toggleChainSelection = (id: number) => {
    setSelectedChains((prevSelectedChains) =>
      prevSelectedChains.includes(id)
        ? prevSelectedChains.filter((chainId) => chainId !== id)
        : [...prevSelectedChains, id]
    );
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };
  const debouncedHandleSearch = debounce(handleSearch, 300);

  const packagesQuery = useQuery({
    queryKey: ['packages', searchTerm, selectedChains, 'package'],
    queryFn: getPackages,
  });

  // Chain filter stuff
  const chainsQuery = useQuery({ queryKey: ['chains'], queryFn: getChains });

  const getAllChainIds = (
    ids: number[]
  ): { mainnet: number[]; testnet: number[] } => {
    const mainnetChainIds = new Set<number>();
    const testnetChainIds = new Set<number>();

    ids.forEach((id) => {
      // Check if the chain_id exists in the chains object and if it's a testnet
      const chain = Object.values(chains).find((chain) => chain.id == id);

      if ((chain as any)?.testnet) {
        testnetChainIds.add(id);
      } else {
        mainnetChainIds.add(id);
      }
    });

    return {
      mainnet: Array.from(mainnetChainIds).sort((a, b) => a - b),
      testnet: Array.from(testnetChainIds).sort((a, b) => a - b),
    };
  };

  // Get all chain IDs using the function
  const { mainnet: sortedMainnetChainIds, testnet: sortedTestnetChainIds } =
    getAllChainIds(chainsQuery?.data?.data || []);

  // Ensure 13370 is at the front of the mainnetChainIds array
  const index13370 = sortedMainnetChainIds.indexOf(
    '13370' as unknown as number
  );
  if (index13370 > -1) {
    sortedMainnetChainIds.splice(index13370, 1);
    sortedMainnetChainIds.unshift(13370);
  }

  const groupedPackages = groupBy(packagesQuery?.data?.data, 'name');

  return (
    <Flex flex="1" direction="column" maxHeight="100%" maxWidth="100%">
      <Flex flex="1" direction={['column', 'column', 'row']}>
        <Flex
          flexDirection="column"
          overflowY="auto"
          maxWidth={['100%', '100%', '320px']}
          borderRight={isSmall ? 'none' : '1px solid'}
          borderColor="gray.700"
          width={['100%', '100%', '310px']}
          maxHeight={['none', 'none', 'calc(100vh - 100px)']}
        >
          <Box
            py={[4, 4, 8]}
            px={4}
            pb={[0, 0, 4]}
            maxHeight={{ base: '210px', md: 'none' }}
            overflowY="scroll"
            position="relative" // Added to position the pseudo-element
            sx={{
              '&::after': {
                content: '""', // Necessary for the pseudo-element to work
                position: 'sticky',
                bottom: 0,
                left: 0,
                right: 0,
                height: '12px', // Height of the shadow
                background:
                  'linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000)', // Gradient shadow
                display: { base: 'block', md: 'none' }, // Only show on base breakpoint
              },
            }}
          >
            <InputGroup borderColor="gray.600" mb={[4, 4, 8]}>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.500" />
              </InputLeftElement>
              <Input onChange={(e) => debouncedHandleSearch(e.target.value)} />
            </InputGroup>

            <Text mb={1.5} color="gray.200" fontSize="sm" fontWeight={500}>
              Filter by Chain
            </Text>
            {sortedMainnetChainIds.map((id) => (
              <ChainFilter
                key={id}
                id={id}
                isSelected={selectedChains.includes(id)}
                toggleSelection={toggleChainSelection}
              />
            ))}

            <Accordion allowToggle>
              <AccordionItem border="none">
                <AccordionButton px={0} pb={0}>
                  <Text
                    fontWeight={500}
                    textTransform="uppercase"
                    letterSpacing="1px"
                    fontFamily="var(--font-miriam)"
                    fontSize="12px"
                    color="gray.300"
                    mr={0.5}
                  >
                    Testnets
                  </Text>
                  <Box transform="translateY(-0.1rem)">
                    <AccordionIcon color="gray.300" />
                  </Box>
                </AccordionButton>
                <AccordionPanel px={0} pb={0}>
                  {sortedTestnetChainIds.map((id) => (
                    <ChainFilter
                      key={id}
                      id={id}
                      isSelected={selectedChains.includes(id)}
                      toggleSelection={toggleChainSelection}
                    />
                  ))}
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </Box>
        </Flex>
        <Box
          flex="1"
          overflowY="auto"
          maxHeight={['none', 'none', 'calc(100vh - 100px)']}
        >
          {packagesQuery.isPending ? (
            <Flex
              justifyContent="center"
              alignItems="center"
              flex={1}
              height="100%"
            >
              <CustomSpinner />
            </Flex>
          ) : Object.values(groupedPackages).length == 0 ? (
            <Flex w="100%" h="100%">
              <Text m="auto" color="gray.400">
                No results
              </Text>
            </Flex>
          ) : (
            <Box px={[0, 0, 4]} pt={isSmall ? 4 : 8}>
              <Container ml={0} maxWidth="container.xl">
                {Object.values(groupedPackages).map((pkgs: any) => (
                  <Box mb="8" key={pkgs[0].name}>
                    <PackageCardExpandable pkgs={pkgs} key={pkgs[0].name} />
                  </Box>
                ))}
              </Container>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
};
