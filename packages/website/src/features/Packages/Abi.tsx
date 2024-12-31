import sortBy from 'lodash/sortBy';
import * as viem from 'viem';
import { ChainArtifacts } from '@usecannon/builder';
import { FC, useEffect, useMemo, useState } from 'react';
import { AbiFunction, Abi as AbiType } from 'abitype';
import { Function } from '@/features/Packages/Function';
import SearchInput from '@/components/SearchInput';
import { scroller, Element, scrollSpy } from 'react-scroll';

import React from 'react';
import { useRouter } from 'next/router';
import { CustomSpinner } from '@/components/CustomSpinner';
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';

const getSelectorSlug = (f: AbiFunction) =>
  `selector-${viem.toFunctionSelector(f)}`;

const FunctionRowsSkeleton = () => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="h-3 animate-pulse bg-muted rounded" />
    ))}
  </div>
);

export const Abi: FC<{
  isLoading?: boolean;
  abi?: AbiType;
  address: viem.Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractName?: string;
  onDrawerOpen?: () => void;
  packageUrl?: string;
}> = ({
  isLoading,
  abi,
  contractName,
  address,
  cannonOutputs,
  chainId,
  onDrawerOpen,
  packageUrl,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [scrollInitialized, setScrollInitialized] = useState(false);

  const allContractMethods = useMemo<AbiFunction[]>(
    () =>
      sortBy(abi?.filter((a) => a.type === 'function') as AbiFunction[], [
        'name',
      ]),
    [abi]
  );

  const readContractMethods = useMemo(
    () =>
      sortBy(
        allContractMethods?.filter((func) =>
          ['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [allContractMethods]
  );

  const writeContractMethods = useMemo(
    () =>
      sortBy(
        allContractMethods?.filter(
          (func) => !['view', 'pure'].includes(func.stateMutability)
        ),
        ['name']
      ),
    [allContractMethods]
  );

  const scrollOptions = useMemo(
    () => ({
      duration: 1200,
      smooth: true,
      offset: -167,
    }),
    []
  );

  const onSelectedSelector = async (newSelector: string) => {
    // set the selector
    setSelectedSelector(newSelector);

    // scroll to the element
    scroller.scrollTo(newSelector, scrollOptions);

    await router.push(`${router.asPath.split('#')[0]}#${newSelector}`);
  };

  const handleMethodClick = async (functionSelector: AbiFunction) => {
    const newSelector = getSelectorSlug(functionSelector);
    if (newSelector === selectedSelector) {
      return;
    }

    await onSelectedSelector(newSelector);
  };

  // Updating scrollSpy when the component mounts.
  useEffect(() => {
    scrollSpy.update();
  }, []);

  // Update the useEffect that handles initial scroll
  useEffect(() => {
    if (!abi || isLoading) return; // Wait until ABI is loaded

    const urlSelectorFromPath = router.asPath.split('#')[1];
    if (!urlSelectorFromPath || scrollInitialized) return;

    // Verify if the selector exists in our ABI functions
    const matchingFunction = allContractMethods?.find(
      (f) => getSelectorSlug(f) === urlSelectorFromPath
    );

    if (!matchingFunction) return;

    // Set the selected selector
    setSelectedSelector(urlSelectorFromPath);

    requestAnimationFrame(() => {
      setTimeout(() => {
        scroller.scrollTo(urlSelectorFromPath, {
          ...scrollOptions,
          ignoreCancelEvents: true,
          smooth: false,
        });
        setScrollInitialized(true);
      }, 100);
    });
  }, [
    abi,
    isLoading,
    router.asPath,
    scrollOptions,
    scrollInitialized,
    allContractMethods,
  ]);

  const sidebarContent = (
    <SidebarContent className="overflow-y-auto">
      <SidebarGroup className="pb-1 px-3">
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem className="mt-1">
              <SearchInput size="sm" onSearchChange={setSearchTerm} />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="pt-0">
        <SidebarGroupContent>
          <SidebarGroupLabel className="h-6">Read Functions</SidebarGroupLabel>
        </SidebarGroupContent>

        <SidebarGroupContent>
          <SidebarMenu className="gap-0">
            {isLoading ? (
              <FunctionRowsSkeleton />
            ) : (
              readContractMethods
                ?.filter((f) =>
                  f.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((f, index) => (
                  <SidebarMenuButton
                    className="overflow-hidden text-ellipsis whitespace-nowrap block w-full font-mono text-sm py-0"
                    key={index}
                    isActive={selectedSelector == getSelectorSlug(f)}
                    onClick={() => handleMethodClick(f)}
                  >
                    {f.name}(
                    {f.inputs
                      .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                      .join(',')}
                    )
                  </SidebarMenuButton>
                ))
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="pt-0">
        <SidebarGroupLabel className="h-6">Write Functions</SidebarGroupLabel>

        <SidebarGroupContent>
          <SidebarMenu className="gap-0">
            {isLoading ? (
              <FunctionRowsSkeleton />
            ) : (
              writeContractMethods
                ?.filter((f) =>
                  f.name.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((f, index) => (
                  <SidebarMenuButton
                    className="overflow-hidden text-ellipsis whitespace-nowrap block w-full font-mono text-sm py-0"
                    key={index}
                    isActive={selectedSelector == getSelectorSlug(f)}
                    onClick={() => handleMethodClick(f)}
                  >
                    {f.name}(
                    {f.inputs
                      .map((i) => i.type + (i.name ? ' ' + i.name : ''))
                      .join(',')}
                    )
                  </SidebarMenuButton>
                ))
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );

  return (
    <div className="flex flex-1 flex-col max-w-full">
      <div className="flex flex-1 flex-col md:flex-row">
        <SidebarLayout
          sidebarContent={sidebarContent}
          centered={false}
          sidebarTop="134px"
          mainContentOverflowY="visible"
        >
          {/* Methods Interactions */}
          <div className="flex flex-col p-3 gap-4 flex-1 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center flex-1">
                <CustomSpinner />
              </div>
            ) : (
              allContractMethods?.map((f) => (
                <Element
                  name={getSelectorSlug(f)}
                  key={`${address}-${getSelectorSlug(f)}`}
                >
                  <Function
                    selected={selectedSelector == getSelectorSlug(f)}
                    f={f}
                    abi={abi as AbiType}
                    address={address}
                    cannonOutputs={cannonOutputs}
                    chainId={chainId}
                    contractName={contractName}
                    onDrawerOpen={onDrawerOpen}
                    collapsible
                    showFunctionSelector={false}
                    packageUrl={packageUrl}
                  />
                </Element>
              ))
            )}
          </div>
        </SidebarLayout>
      </div>
    </div>
  );
};
