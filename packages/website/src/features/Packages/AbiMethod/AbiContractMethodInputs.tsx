import { PlusIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AbiContractMethodInputType } from './AbiContractMethodInputType';
import {
  getBaseType,
  getDefaultValue,
  //InputState,
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
  methodParameter: AbiParameter;
  handleUpdate: (value: any, error?: string) => void;
  value: unknown | unknown[];
  error?: string;
}

export const ContractMethodInputs: FC<Props> = ({
  methodParameter,
  handleUpdate,
  value,
  error,
}) => {
  const inputType = getInputType(methodParameter);
  const isInputTypeArray = inputType === 'array';

  const addInputToArray = () => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const currentArray = (value as Array<unknown>) || [];
    const newArray = [
      ...currentArray,
      getDefaultValue(getBaseType(methodParameter)),
    ];
    handleUpdate(newArray);
  };

  const removeInputFromArray = (index: number) => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const currentArray = (value as Array<unknown>) || [];
    const newArray = currentArray
      .slice(0, index)
      .concat(currentArray.slice(index + 1));
    handleUpdate(newArray);
  };

  if (isInputTypeArray && !methodParameter.type.endsWith('[][]')) {
    // only single arrays have dynamic inputs, nested arrays are handled by JsonInputs
    const arrayValue = (value as Array<unknown>) || [];
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
                input={methodParameter}
                value={itemState}
                error={error}
                handleUpdate={(newState) => {
                  const newArray = [...arrayValue];
                  newArray[index] = newState;
                  handleUpdate(newArray);
                }}
              />
              {arrayValue.length > 0 && (
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
            input={methodParameter}
            value={value}
            handleUpdate={handleUpdate}
          />
        </div>
      </div>
    );
  }
};
