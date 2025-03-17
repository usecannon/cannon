import { AddressInput } from '@/features/Packages/FunctionInput/AddressInput';
import { BoolInput } from '@/features/Packages/FunctionInput/BoolInput';
import { ByteInput } from '@/features/Packages/FunctionInput/ByteInput';
import { DefaultInput } from '@/features/Packages/FunctionInput/DefaultInput';
import { NumberInput } from '@/features/Packages/FunctionInput/NumberInput';
import { PlusIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AbiParameter } from 'abitype';
import { FC, useEffect, useMemo, useState } from 'react';
import TupleInput from './FunctionInput/TupleInput';
import { JsonInput } from '@/features/Packages/FunctionInput/JsonInput';

interface Props {
  input: AbiParameter;
  handleUpdate: (value: any) => void;
  initialValue?: any;
}

export const FunctionInput: FC<Props> = ({
  input,
  handleUpdate,
  initialValue,
}) => {
  const isTuple = useMemo(() => !!input?.type?.endsWith('[][]'), [input]);
  const isArray = useMemo(
    () => !isTuple && !!input?.type?.endsWith('[]'),
    [input, isTuple]
  );
  const [dataArray, setDataArray] = useState<{ val: any | null }[]>([]);

  const updateValue = (value: any) => {
    // When getting a single empty string array, the value should be an empty array
    // so the user is able to have an empty value
    const result =
      Array.isArray(value) && value.length === 1 && value[0] === ''
        ? []
        : value;
    handleUpdate(result);
  };

  const add = () => {
    setDataArray([...dataArray, { val: undefined }]);
  };

  const remove = (index: number) => {
    setDataArray(dataArray.slice(0, index).concat(dataArray.slice(index + 1)));
  };

  useEffect(() => {
    if (!isArray) return;
    updateValue(dataArray.map((item) => item.val));
  }, [dataArray, isArray]);

  useEffect(() => {
    if (!initialValue) return;
    if (isArray) {
      setDataArray(initialValue.map((val: any) => ({ val })));
    } else {
      updateValue(initialValue);
    }
  }, []);

  const _handleUpdate = (index: number | null, value: any) => {
    if (isArray) {
      const updatedArray = [...dataArray];
      updatedArray[index as number].val = value;
      setDataArray(updatedArray);
    } else {
      updateValue(value);
    }
  };

  const getInputComponent = (
    _handleUpdate: (value: any) => void,
    index?: number
  ) => {
    const _initialValue =
      initialValue && isArray && index !== undefined
        ? initialValue[index]
        : initialValue;

    switch (true) {
      case input.type.endsWith('[][]'):
        return <JsonInput handleUpdate={_handleUpdate} value={_initialValue} />;
      case input.type.startsWith('bool'):
        return <BoolInput handleUpdate={_handleUpdate} value={_initialValue} />;
      case input.type.startsWith('address'):
        return (
          <AddressInput handleUpdate={_handleUpdate} value={_initialValue} />
        );
      case input.type.startsWith('int') || input.type.startsWith('uint'):
        return (
          <NumberInput
            handleUpdate={_handleUpdate}
            initialValue={_initialValue}
          />
        );
      case input.type.startsWith('tuple'):
        return (
          <TupleInput
            input={input}
            handleUpdate={_handleUpdate}
            value={_initialValue}
          />
        );
      case input.type.startsWith('bytes1'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={1}
          />
        );
      case input.type.startsWith('bytes2'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={2}
          />
        );
      case input.type.startsWith('bytes4'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={4}
          />
        );
      case input.type.startsWith('bytes8'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={8}
          />
        );
      case input.type.startsWith('bytes16'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={16}
          />
        );
      case input.type.startsWith('bytes32'):
        return (
          <ByteInput
            handleUpdate={_handleUpdate}
            value={_initialValue}
            byte={32}
          />
        );
      default:
        return (
          <DefaultInput handleUpdate={_handleUpdate} value={_initialValue} />
        );
    }
  };

  if (isTuple || !isArray) {
    return (
      <div className="flex flex-row items-center">
        <div className="flex-1">
          {getInputComponent((value: any) => _handleUpdate(null, value))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {dataArray.map((inp, index) => {
          return (
            <div
              className={`flex flex-1 items-center ${
                index === dataArray.length - 1 ? '' : 'mb-4'
              }`}
              key={index}
            >
              {getInputComponent(
                (value: any) => _handleUpdate(index, value),
                index
              )}
              {dataArray.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive/90"
                  data-testid="remove-input-button"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            onClick={add}
            className="py-4 text-primary hover:text-primary/90"
            data-testid="add-input-button"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
