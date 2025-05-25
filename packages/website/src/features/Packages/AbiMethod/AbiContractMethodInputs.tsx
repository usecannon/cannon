import { PlusIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AbiContractMethodInputType } from './AbiContractMethodInputType';
import {
  getDefaultValue,
  InputState,
} from '@/features/Packages/AbiMethod/utils';

const getInputType = (input: AbiParameter): 'single' | 'array' => {
  // tuple[] is handled as a single input receiving a string that is parsed as a JSON object
  if (input.type.endsWith('[]') && !input.type.includes('tuple'))
    return 'array';
  return 'single';
};

interface ArrayActionButtonsProps {
  type: 'add' | 'remove';
  onClick: () => void;
}

const ArrayActionButtons: FC<ArrayActionButtonsProps> = ({ type, onClick }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={
        type === 'remove'
          ? 'text-destructive hover:text-destructive/90'
          : 'py-4 text-primary hover:text-primary/90'
      }
      data-testid={`${type}-input-button`}
    >
      {type === 'remove' ? (
        <X className="h-4 w-4" />
      ) : (
        <PlusIcon className="h-4 w-4" />
      )}
    </Button>
  );
};

interface Props {
  input: AbiParameter;
  handleUpdate: (state: InputState) => void;
  state: InputState;
}

export const ContractMethodInputs: FC<Props> = ({
  input,
  handleUpdate,
  state,
}) => {
  const inputType = getInputType(input);
  const isInputTypeArray = inputType === 'array';

  const addInputToArray = () => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const currentArray = (state.parsedValue as InputState[]) || [];
    const newArray = [...currentArray, getDefaultValue(input)];
    handleUpdate({
      inputValue: '',
      parsedValue: newArray,
      error: undefined,
    });
  };

  const removeInputFromArray = (index: number) => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const currentArray = (state.parsedValue as InputState[]) || [];
    const newArray = currentArray
      .slice(0, index)
      .concat(currentArray.slice(index + 1));
    handleUpdate({
      inputValue: '',
      parsedValue: newArray,
      error: undefined,
    });
  };

  if (isInputTypeArray) {
    const arrayValue = (state.parsedValue as InputState[]) || [];
    return (
      <div>
        {arrayValue.map((itemState, index) => {
          return (
            <div
              className={`flex flex-1 items-center ${
                index === arrayValue.length - 1 ? '' : 'mb-4'
              }`}
              key={index}
            >
              <AbiContractMethodInputType
                input={input}
                state={itemState}
                handleUpdate={(newState) => {
                  const newArray = [...arrayValue];
                  newArray[index] = newState;
                  handleUpdate({
                    inputValue: '',
                    parsedValue: newArray,
                    error: undefined,
                  });
                }}
              />
              {arrayValue.length > 1 && (
                <ArrayActionButtons
                  type="remove"
                  onClick={() => removeInputFromArray(index)}
                />
              )}
            </div>
          );
        })}
        <ArrayActionButtons type="add" onClick={addInputToArray} />
      </div>
    );
  } else {
    return (
      <div className="flex flex-row items-center">
        <div className="flex-1">
          <AbiContractMethodInputType
            input={input}
            state={state}
            handleUpdate={handleUpdate}
          />
        </div>
      </div>
    );
  }
};
