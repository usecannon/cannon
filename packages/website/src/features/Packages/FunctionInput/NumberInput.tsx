import { FC, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseEther } from 'viem';

export const NumberInput: FC<{
  handleUpdate: (value: bigint | undefined) => void;
  initialValue?: bigint;
}> = ({ handleUpdate, initialValue }) => {
  // TODO: Doesn't look a solid approach (parseEther if it has dot)
  const parseValue = (val = ''): bigint | undefined => {
    if (!val) return;
    return val.includes('.') ? parseEther(val) : BigInt(val);
  };

  const [currentValue, setUpdateValue] = useState<bigint | undefined>(
    initialValue
  );

  useEffect(() => {
    handleUpdate(currentValue || BigInt(0));
  }, [currentValue]);

  return (
    <Input
      type="number"
      className="bg-background border-input/40 focus:border-primary"
      step="1"
      placeholder="0"
      value={currentValue?.toString() || ''}
      onChange={(e) => {
        setUpdateValue(parseValue(e.target.value));
      }}
    />
  );
};
