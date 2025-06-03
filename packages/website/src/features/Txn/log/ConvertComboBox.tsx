import React from 'react';
import { ArrowRight, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const frameworks = [
  {
    value: 'Dec',
    label: 'Dec',
  },
  {
    value: 'Hex',
    label: 'Hex',
  },
];

type ConvertComboBoxProps = {
  topic: string;
};

const ConvertComboBox: React.FC<ConvertComboBoxProps> = ({ topic }) => {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState('Dec');
  const topicDec = BigInt(topic).toString(10);
  const topicHex = '0x' + topic.slice(-40);

  return (
    <>
      <div className="flex sm:flex-row items-center mx-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-7 px-2 min-w-[5px] justify-between flex sm:flex-row items-center text-xs text-gray-900 bg-gray-400 rounded-sm"
            >
              {value
                ? frameworks.find((framework) => framework.value === value)
                    ?.label
                : 'Dec'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="min-w-[5px] p-0">
            <Command>
              <CommandList>
                <CommandGroup>
                  {frameworks.map((framework) => (
                    <CommandItem
                      key={framework.value}
                      value={framework.value}
                      onSelect={(currentValue) => {
                        setValue(currentValue === value ? '' : currentValue);
                        setOpen(false);
                      }}
                    >
                      {framework.label}
                      <Check
                        className={cn(
                          'ml-auto',
                          value === framework.value
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <ArrowRight className="h-3 w-3 mr-1 font-bold" />
      <span className="text-xs">
        {value === 'Dec' ? topicDec : topicHex}
      </span>{' '}
    </>
  );
};

export default ConvertComboBox;
