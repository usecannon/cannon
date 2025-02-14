import { FC, useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export const JsonInput: FC<{
  handleUpdate: (value: string) => void;
  value?: string;
}> = ({ handleUpdate, value = '' }) => {
  const [updateValue, setUpdateValue] = useState<string>(value);

  // Check if the input is valid JSON
  const isInvalid = useMemo(() => {
    // Allow empty input
    if (updateValue.trim() === '') return null;

    try {
      JSON.parse(updateValue);
      return null;
    } catch (error) {
      if (error instanceof Error) {
        return `Invalid JSON: ${error.message}`;
      }
      return 'Invalid JSON format';
    }
  }, [updateValue]);

  useEffect(() => {
    // Only update if JSON is valid
    if (!isInvalid) {
      handleUpdate(updateValue ? JSON.parse(updateValue) : '');
    }
  }, [updateValue, isInvalid, handleUpdate]);

  return (
    <TooltipProvider>
      <Tooltip open={!!isInvalid}>
        <TooltipTrigger asChild>
          <Input
            type="text"
            className={cn(
              'bg-background',
              isInvalid
                ? 'border-destructive focus:border-destructive focus-visible:ring-destructive'
                : 'border-input'
            )}
            placeholder="[[v1, v2], [v3, v4]]"
            value={updateValue}
            onChange={(e) => {
              setUpdateValue(e.target.value || '');
            }}
            data-testid="json-input"
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
