import { Input } from '@chakra-ui/react';
import { FC, useEffect, useMemo, useState } from 'react';
import { parseEther } from 'viem';

export const NumberInput: FC<{
  handleUpdate: (value: bigint) => void;
  value?: string;
  positiveOnly?: boolean;
}> = ({ handleUpdate, value = '0', positiveOnly = false }) => {
  // TODO: Doesn't look a solid approach (parseEther if it has dot)
  const parseValue = (_value: string): bigint =>
    _value.includes('.') ? parseEther(_value) : BigInt(_value);

  const [updateValue, setUpdateValue] = useState<bigint>(parseValue(value));
  useEffect(() => handleUpdate(updateValue), [updateValue]);
  const isInvalid = useMemo(
    () => positiveOnly && updateValue < BigInt(0),
    [updateValue, positiveOnly]
  );

  return (
    <Input
      type="number"
      bg="black"
      step="1"
      v-model="value"
      borderColor={isInvalid ? 'red.500' : 'whiteAlpha.400'}
      is-invalid={isInvalid}
      value={updateValue.toString()}
      _focus={{ borderColor: isInvalid ? 'red.500' : 'blue.300' }}
      onChange={(e) => {
        setUpdateValue(parseValue(e.target.value));
      }}
    />
  );
};
