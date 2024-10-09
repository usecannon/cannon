import React from 'react';
import { InputGroup, InputLeftElement, Input } from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import { debounce } from 'lodash';

interface SearchInputProps {
  onSearchChange: (value: string) => void;
  debounceDelay?: number;
  placeholder?: string;
  size?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  debounceDelay = 300,
  placeholder = 'Search...',
  size,
}) => {
  const debouncedHandleSearch = React.useMemo(
    () => debounce(onSearchChange, debounceDelay),
    [onSearchChange, debounceDelay]
  );

  return (
    <InputGroup borderColor="gray.600" size={size}>
      <InputLeftElement pointerEvents="none">
        <SearchIcon color="gray.500" />
      </InputLeftElement>
      <Input
        onChange={(e) => debouncedHandleSearch(e.target.value)}
        name="search"
        placeholder={placeholder}
      />
    </InputGroup>
  );
};

export default SearchInput;
