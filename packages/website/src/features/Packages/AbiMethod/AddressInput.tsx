import { isAddress } from 'viem';
import { Input } from '@/components/ui/input';
import { FC } from 'react';
import { cn } from '@/lib/utils';
import { InputState } from './utils';

// Validates if a value is a valid Ethereum address or an array of valid addresses
const isValidEthereumAddress = (value: string | string[]): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => isAddress(v));
  }
  return isAddress(value);
};

interface AddressInputProps {
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

export const AddressInput: FC<AddressInputProps> = ({
  handleUpdate,
  state,
}) => {
  const isInvalid =
    state.inputValue && !isValidEthereumAddress(state.inputValue);

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
      value={state.inputValue as string}
      onChange={(e) => {
        const value = e.target.value || '';
        const isValid = isAddress(value);
        handleUpdate({
          inputValue: value,
          parsedValue: isValid ? value : undefined,
          error: isValid ? undefined : 'Invalid address',
        });
      }}
      data-testid="address-input"
    />
  );
};
