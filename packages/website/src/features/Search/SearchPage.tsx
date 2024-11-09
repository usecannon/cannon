'use client';

import { useState } from 'react';
import { groupBy } from 'lodash';
import { PackageCardExpandable } from './PackageCard/PackageCardExpandable';
import { CustomSpinner } from '@/components/CustomSpinner';
import { ChainFilter } from './ChainFilter';
import { useQuery } from '@tanstack/react-query';
import { getChains, getPackages } from '@/helpers/api';
import SearchInput from '@/components/SearchInput';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className="flex min-h-screen flex-col md:flex-row w-full">
      <SidebarProvider>
        {/* Mobile Sidebar Trigger - Fixed to left side */}
        <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50 md:hidden bg-black border border-border border-l-0 rounded-r-lg">
          <SidebarTrigger>
            <Button
              size="icon"
              className="h-8 w-8 rounded-r-lg rounded-l-none border-l-0"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SidebarTrigger>
        </div>

        {/* Sidebar - updated className */}
        <Sidebar className="fixed md:sticky md:top-0 w-[280px] md:w-[320px] h-screen shrink-0 border-r border-border">
          <SidebarHeader className="px-4">
            <SearchInput onSearchChange={setSearchTerm} />
          </SidebarHeader>

          <SidebarContent className="overflow-y-auto">
            <SidebarGroup>
              <SidebarGroupLabel className="px-4 text-sm font-medium text-gray-200">
                Filter by Chain
              </SidebarGroupLabel>
              <SidebarGroupContent className="space-y-1 px-2">
                <SidebarMenu>
                  {sortedMainnetChainIds.map((id) => (
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
        </Sidebar>

        {/* Main Content - updated className */}
        <main className="flex-1 overflow-y-auto w-full md:w-[calc(100%-320px)] md:ml-auto">
          <div className="container max-w-100 mx-auto px-4 md:px-6 lg:px-8 h-screen">
            {packagesQuery.isPending ? (
              <div className="flex justify-center items-center flex-1 h-full">
                <CustomSpinner />
              </div>
            ) : Object.values(groupedPackages).length == 0 ? (
              <div className="flex w-full h-full">
                <p className="m-auto text-gray-400">No results</p>
              </div>
            ) : (
              <div className="space-y-6 py-6">
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
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
};
