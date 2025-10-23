import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { Option } from '@/lib/interact';

export function useContractSearch(options: Option[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Option[]>([]);

  const fuse = useMemo(
    () =>
      new Fuse<Option>(options, {
        keys: ['moduleName', 'contractName', 'contractAddress'],
      }),
    [options],
  );

  useEffect(() => {
    if (searchTerm) {
      const results = fuse.search(searchTerm).map(({ item }) => item);
      setSearchResults(results);
    } else {
      setSearchResults(options);
    }
  }, [fuse, searchTerm, options]);

  return { searchTerm, setSearchTerm, searchResults };
}
