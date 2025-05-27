import { isAddress } from 'viem';
import { Input } from '@/components/ui/input';
import React, { FC, useState } from 'react';
import { cn } from '@/lib/utils';

// Validates if a value is a valid Ethereum address or an array of valid addresses
const isValidEthereumAddress = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => isAddress(v));
  }
  return isAddress(value);
};

interface AddressInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  error?: string;
}

export const AddressInput: FC<AddressInputProps> = ({
  handleUpdate,
  value,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const _value = e.target.value;

    if (_value === '') {
      handleUpdate(undefined);
      setInputValue('');
      return;
    }

    const isValid = isValidEthereumAddress(_value);
    if (!isValid) {
      handleUpdate(undefined, 'Invalid address');
    } else {
      handleUpdate(_value);
    }
    setInputValue(_value);
  };

  return (
    <Input
      type="text"
      className={cn(
        'bg-background',
        error &&
          'border-destructive focus:border-destructive focus-visible:ring-destructive'
      )}
      placeholder="0x0000000000000000000000000000000000000000"
      value={inputValue}
      onChange={handleChange}
      data-testid="address-input"
    />
  );
};
