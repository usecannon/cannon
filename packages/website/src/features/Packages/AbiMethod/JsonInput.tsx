import { ChangeEvent, FC, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface JsonInputProps {
  isTupleArray: boolean;
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  error?: string;
}

export const JsonInput: FC<JsonInputProps> = ({
  handleUpdate,
  value,
  isTupleArray,
  error,
}) => {
  const [inputValue, setInputValue] = useState(
    Array.isArray(value) || (typeof value === 'object' && value !== null)
      ? JSON.stringify(value)
      : value || ''
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === '') {
      handleUpdate(undefined);
      setInputValue('');
      return;
    }

    try {
      const parsedValue = JSON.parse(value);
      handleUpdate(parsedValue);
      setInputValue(value);
    } catch (error) {
      handleUpdate(undefined, 'Invalid JSON format');
      setInputValue(value);
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
          placeholder={isTupleArray ? '[[v1, v2], [v3, v4]]' : '[v1, v2]'}
          value={inputValue}
          onChange={handleChange}
          data-testid="json-input"
        />
      </TooltipTrigger>
      {error && (
        <TooltipContent side="top" className="max-w-sm text-center">
          <p className="break-words">{error}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
