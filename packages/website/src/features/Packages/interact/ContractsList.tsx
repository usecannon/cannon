import { FC, useState } from 'react';
import { useRouter } from 'next/router';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { MoreHorizontal } from 'lucide-react';
import SearchInput from '@/components/SearchInput';
import { buildInteractPath } from '@/lib/interact';
import { Option } from '@/lib/interact';
import { usePackageNameTagVersionUrlParams } from '@/hooks/routing/usePackageVersionUrlParams';
import { useActiveContract } from '@/features/Packages/interact/useActiveContract';
import { useContractSearch } from '@/features/Packages/interact/useContractSearch';

interface ContractsListProps {
  highlightedOptions: Option[];
  otherOptions: Option[];
}

export const ContractsList: FC<ContractsListProps> = ({
  highlightedOptions,
  otherOptions,
}) => {
  const router = useRouter();
  const { variant, tag, name } = usePackageNameTagVersionUrlParams();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { searchTerm, setSearchTerm, searchResults } =
    useContractSearch(otherOptions);
  const activeContractOption = useActiveContract();

  const isActiveContract = (contract: Option) => {
    if (!activeContractOption) return false;
    return (
      activeContractOption.moduleName === contract.moduleName &&
      activeContractOption.contractName === contract.contractName &&
      activeContractOption.contractAddress === contract.contractAddress
    );
  };

  return (
    <div className="overflow-x-scroll overflow-y-hidden max-w-[100vw]">
      <Tabs
        defaultValue={
          highlightedOptions[0]?.moduleName +
          '::' +
          highlightedOptions[0]?.contractName
        }
        value={
          activeContractOption
            ? `${activeContractOption.moduleName}::${activeContractOption.contractName}`
            : undefined
        }
        onValueChange={(value) => {
          const [moduleName, contractName] = value.split('::');
          const option = [...highlightedOptions, ...otherOptions].find(
            (opt) =>
              opt.moduleName === moduleName && opt.contractName === contractName
          );
          if (option) {
            void router.push(
              buildInteractPath(
                name,
                tag,
                variant,
                option.moduleName,
                option.contractName,
                option.contractAddress
              )
            );
          }
        }}
      >
        <TabsList className="h-full font-mono">
          {highlightedOptions.map((option, i) => (
            <TabsTrigger
              key={i}
              value={`${option.moduleName}::${option.contractName}`}
              data-testid={`${option.contractName}-button`}
            >
              {`${option.moduleName}.${option.contractName}`}
            </TabsTrigger>
          ))}

          {searchResults.length > 0 && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <div
                  className="cursor-pointer bg-black p-1 border border-border rounded-md mx-2"
                  data-testid="other-option-section"
                >
                  <MoreHorizontal className="h-4 w-4 text-white" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="max-h-[320px] max-w-[320px] overflow-y-auto overflow-x-hidden w-full bg-background border border-border p-0">
                {searchResults.length > 5 && (
                  <div className="p-2">
                    <SearchInput size="sm" onSearchChange={setSearchTerm} />
                  </div>
                )}
                {searchResults.map((option, i) => (
                  <div
                    key={i}
                    className={`cursor-pointer p-2 border-t border-border font-mono ${
                      isActiveContract(option)
                        ? 'bg-background'
                        : 'bg-transparent'
                    } hover:bg-accent/50`}
                    onClick={async () => {
                      setIsPopoverOpen(false);
                      await router.push(
                        `/packages/${name}/${tag}/${variant}/interact/${option.moduleName}/${option.contractName}/${option.contractAddress}`
                      );
                    }}
                    data-testid={`${option.contractName}-button`}
                  >
                    <span className="text-sm">
                      {`${option.moduleName}.${option.contractName}`}
                    </span>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </TabsList>
      </Tabs>
    </div>
  );
};
