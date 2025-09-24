import { FC, useState, useEffect, KeyboardEvent } from 'react';
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

interface ContractsListProps {
  highlightedOptions: Option[];
  otherOptions: Option[];
  contractAllOptions: Option[];
}

export const ContractsList: FC<ContractsListProps> = ({
  highlightedOptions,
  otherOptions,
  contractAllOptions,
}) => {
  const router = useRouter();
  const { variant, tag, name } = usePackageNameTagVersionUrlParams();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const activeContractOption = useActiveContract();
  const [isAnimating, setIsAnimating] = useState(false);

  const isActiveContract = (contract: Option) => {
    if (!activeContractOption) return false;
    return (
      activeContractOption.moduleName === contract.moduleName &&
      activeContractOption.contractName === contract.contractName &&
      activeContractOption.contractAddress === contract.contractAddress
    );
  };

  useEffect(() => {
    setIsAnimating(true);

    const timer = setTimeout(() => {
      setIsAnimating(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filteredOptions = contractAllOptions.filter((o) =>
    searchTerm
      ? o.contractName.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    filteredOptions: Option[]
  ) => {
    if (e.key === 'Enter') {
      const firstOption = filteredOptions[0];
      if (firstOption) {
        void router.push(
          buildInteractPath(
            name,
            tag,
            variant,
            firstOption.moduleName,
            firstOption.contractName,
            firstOption.contractAddress
          )
        );
      }
    }
  };

  return (
    <div className="max-w-[100vw] flex flex-items-center gap-2">
      <div className="py-2 pl-2 min-w-[150px]">
        <SearchInput
          size="sm"
          onSearchChange={setSearchTerm}
          onKeyDown={(e) => handleKeyDown(e, filteredOptions)}
        />
      </div>

      <div className="overflow-x-scroll overflow-y-hidden py-2">
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
                opt.moduleName === moduleName &&
                opt.contractName === contractName
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
            {otherOptions.length > 0 && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <div
                    className="cursor-pointer bg-black p-1 border border-border rounded-md mx-2"
                    data-testid="other-option-section"
                  >
                    <MoreHorizontal className="h-4 w-4 text-white" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="max-h-[320px] max-w-[350px] overflow-y-auto overflow-x-hidden w-full bg-background border border-border p-0">
                  {otherOptions.map((option, i) => (
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
                          buildInteractPath(
                            name,
                            tag,
                            variant,
                            option.moduleName,
                            option.contractName,
                            option.contractAddress
                          )
                        );
                      }}
                      data-testid={`${option.contractName}-button`}
                    >
                      <span className="text-sm font-mono">
                        <span>{option.moduleName}</span>
                        <span className="text-xs text-muted-foreground">{`.${option.contractName}`}</span>
                      </span>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            )}{' '}
            {searchTerm
              ? contractAllOptions
                  .filter((o) =>
                    searchTerm
                      ? o.contractName
                          .toLowerCase()
                          .includes(searchTerm.toLowerCase())
                      : true
                  )
                  .map((option, i) => (
                    <TabsTrigger
                      key={i}
                      value={`${option.moduleName}::${option.contractName}`}
                      data-testid={`${option.contractName}-button`}
                      className={isAnimating ? 'animate-pulse' : ''}
                    >
                      {`${option.moduleName}.${option.contractName}`}
                    </TabsTrigger>
                  ))
              : highlightedOptions.map((option, i) => (
                  <TabsTrigger
                    key={i}
                    value={`${option.moduleName}::${option.contractName}`}
                    data-testid={`${option.contractName}-button`}
                  >
                    {`${option.moduleName}.${option.contractName}`}
                  </TabsTrigger>
                ))}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
};
