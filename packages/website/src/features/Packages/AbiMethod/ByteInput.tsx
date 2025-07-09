import { FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import { stringToHex } from 'viem';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ByteInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  byte?: number;
  error?: string;
}

const validateByteInput = (
  value: string,
  byte?: number
): string | undefined => {
  // For dynamic bytes (bytes), validate hex format and odd length
  if (!byte) {
    if (value.startsWith('0x')) {
      // Only check odd length if the hex part contains only valid hex characters
      const hexPart = value.slice(2); // Remove '0x' prefix
      if (/^[0-9a-fA-F]*$/.test(hexPart) && hexPart.length % 2 === 1) {
        return 'Hex string must have even number of characters after 0x prefix';
      }
    }
    return undefined;
  }

  // For fixed-size bytes (bytes1-32)
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

export const ByteInput: FC<ByteInputProps> = ({
  handleUpdate,
  value,
  byte,
  error,
}) => {
  const [inputValue, setInputValue] = useState(value || '');

  // Create a dynamic regex based on the byte size
  const hexRegex = byte
    ? new RegExp(`^0x[0-9a-fA-F]{${byte * 2}}$`) // Fixed size: exact length
    : /^0x([0-9a-fA-F]{2})*$/; // Dynamic: any even length hex string

  const getHandleUpdateValues = (
    inputValue: string,
    byte?: number
  ): [string | undefined, string?] => {
    const validationError = validateByteInput(inputValue, byte);

    // Allow empty input
    if (!inputValue) {
      return [undefined];
    }

    if (!hexRegex.test(inputValue)) {
      if (inputValue.startsWith('0x')) {
        // Invalid hex format - only return error if it's a validation error (like odd length)
        return validationError ? [undefined, validationError] : [undefined];
      } else {
        // Convert string to hex
        const hexValue = stringToHex(
          inputValue,
          byte ? { size: byte } : undefined
        );
        return validationError ? [hexValue, validationError] : [hexValue];
      }
    } else {
      // Valid hex string
      return [inputValue];
    }
  };

  const handleChange = (inputValue: string) => {
    const updateValues = getHandleUpdateValues(inputValue, byte);
    handleUpdate(...updateValues);
    setInputValue(inputValue);
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
          placeholder={byte ? `0x${'0'.repeat(byte * 2)}` : '0x...'}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value || '')}
          data-testid={`byte${byte ? String(byte) : 'dynamic'}-input`}
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
