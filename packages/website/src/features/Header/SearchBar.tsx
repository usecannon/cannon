'use client';

import { getSearch } from '@/helpers/api';
import { Search } from 'lucide-react';
import { Boxes, FileCode, Box, CodeXml } from 'lucide-react';
import { useEventListener } from 'usehooks-ts';
import { useMediaQuery } from 'usehooks-ts';
import { useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { CustomSpinner } from '@/components/CustomSpinner';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

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

const formatVersionAndPreset = (version: string, preset: string) => {
  const formattedVersion = version !== 'latest' ? `:${version}` : '';
  const formattedPreset = preset !== 'main' ? `@${preset}` : '';
  return `${formattedVersion}${formattedPreset}`;
};

const SearchBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  const router = useRouter();

  const isDesktop = useMediaQuery('(min-width: 768px)');
  const PLACEHOLDER = isDesktop
    ? 'Search packages, contracts, functions, and addresses...'
    : 'Search packages, etc.';

  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const debouncedSetValue = useRef(
    debounce((value: string) => {
      if (value.trim().length > 2) {
        setDebouncedValue(value.trim());
      }
    }, 300)
  ).current;

  const { getChainById } = useCannonChains();

  useEffect(() => {
    debouncedSetValue(inputValue);

    return () => {
      debouncedSetValue.cancel();
    };
  }, [inputValue, debouncedSetValue]);

  const searchQuery = useQuery({
    queryKey: ['search', debouncedValue],
    queryFn: getSearch,
    enabled: debouncedValue.length > 0,
    staleTime: 0,
  });

  const results = useMemo(() => {
    return searchQuery?.data?.data || [];
  }, [searchQuery.data]);

  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setDebouncedValue('');
    }
  }, [isOpen, searchQuery]);

  useEffect(() => {
    if (inputValue === '') {
      setDebouncedValue('');
    }
  }, [inputValue, searchQuery]);

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
      <Button
        variant="outline"
        className={cn(
          'relative h-8 justify-start rounded-sm bg-muted/50 text-sm font-normal text-muted-foreground shadow-none lg:pr-12',
          'w-8 px-2 lg:w-full lg:pr-12'
        )}
        onClick={onOpen}
        data-testid="searchbar-button"
      >
        <Search className="h-6 w-6 lg:hidden" />
        <span className="hidden lg:inline-flex">
          Search packages, functions, contracts, and addresses...
        </span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium lg:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={isOpen} onOpenChange={onClose}>
        <Command>
          <CommandInput
            placeholder={PLACEHOLDER}
            value={inputValue}
            onValueChange={setInputValue}
            data-testid="sidebar-search-input"
          />
          <CommandList>
            {searchQuery.isLoading ? (
              <CommandEmpty>
                <CustomSpinner className="h-5 w-5" />
              </CommandEmpty>
            ) : debouncedValue && (!results || results.length === 0) ? (
              <CommandEmpty>No results found.</CommandEmpty>
            ) : (
              results?.length > 0 &&
              inputValue?.length > 0 && (
                <CommandGroup className="py-2">
                  {results.map((result) => (
                    <CommandItem
                      key={`${result.type}-${result.name}-${
                        'version' in result ? result.version : ''
                      }`}
                      value={`${result.type}-${result.name}-${Math.random()}`}
                      onSelect={async () => {
                        onClose();
                        await router.push(generateLink(result));
                      }}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {(() => {
                        switch (result.type) {
                          case 'package':
                            return (
                              <>
                                <Box className="h-6 w-6 shrink-0 opacity-50 mr-1" />
                                <div
                                  className="flex flex-col gap-0.5"
                                  data-testid="search-package-section"
                                >
                                  <span>{result.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {result.name}
                                    {formatVersionAndPreset(
                                      result.version,
                                      result.preset
                                    )}{' '}
                                    on{' '}
                                    {getChainById(result.chainId)?.name ||
                                      'Unknown Chain'}{' '}
                                    (ID: {result.chainId})
                                  </span>
                                </div>
                              </>
                            );
                          case 'namespace':
                            return (
                              <>
                                <Boxes className="h-6 w-6 shrink-0 opacity-50 mr-1" />
                                <div
                                  className="flex flex-col gap-0.5"
                                  data-testid="search-namespace-section"
                                >
                                  <span>{result.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {result.count} package
                                    {result.count !== 1 && 's'}
                                  </span>
                                </div>
                              </>
                            );
                          case 'contract':
                            return (
                              <>
                                <FileCode className="h-6 w-6 shrink-0 opacity-50 mr-1.5" />
                                <div
                                  className="flex flex-col gap-0.5"
                                  data-testid="search-contract-section"
                                >
                                  <span>{result.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {result.packageName}
                                    {formatVersionAndPreset(
                                      result.version,
                                      result.preset
                                    )}{' '}
                                    on{' '}
                                    {getChainById(result.chainId)?.name ||
                                      'Unknown Chain'}{' '}
                                    (ID: {result.chainId})
                                  </span>
                                </div>
                              </>
                            );
                          case 'function':
                            return (
                              <>
                                <CodeXml className="h-6 w-6 shrink-0 opacity-50 mr-1.5" />
                                <div
                                  className="flex flex-col gap-0.5"
                                  data-testid="search-function-section"
                                >
                                  <span>
                                    {result.contractName}.{result.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {result.packageName}
                                    {formatVersionAndPreset(
                                      result.version ?? '',
                                      result.preset ?? ''
                                    )}{' '}
                                    on{' '}
                                    {getChainById(result.chainId!)?.name ||
                                      'Unknown Chain'}{' '}
                                    (ID: {result.chainId})
                                  </span>
                                </div>
                              </>
                            );
                          default:
                            return null;
                        }
                      })()}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
};

export default SearchBar;
