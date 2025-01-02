import { FC, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { stringToHex } from 'viem';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
        <TooltipTrigger asChild>
          <Input
            type="text"
            className={cn(
              'bg-background border-input',
              isInvalid && 'border-destructive focus:border-destructive'
            )}
            placeholder="0x0000000000000000000000000000000000000000"
            value={updateValue}
            onChange={(e) => {
              setUpdateValue(e.target.value || '');
            }}
          />
        </TooltipTrigger>
        {isInvalid && (
          <TooltipContent side="top" className="max-w-sm text-center">
            <p>{isInvalid}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
