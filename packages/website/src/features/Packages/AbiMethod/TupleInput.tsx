import { useEffect, useState } from 'react';
import { AbiParameter } from 'viem';
import { ContractMethodInputs } from './AbiContractMethodInputs';
import { Label } from '@/components/ui/label';
import { InputState } from './utils';

// Type guard to check if AbiParameter has components
const isTupleTypeWithComponents = (
  input: AbiParameter
): input is AbiParameter & { components: readonly AbiParameter[] } => {
  return 'components' in input;
};

interface TupleInputProps {
  input: AbiParameter;
  handleUpdate: (value: any, error?: string) => void;
  value: any;
}

const TupleInput = ({ input, handleUpdate, value }: TupleInputProps) => {
  const [state, setInputState] = useState<InputState>({
    inputValue: value ? JSON.stringify(value) : '',
    error: undefined,
  });

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
      setInputState({
        inputValue: JSON.stringify(initialValue),
        error: undefined,
      });
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
          <ContractMethodInputs
            methodParameter={component}
            value={component.name ? value?.[component.name] : undefined}
            handleUpdate={(newValue, error) => {
              if (component.name) {
                const updatedValue = {
                  ...value,
                  [component.name]: newValue,
                };
                handleUpdate(updatedValue, error);
                setInputState({
                  inputValue: JSON.stringify(updatedValue),
                  error,
                });
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default TupleInput;
