import { Input } from '@chakra-ui/react';
import { FC, useEffect, useMemo, useState } from 'react';
import { parseEther } from 'viem';

export const NumberInput: FC<{
  handleUpdate: (value: bigint | undefined) => void;
  value?: bigint;
}> = ({ handleUpdate, value }) => {
  // TODO: Doesn't look a solid approach (parseEther if it has dot)
  const parseValue = (_value = '0'): bigint =>
    _value
      ? _value.toString().includes('.')
        ? parseEther(_value)
        : BigInt(_value)
      : BigInt(0);

  const [updateValue, setUpdateValue] = useState<bigint | undefined>(value);

  useEffect(() => {
    handleUpdate(updateValue || BigInt(0));
  }, [updateValue]);

  return (
    <Input
      type="number"
      bg="black"
      step="1"
      size="sm"
      placeholder="0"
      value={updateValue?.toString()}
      onChange={(e) => {
        setUpdateValue(parseValue(e.target.value));
      }}
    />
  );
};
