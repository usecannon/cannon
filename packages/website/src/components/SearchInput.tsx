import React from 'react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';

interface SearchInputProps {
  onSearchChange: (value: string) => void;
  debounceDelay?: number;
  placeholder?: string;
  size?: 'sm' | 'default' | 'lg';
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  debounceDelay = 300,
  placeholder = '',
  size = 'default',
}) => {
  const debouncedHandleSearch = React.useMemo(
    () => debounce(onSearchChange, debounceDelay),
    [onSearchChange, debounceDelay]
  );

  return (
    <div className="relative">
      <MagnifyingGlassIcon
        className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 ${
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
        }`}
      />
      <Input
        onChange={(e) => debouncedHandleSearch(e.target.value)}
        name="search"
        placeholder={placeholder}
        className={`pl-8 ${
          size === 'sm'
            ? 'h-8 text-sm'
            : size === 'lg'
            ? 'h-12 text-lg'
            : 'h-10'
        }`}
      />
    </div>
  );
};

export default SearchInput;
