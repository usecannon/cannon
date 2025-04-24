import { isAddress } from 'viem';
import { Input } from '@/components/ui/input';
import { FC } from 'react';
import { cn } from '@/lib/utils';

// Validates if a value is a valid Ethereum address or an array of valid addresses
const isValidEthereumAddress = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => isAddress(v));
  }
  return isAddress(value);
};

interface AddressInputProps {
  handleUpdate: (value: string, error?: string) => void;
  value?: string;
}

export const AddressInput: FC<AddressInputProps> = ({
  handleUpdate,
  value = '',
}) => {
  const isInvalid = value?.length > 0 && !isValidEthereumAddress(value);

  return (
    <Input
      type="text"
      className={cn(
        'bg-background',
        isInvalid
          ? 'border-destructive focus:border-destructive focus-visible:ring-destructive'
          : 'border-input'
      )}
      placeholder="0x0000000000000000000000000000000000000000"
      value={value}
      onChange={(e) => {
        const v = e.target.value || '';
        const isValid = isAddress(v);
        handleUpdate(v, isValid ? undefined : 'Invalid address');
      }}
      data-testid="address-input"
    />
  );
};
