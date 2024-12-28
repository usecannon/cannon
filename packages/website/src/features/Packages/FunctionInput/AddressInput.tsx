import { isAddress } from 'viem';
import { Input } from '@/components/ui/input';
import { FC, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

// This function is used to check if the value is an address or an array of addresses
const isValidArrayOrAddress = (value: any | any[]): boolean => {
  if (Array.isArray(value)) {
    return value.every((v) => isValidArrayOrAddress(v));
  }
  return isAddress(value);
};

export const AddressInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
}> = ({ handleUpdate, value = '' }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);
  const isInvalid = useMemo(() => {
    return updateValue?.length > 0 && !isValidArrayOrAddress(updateValue);
  }, [updateValue]);
  useEffect(() => handleUpdate(updateValue), [updateValue]);

  return (
    <Input
      type="text"
      className={cn(
        'bg-background border-input/40 focus:border-primary',
        isInvalid && 'border-destructive focus:border-destructive'
      )}
      placeholder="0x0000000000000000000000000000000000000000"
      value={updateValue}
      onChange={(e) => {
        setUpdateValue(e.target.value || '');
      }}
    />
  );
};
