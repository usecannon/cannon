import { PlusIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbiParameter } from 'abitype';
import { FC } from 'react';
import { AbiMethodRenderInput } from './AbiMethodRenderInput';

// Define type for objects that must have a val property
type UnknownArrayItem = { val: unknown } & Record<string, unknown>;

// Helper function to determine input type based on ABI parameter type
type InputType = 'single' | 'array' | 'tuple';
const getInputType = (input: AbiParameter): InputType => {
  if (input.type.endsWith('[][]')) return 'tuple';
  if (input.type.endsWith('[]')) return 'array';
  return 'single';
};

interface ArrayActionButtonsProps {
  type: 'add' | 'remove';
  onClick: () => void;
}

const ArrayActionButtons: FC<ArrayActionButtonsProps> = ({ type, onClick }) => {
  {
    /* <div className="text-right">
        </div> */
  }
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
  handleUpdate: (value: any, error?: string) => void;
  initialValue?: unknown | UnknownArrayItem[];
}

export const AbiMethodRender: FC<Props> = ({
  input,
  handleUpdate,
  initialValue,
}) => {
  const inputType = getInputType(input);
  const isInputTypeArray = inputType === 'array';

  const addInputToArray = () => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const _value = initialValue as UnknownArrayItem[];
    handleUpdate([..._value, { val: undefined }]);
  };

  const removeInputFromArray = (index: number) => {
    if (!isInputTypeArray) throw new Error('input is not an array');
    const _value = initialValue as UnknownArrayItem[];
    handleUpdate(_value.slice(0, index).concat(_value.slice(index + 1)));
  };

  if (isInputTypeArray) {
    const _value = initialValue as UnknownArrayItem[];
    return (
      <div>
        {_value.map((indexValue, index) => {
          return (
            <div
              className={`flex flex-1 items-center ${
                index === _value.length - 1 ? '' : 'mb-4'
              }`}
              key={index}
            >
              <AbiMethodRenderInput
                input={input}
                handleUpdate={(value: any, error?: string) => {
                  if (!isInputTypeArray)
                    throw new Error('input is not an array');
                  const copy = [...(initialValue as UnknownArrayItem[])].map(
                    (item: any, i: number) =>
                      i === index ? { val: value } : item
                  );
                  handleUpdate(
                    copy,
                    error
                      ? `value: ${value} at index ${index} is invalid`
                      : undefined
                  );
                }}
                value={indexValue}
              />
              {_value.length > 1 && (
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
          <AbiMethodRenderInput
            input={input}
            handleUpdate={handleUpdate}
            value={initialValue}
          />
        </div>
      </div>
    );
  }
};
