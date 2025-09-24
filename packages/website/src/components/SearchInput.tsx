import React, { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';
import { useDeployInputStore } from '@/helpers/store';

interface SearchInputProps {
  onSearchChange: (value: string) => void;
  debounceDelay?: number;
  placeholder?: string;
  size?: 'sm' | 'default' | 'lg';
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({
  onSearchChange,
  debounceDelay = 300,
  placeholder = '',
  size = 'default',
  onKeyDown,
}) => {
  const { deployInputs, setInput, deleteInput } = useDeployInputStore();
  const [isFocused, setIsFocused] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  const debouncedSetValue = useRef(
    debounce((value: string) => {
      if (value.trim().length > 2) {
        setDebouncedValue(value.trim());
      }
    }, 300)
  ).current;

  const debouncedHandleSearch = React.useMemo(
    () => debounce(onSearchChange, debounceDelay),
    [onSearchChange, debounceDelay]
  );

  useEffect(() => {
    debouncedSetValue(inputValue);
    return () => {
      debouncedSetValue.cancel();
    };
  }, [inputValue, debouncedSetValue]);

  useEffect(() => {
    if (debouncedValue) {
      setInput(debouncedValue);
    }
  }, [debouncedValue]);

  const handleChange = (value: string) => {
    setInputValue(value);
    debouncedHandleSearch(value);
  };

  const filteredInputs = deployInputs.filter(
    (input) => input && input.trim() !== '' && input.includes(inputValue)
  );

  return (
    <div className="relative">
      <Search
        className={`absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-500 ${
          size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'
        }`}
      />
      <Input
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 100);
        }}
        name="search"
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`pl-8 ${
          size === 'sm'
            ? 'h-8 text-sm'
            : size === 'lg'
            ? 'h-12 text-lg'
            : 'h-10'
        }`}
        autoComplete="off"
        data-testid="search-input"
      />
      {isFocused && filteredInputs.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-[100] max-h-60 overflow-y-auto">
          {filteredInputs.map((input, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
              onClick={() => {
                setInputValue(input);
                debouncedHandleSearch(input);
                setIsFocused(false);
              }}
            >
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-gray-500" />
                <span className="truncate">{input}</span>
              </div>
              <X
                className="h-4 w-4 text-gray-400"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteInput(input);
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchInput;
