import { AddressInput } from '@/features/Packages/FunctionInput/AddressInput';
import { BoolInput } from '@/features/Packages/FunctionInput/BoolInput';
import { DefaultInput } from '@/features/Packages/FunctionInput/DefaultInput';
import { NumberInput } from '@/features/Packages/FunctionInput/NumberInput';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';
import { Box, Flex, IconButton } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';
import { FC, useEffect, useMemo, useState } from 'react';
import TupleInput from './FunctionInput/TupleInput';

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
  const isArray = useMemo(() => !!input?.type?.endsWith('[]'), [input]);
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
        // TODO: implement value prop for TupleInput
        return <TupleInput input={input} handleUpdate={_handleUpdate} />;
      default:
        return (
          <DefaultInput
            handleUpdate={_handleUpdate}
            inputType={input.type}
            value={_initialValue}
          />
        );
    }
  };

  let c;

  if (!isArray) {
    c = (
      <Flex direction="row" align="center">
        <Flex flex="1">
          {getInputComponent((value: any) => _handleUpdate(null, value))}
        </Flex>
      </Flex>
    );
  } else {
    c = (
      <>
        <Box>
          {dataArray.map((inp, index) => {
            return (
              <Flex
                flex="1"
                alignItems="center"
                mb={index === dataArray.length - 1 ? 0 : 4}
                key={index}
              >
                {getInputComponent(
                  (value: any) => _handleUpdate(index, value),
                  index
                )}
                {dataArray.length > 1 && (
                  <IconButton
                    variant="link"
                    colorScheme="red"
                    onClick={() => remove(index)}
                    aria-label="add value"
                    icon={<CloseIcon fontSize=".8rem" />}
                  />
                )}
              </Flex>
            );
          })}
          <Box textAlign="right" alignItems="right">
            <IconButton
              py="4"
              variant="link"
              colorScheme="green"
              onClick={add}
              aria-label="add value"
              icon={<AddIcon />}
            />
          </Box>
        </Box>
      </>
    );
  }

  return <Box>{c}</Box>;
};
