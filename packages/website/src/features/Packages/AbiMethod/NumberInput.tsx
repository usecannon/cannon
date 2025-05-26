import { FC, useRef, ChangeEvent, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { parseUnits } from 'viem';

interface NumberInputProps {
  handleUpdate: (value: any, error?: string) => void;
  value: any;
  error?: string;
  suffix?: string;
  showWeiValue?: boolean;
  fixedDecimals?: number;
}

export const NumberInput: FC<NumberInputProps> = ({
  handleUpdate,
  value,
  error,
  suffix,
  showWeiValue = false,
  fixedDecimals = 0,
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const decimals = fixedDecimals;
  const inputRef = useRef<HTMLInputElement>(null);

  // const checkDecimalPlaces = (input: string) => {
  //   const decimalPlaces = input.includes('.') ? input.split('.')[1].length : 0;
  //   if (decimalPlaces > decimals) {
  //     return false;
  //   }
  //   return true;
  // };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const _value = event.target.value;

    if (_value === '') {
      handleUpdate(undefined);
      setInputValue('');
      return;
    }

    // if (!checkDecimalPlaces(inputValue)) {
    //   handleUpdate({
    //     inputValue,
    //     parsedValue: undefined,
    //     error: `Input has more decimal places than allowed (max: ${decimals})`,
    //   });
    //   return;
    // }

    try {
      parseUnits(_value, decimals);
      handleUpdate(_value);
      setInputValue(_value);
    } catch {
      handleUpdate(undefined, 'Invalid number format');
    }
  };

  // const handleDecimalChange = (newDecimals: number) => {
  //   setDecimals(newDecimals);

  //   if (!state.inputValue) {
  //     return;
  //   }

  //   try {
  //     // Convert the current value to the new decimal places
  //     const currentValue = parseUnits(state.inputValue, decimals);
  //     const adaptedValue = formatUnits(currentValue, newDecimals);

  //     // Check if the adapted value has more decimals than allowed
  //     if (
  //       adaptedValue.includes('.') &&
  //       adaptedValue.split('.')[1].length > newDecimals
  //     ) {
  //       handleUpdate({
  //         inputValue: state.inputValue,
  //         parsedValue: undefined,
  //         error: `Value has more decimal places than allowed (max: ${newDecimals})`,
  //       });
  //       return;
  //     }

  //     // Update with the adapted value
  //     const newValue = parseUnits(adaptedValue, newDecimals);
  //     handleUpdate({
  //       inputValue: adaptedValue,
  //       parsedValue: newValue,
  //       error: undefined,
  //     });
  //   } catch {
  //     handleUpdate({
  //       inputValue: state.inputValue,
  //       parsedValue: undefined,
  //       error: 'Invalid number format',
  //     });
  //   }
  // };

  return (
    <div className="flex flex-col">
      <div className="flex items-stretch">
        <Input
          ref={inputRef}
          type="number"
          min={0}
          step="1"
          className={cn(
            'bg-background border-input rounded-r-none h-10',
            error &&
              'border-destructive focus:border-destructive focus-visible:ring-destructive'
          )}
          placeholder="0"
          value={inputValue}
          onChange={handleChange}
          data-testid="number-input"
        />
        {/* {!fixedDecimals && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-l-none px-2 h-10 flex items-center gap-1"
              >
                <span className="text-xs text-muted-foreground">
                  {decimals}d
                </span>
                <ChevronDownIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <Label>Decimal Places</Label>
              <div className="grid gap-4 mt-1">
                <Input
                  type="number"
                  min="0"
                  max="18"
                  value={decimals}
                  onChange={(e) => handleDecimalChange(Number(e.target.value))}
                  className="bg-background"
                />
                <p className="text-sm text-muted-foreground">
                  Configure the number of decimal for this value
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )} */}
        {suffix && (
          <div className="flex items-center px-3 py-1 bg-background text-gray-300 border border-l-0 border-border rounded-r-md h-10">
            {suffix}
          </div>
        )}
      </div>
      {showWeiValue && inputValue && (
        <p className="text-xs text-muted-foreground mt-1">{inputValue} wei</p>
      )}
    </div>
  );
};
