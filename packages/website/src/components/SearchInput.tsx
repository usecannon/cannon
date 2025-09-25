import React, { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { debounce } from 'lodash';
import { useDeployInputStore } from '@/helpers/store';
import InputDropdownList from '@/components/InputDropdownList';

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
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
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

  const ignoreBlur = useRef(false);

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
          if (!ignoreBlur.current) {
            setTimeout(() => setIsFocused(false), 100);
          }
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
        <InputDropdownList
          inputs={filteredInputs}
          onSelect={(input) => {
            setInputValue(input);
            debouncedHandleSearch(input);
            setIsFocused(false);
          }}
          onDelete={(input) => {
            deleteInput(input);
          }}
          setIgnoreBlur={(value) => {
            ignoreBlur.current = value;
          }}
        />
      )}
    </div>
  );
};

export default SearchInput;
