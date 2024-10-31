'use client';

import { useState } from 'react';
import { groupBy } from 'lodash';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { ChainFilter } from './ChainFilter';
import { useQuery } from '@tanstack/react-query';
import { getChains, getPackages } from '@/helpers/api';
import SearchInput from '@/components/SearchInput';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const { getChainById } = useCannonChains();

  const toggleChainSelection = (id: number) => {
    setSelectedChains((prevSelectedChains) =>
      prevSelectedChains.includes(id)
        ? prevSelectedChains.filter((chainId) => chainId !== id)
        : [...prevSelectedChains, id]
    );
  };

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
      const chain = getChainById(id);

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
    <div className="flex flex-1 flex-col max-w-[100vw]">
      <div className="flex flex-1 flex-col md:flex-row">
        {/* Sidebar */}
        <div className="flex flex-col overflow-y-auto w-full md:w-[320px] md:max-w-[320px] md:border-r md:border-gray-700 md:h-[calc(100vh-100px)]">
          <div className="relative py-4 md:py-8 px-4 md:pb-4 max-h-[210px] md:max-h-none">
            {/* Shadow overlay for mobile */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-transparent to-background md:hidden" />
            
            <div className="mb-4 md:mb-8">
              <SearchInput onSearchChange={setSearchTerm} />
            </div>

            <p className="mb-1.5 text-gray-200 text-sm font-medium">
              Filter by Chain
            </p>
            
            {sortedMainnetChainIds.map((id) => (
              <ChainFilter
                key={id}
                id={id}
                isSelected={selectedChains.includes(id)}
                toggleSelection={toggleChainSelection}
              />
            ))}

            <Accordion type="single" collapsible>
              <AccordionItem value="testnets">
                <AccordionTrigger className="px-0 pb-0">
                  <span className="font-[var(--font-miriam)] uppercase tracking-wider text-xs text-gray-300">
                    Testnets
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0">
                  {sortedTestnetChainIds.map((id) => (
                    <ChainFilter
                      key={id}
                      id={id}
                      isSelected={selectedChains.includes(id)}
                      toggleSelection={toggleChainSelection}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto md:h-[calc(100vh-100px)] px-4">
          {packagesQuery.isPending ? (
            <div className="flex justify-center items-center flex-1 h-full">
              <CustomSpinner />
            </div>
          ) : Object.values(groupedPackages).length == 0 ? (
            <div className="flex w-full h-full">
              <p className="m-auto text-gray-400">No results</p>
            </div>
          ) : (
            <div className="px-0 pt-4 md:pt-8">
              <div className="ml-0 max-w-[1280px]">
                {Object.values(groupedPackages).map((pkgs: any) => (
                  <div className="mb-8" key={pkgs[0].name}>
                    <PackageCardExpandable pkgs={pkgs} key={pkgs[0].name} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
