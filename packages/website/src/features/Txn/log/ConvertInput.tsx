import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const ConvertInput = () => {
  const [inputValue, setInputValue] = useState<boolean>(false);

  return (
    <div className="flex items-center space-x-2">
      {/* <Switch
        data-testid="bool-input"
        checked={inputValue === true}
        // onCheckedChange={handleChange}
      /> */}
      <Label htmlFor="bool-input">
        {inputValue === true ? 'True' : 'False'}
      </Label>
    </div>
  );
};

export default ConvertInput;
