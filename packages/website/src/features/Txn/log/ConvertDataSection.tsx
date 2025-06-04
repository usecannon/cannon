import React, { useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type ConvertDataSectionProps = {
  data: string;
};

const ConvertDataSection: React.FC<ConvertDataSectionProps> = ({ data }) => {
  const [value, setValue] = useState<string>('Hex');
  const inputArray = data.slice(2).match(/(.{1,64})/g) || [];

  return (
    <>
      <div className="relative w-full p-4 bg-gray-800 text-gray-400 font-mono border border-gray-800 rounded-md text-sm">
        {data !== '0x' && (
          <div className="absolute top-2 right-2 z-10 bg-gray-900 rounded-md shadow">
            <ToggleGroup
              type="single"
              value={value}
              className="space-x-1"
              onValueChange={(val) => {
                if (val) {
                  setValue(val);
                }
              }}
              size="sm"
            >
              <ToggleGroupItem value="Dec">Dec</ToggleGroupItem>
              <ToggleGroupItem value="Hex">Hex</ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
        {value === 'Hex' ? (
          data
        ) : (
          <ul>
            {inputArray.map((input, index) => (
              <li key={index}>{BigInt('0x' + input).toString(10)}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default ConvertDataSection;
