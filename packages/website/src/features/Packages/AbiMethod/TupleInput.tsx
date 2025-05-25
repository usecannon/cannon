import { useEffect } from 'react';
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
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

const TupleInput = ({ input, handleUpdate, state }: TupleInputProps) => {
  const getDefaultValueForType = (component: AbiParameter) => {
    if (component.type.startsWith('bool')) return false;
    if (component.type.startsWith('int')) return '0';
    if (component.type.startsWith('uint')) return '0';
    return '';
  };

  useEffect(() => {
    if (!isTupleTypeWithComponents(input)) return;

    // If value is undefined or empty, initialize with default values
    if (!state.parsedValue || Object.keys(state.parsedValue).length === 0) {
      const initialValue = input.components.reduce(
        (acc: Record<string, any>, component: AbiParameter) => {
          if (component.name) {
            acc[component.name] = getDefaultValueForType(component);
          }
          return acc;
        },
        {}
      );
      handleUpdate({
        inputValue: JSON.stringify(initialValue),
        parsedValue: initialValue,
        error: undefined,
      });
    }
  }, [input, state.parsedValue, handleUpdate]);

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
            input={component}
            state={{
              inputValue: component.name
                ? state.parsedValue?.[component.name]?.toString()
                : '',
              parsedValue: component.name
                ? state.parsedValue?.[component.name]
                : undefined,
              error: undefined,
            }}
            handleUpdate={(newState) => {
              if (component.name) {
                const updatedValue = {
                  ...state.parsedValue,
                  [component.name]: newState.parsedValue,
                };
                handleUpdate({
                  inputValue: JSON.stringify(updatedValue),
                  parsedValue: updatedValue,
                  error: newState.error,
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
