import { BigNumber } from '@ethersproject/bignumber';
import { useState } from 'react';
import { AbiParameter } from 'viem';
import { FunctionInput } from '../FunctionInput';
import { Label } from '@/components/ui/label';

const TupleInput = ({
  input,
  handleUpdate,
  value,
}: {
  input: any;
  handleUpdate: (value: any) => void;
  value?: Record<string, any>;
}) => {
  const getDefaultValueForType = (component: AbiParameter) => {
    if (component.type.startsWith('bool')) return false;
    if (component.type.startsWith('int')) return '0';
    if (component.type.startsWith('uint')) return '0';
    return '';
  };

  // Initialize the tuple state as an object, with keys corresponding to tuple property names
  const [tupleState, setTupleState] = useState(() =>
    input.components.reduce((acc: any, component: any) => {
      // Use value prop if available, otherwise use default value
      acc[component.name] =
        value?.[component.name] ?? getDefaultValueForType(component);
      return acc;
    }, {})
  );

  const updateTupleValue = (name: string, value: any) => {
    const updatedTupleState = { ...tupleState, [name]: value };
    setTupleState(updatedTupleState);
    handleUpdate(updatedTupleState); // Pass the entire tuple object up
  };

  return (
    <div className="flex flex-col w-full border-l border-border/60 pl-4">
      {input.components.map((component: any, index: number) => (
        <div className="mb-4" key={index}>
          <Label className="mb-1">
            {component.name && <span>{component.name}</span>}
            {component.type && (
              <span className="text-xs text-muted-foreground ml-1">
                {component.type}
              </span>
            )}
          </Label>
          <FunctionInput
            input={component}
            handleUpdate={(value) => {
              // Since tuple components are represented as a JSON object,
              // We represent the bigint type as a string
              if (typeof value === 'bigint') {
                value = BigNumber.from(value).toString();
              }
              updateTupleValue(component.name, value);
            }}
            initialValue={tupleState[component.name]}
          />
        </div>
      ))}
    </div>
  );
};

export default TupleInput;
