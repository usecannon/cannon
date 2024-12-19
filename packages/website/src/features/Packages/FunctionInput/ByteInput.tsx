import { FC, useEffect, useMemo, useState } from 'react';
import { Input } from '@chakra-ui/react';
import { stringToHex } from 'viem';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const ByteInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
  byte?: number;
}> = ({ handleUpdate, value = '', byte = 32 }) => {
  const bytes32Regex = /^0x[0-9a-fA-F]{64}$/;
  const [updateValue, setUpdateValue] = useState<string>(value);
  const isInvalid = useMemo(() => {
    if (updateValue.startsWith('0x')) {
      if (updateValue?.length > 0 && updateValue?.length > 66) {
        return `Input is ${
          updateValue?.length - 66
        } too long. It must be 66 characters.`;
      } else if (updateValue?.length > 0 && updateValue?.length < 66) {
        return `Input is ${
          66 - updateValue?.length
        } characters too short. It must be 66 characters.`;
      }
    } else {
      if (updateValue?.length > 0 && updateValue?.length > byte) {
        return `Input is ${
          updateValue?.length - byte
        }  characters too long. It must be ${byte} characters.`;
      }
    }
    return null;
  }, [updateValue]);

  useEffect(() => {
    if (!bytes32Regex.test(updateValue)) {
      if (updateValue.startsWith('0x')) {
        handleUpdate(updateValue);
      } else {
        handleUpdate(stringToHex(updateValue.slice(0, 32), { size: 32 }));
      }
    } else {
      handleUpdate(updateValue || '');
    }
  }, [updateValue]);

  return (
    <TooltipProvider>
      <Tooltip open={!!isInvalid}>
        <TooltipTrigger className="inline-flex w-full">
          <Input
            type="text"
            bg="black"
            borderColor={isInvalid ? 'red.500' : 'whiteAlpha.400'}
            placeholder="0x0000000000000000000000000000000000000000"
            value={updateValue}
            size="sm"
            onChange={(e) => {
              setUpdateValue(e.target.value || '');
            }}
            _focus={{
              borderColor: isInvalid ? 'red.500' : 'blue.300',
            }}
          />
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-center">
          {isInvalid}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
