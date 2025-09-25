import React from 'react';
import { Search, X } from 'lucide-react';

interface InputDropdownListProps {
  inputs: string[];
  onSelect: (input: string) => void;
  onDelete: (input: string) => void;
  setIgnoreBlur: (value: boolean) => void;
}

const InputDropdownList: React.FC<InputDropdownListProps> = ({
  inputs,
  onSelect,
  onDelete,
  setIgnoreBlur,
}) => {
  if (inputs.length === 0) return null;

  return (
    <div className="absolute top-full left-0 mt-1 w-full bg-popover border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
      {inputs.map((input, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-3 py-2 hover:bg-accent cursor-pointer"
          onClick={() => {
            onSelect(input);
          }}
        >
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-500" />
            <span className="truncate">{input}</span>
          </div>
          <X
            className="h-4 w-4 text-gray-400"
            onMouseDown={(e) => {
              e.preventDefault();
              setIgnoreBlur(true);
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(input);
              setIgnoreBlur(false);
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default InputDropdownList;
