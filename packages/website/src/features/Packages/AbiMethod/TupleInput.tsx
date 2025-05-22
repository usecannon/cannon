import { BigNumber } from '@ethersproject/bignumber';
import { useEffect } from 'react';
import { AbiParameter } from 'viem';
import { AbiMethodRender } from './AbiMethodRender';
import { Label } from '@/components/ui/label';

// Type guard to check if AbiParameter has components
const isTupleTypeWithComponents = (
  input: AbiParameter
): input is AbiParameter & { components: readonly AbiParameter[] } => {
  return 'components' in input;
};

const TupleInput = ({
  input,
  handleUpdate,
  value,
}: {
  input: AbiParameter;
  handleUpdate: (value: any) => void;
  value?: Record<string, any>;
}) => {
  const getDefaultValueForType = (component: AbiParameter) => {
    if (component.type.startsWith('bool')) return false;
    if (component.type.startsWith('int')) return '0';
    if (component.type.startsWith('uint')) return '0';
    return '';
  };

  useEffect(() => {
    if (!isTupleTypeWithComponents(input)) return;

    // If value is undefined or empty, initialize with default values
    if (!value || Object.keys(value).length === 0) {
      const initialValue = input.components.reduce(
        (acc: Record<string, any>, component: AbiParameter) => {
          if (component.name) {
            acc[component.name] = getDefaultValueForType(component);
          }
          return acc;
        },
        {}
      );
      handleUpdate(initialValue);
    }
  }, [input, value, handleUpdate]);

  if (!isTupleTypeWithComponents(input)) {
    throw new Error('Input is not a tuple type with components');
  }

  return (
    <div className="flex flex-col w-full border-l border-border mt-1 pt-1 pl-4">
      {input.components.map((component: AbiParameter, index: number) => (
        <div className="mb-4" key={index}>
          <Label className="mb-1">
            {component.name && <span>{component.name}</span>}
            {component.type && (
              <span className="text-xs font-mono text-muted-foreground ml-1">
                {component.type}
              </span>
            )}
          </Label>
          <AbiMethodRender
            input={component}
            handleUpdate={(newValue) => {
              // Since tuple components are represented as a JSON object,
              // We represent the bigint type as a string
              if (typeof newValue === 'bigint') {
                newValue = BigNumber.from(newValue).toString();
              }
              if (component.name) {
                const updatedValue = { ...value, [component.name]: newValue };
                handleUpdate(updatedValue);
              }
            }}
            initialValue={component.name ? value?.[component.name] : undefined}
          />
        </div>
      ))}
    </div>
  );
};

export default TupleInput;
