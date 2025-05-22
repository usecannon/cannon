import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { stringToHex } from 'viem';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const validateByteInput = (value: string, byte: number): string | undefined => {
  // Only validate length for complete inputs
  if (value.startsWith('0x')) {
    const expectedLength = 2 + byte * 2; // 2 for '0x' prefix + 2 characters per byte
    if (value?.length > expectedLength) {
      return `Input is ${
        value?.length - expectedLength
      } too long. It must be ${expectedLength} characters.`;
    }
  } else {
    if (value?.length > byte) {
      return `Input is ${
        value?.length - byte
      } characters too long. It must be ${byte} characters.`;
    }
  }
  return undefined;
};

type ByteInputProps = {
  handleUpdate: (value: string, error?: string) => void;
  value?: string;
  byte?: number;
};

export const ByteInput: FC<ByteInputProps> = ({
  handleUpdate,
  value = '',
  byte = 32,
}) => {
  // Create a dynamic regex based on the byte size
  // This regex validates that the input is a valid hex string with the correct length
  // Example for byte=32: ^0x[0-9a-fA-F]{64}$ (0x + 64 hex characters)
  const hexRegex = new RegExp(`^0x[0-9a-fA-F]{${byte * 2}}$`);
  const [error, setError] = useState<string | undefined>(
    validateByteInput(value, byte)
  );

  const handleChange = (inputValue: string) => {
    const validationError = validateByteInput(inputValue, byte);
    setError(validationError);

    // If the input is not a valid hex string
    if (!hexRegex.test(inputValue)) {
      if (inputValue.startsWith('0x')) {
        // If it starts with 0x but isn't a valid hex, pass it through as is
        // This allows partial hex inputs while typing
        handleUpdate(inputValue, validationError);
      } else {
        // If it's not a hex string at all, convert it to hex
        // We slice to ensure we don't exceed the byte limit
        // Example: "hello" -> "0x68656c6c6f"
        handleUpdate(
          stringToHex(inputValue.slice(0, byte), { size: byte }),
          validationError
        );
      }
    } else {
      // If it's already a valid hex string, pass it through
      handleUpdate(inputValue, validationError);
    }
  };

  return (
    <Tooltip open={!!error}>
      <TooltipTrigger asChild>
        <Input
          type="text"
          className={cn(
            'bg-background',
            error
              ? 'border-destructive focus:border-destructive focus-visible:ring-destructive'
              : 'border-input'
          )}
          placeholder={`0x${'0'.repeat(byte * 2)}`}
          value={value}
          onChange={(e) => handleChange(e.target.value || '')}
          data-testid={`byte${String(byte)}-input`}
        />
      </TooltipTrigger>
      {error && (
        <TooltipContent side="top" className="max-w-sm text-center">
          <p>{error}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
