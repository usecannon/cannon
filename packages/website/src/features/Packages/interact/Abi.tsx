import * as viem from 'viem';
import { ChainArtifacts } from '@usecannon/builder';
import { FC, useEffect, useState } from 'react';
import { AbiFunction, Abi as AbiType } from 'abitype';
import { scroller, Element, scrollSpy } from 'react-scroll';
import { useRouter } from 'next/router';
import { SidebarLayout } from '@/components/layouts/SidebarLayout';
import { AbiSidebar } from './AbiSidebar';
import { useContractMethods } from './useContractMethods';
import { AbiContractMethodAccordion } from './AbiContractMethodAccordion';
import { AbiContractMethodInteraction } from './AbiContractMethodInteraction';

const getSelectorSlug = (f: AbiFunction) =>
  `selector-${viem.toFunctionSelector(f)}`;

const scrollOptions = {
  duration: 1200,
  smooth: true,
  offset: -145,
};

export const Abi: FC<{
  abi: AbiType;
  address: viem.Address;
  cannonOutputs: ChainArtifacts;
  chainId: number;
  contractName?: string;
  onDrawerOpen?: () => void;
  packageUrl?: string;
  isDrawerOpen?: boolean;
}> = ({
  abi,
  contractName,
  address,
  chainId,
  onDrawerOpen,
  packageUrl,
  isDrawerOpen,
}) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [scrollInitialized, setScrollInitialized] = useState(false);
  const { allContractMethods, readContractMethods, writeContractMethods } =
    useContractMethods(abi);

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
    if (scrollInitialized) return;

    // Verify if the method exists in our ABI functions
    const urlSelectorFromPath = router.asPath.split('#')[1];
    if (!urlSelectorFromPath) return;
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
  }, [abi, router.asPath, scrollInitialized, allContractMethods]);

  return (
    <div className="flex flex-1 flex-col max-w-full">
      <div className="flex flex-1 flex-col md:flex-row">
        <SidebarLayout
          sidebarContent={
            <AbiSidebar
              readContractMethods={readContractMethods}
              writeContractMethods={writeContractMethods}
              searchTerm={searchTerm}
              selectedSelector={selectedSelector}
              onSearchChange={setSearchTerm}
              onMethodClick={handleMethodClick}
              getSelectorSlug={getSelectorSlug}
            />
          }
          centered={false}
          sidebarTop="134px"
          mainContentOverflowY="visible"
        >
          {/* Methods Interactions */}
          <div className="flex flex-col p-3 gap-4 flex-1">
            {allContractMethods?.map((f) => (
              <Element
                name={getSelectorSlug(f)}
                key={`${address}-${getSelectorSlug(f)}`}
              >
                <AbiContractMethodAccordion
                  f={f}
                  content={
                    <AbiContractMethodInteraction
                      f={f}
                      abi={abi as AbiType}
                      address={address}
                      chainId={chainId}
                      contractName={contractName}
                      onDrawerOpen={onDrawerOpen}
                      packageUrl={packageUrl}
                      isDrawerOpen={isDrawerOpen}
                    />
                  }
                  anchor={getSelectorSlug(f)}
                  selected={selectedSelector === getSelectorSlug(f)}
                />
              </Element>
            ))}
          </div>
        </SidebarLayout>
      </div>
    </div>
  );
};
