'use client';

import { useState, useMemo } from 'react';
import { groupBy } from 'lodash';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { ChainFilter } from './ChainFilter';
import { useQuery } from '@tanstack/react-query';
import { getChains, getPackages } from '@/helpers/api';
import SearchInput from '@/components/SearchInput';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

export const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedChains, setSelectedChains] = useState<number[]>([]);
  const { getChainById } = useCannonChains();

  const sortWithCannonFirst = useMemo(
    () => (a: number, b: number) => {
      if (a === 13370) return -1;
      if (b === 13370) return 1;
      return a - b;
    },
    []
  );

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

  const getAllChainIds = useMemo(
    () =>
      (ids: number[]): { mainnet: number[]; testnet: number[] } => {
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

        const mainnetArray = Array.from(mainnetChainIds)
          .filter((id) => !isNaN(id))
          .map(Number);

        const sortedMainnet = [...mainnetArray].sort((a, b) => {
          if (a === 13370) return -1;
          if (b === 13370) return 1;
          return a - b;
        });

        return {
          mainnet: sortedMainnet,
          testnet: Array.from(testnetChainIds).sort((a, b) => a - b),
        };
      },
    [getChainById, sortWithCannonFirst]
  );

  // Get all chain IDs using the function and memoize the result
  const { mainnet: sortedMainnetChainIds, testnet: sortedTestnetChainIds } =
    useMemo(
      () => getAllChainIds(chainsQuery?.data?.data || []),
      [getAllChainIds, chainsQuery?.data?.data]
    );

  // Filter out NaN values and ensure 13370 is at the front of the mainnetChainIds array
  const filteredMainnetChainIds = sortedMainnetChainIds;

  const groupedPackages = groupBy(packagesQuery?.data?.data, 'name');

  const sidebarContent = (
    <>
      <SidebarHeader className="px-4 pt-4">
        <SearchInput onSearchChange={setSearchTerm} />
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="h-4 mb-2">
            Filter by Chain
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1 px-2">
            <SidebarMenu>
              {filteredMainnetChainIds.map((id) => (
                <SidebarMenuItem key={id}>
                  <SidebarMenuButton
                    onClick={() => toggleChainSelection(id)}
                    isActive={selectedChains.includes(id)}
                    className="border border-border"
                  >
                    <ChainFilter id={id} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>

            <Collapsible className="group/collapsible">
              <SidebarMenuItem className="mb-1">
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    Testnets
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
              <CollapsibleContent>
                <SidebarMenu>
                  {sortedTestnetChainIds.map((id) => (
                    <SidebarMenuItem key={id}>
                      <SidebarMenuButton
                        onClick={() => toggleChainSelection(id)}
                        isActive={selectedChains.includes(id)}
                        className="border border-border"
                      >
                        <ChainFilter id={id} />
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </>
  );

  if (packagesQuery.isPending) {
    return (
      <div className="flex w-full h-[calc(100vh-var(--header-height)-var(--footer-height))] items-center justify-center">
        <CustomSpinner />
      </div>
    );
  }

  return (
    <SidebarLayout sidebarContent={sidebarContent} fixedFooter>
      {Object.values(groupedPackages).length == 0 ? (
        <div className="flex w-full h-full">
          <p className="m-auto text-gray-400">No results</p>
        </div>
      ) : (
        <div className="space-y-4 pt-4 px-4 pb-2">
          {Object.values(groupedPackages).map((pkgs: any) => (
            <div
              key={pkgs[0].name}
              className="overflow-x-auto md:overflow-x-visible"
            >
              <PackageCardExpandable pkgs={pkgs} />
            </div>
          ))}
        </div>
      )}
    </SidebarLayout>
  );
};
