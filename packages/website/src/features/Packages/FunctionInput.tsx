import { FC, useEffect, useMemo, useState } from 'react';
import { AbiParameter } from 'abitype';
import { Box, Flex, Link } from '@chakra-ui/react';
import { BoolInput } from '@/features/Packages/FunctionInput/BoolInput';
import { AddressInput } from '@/features/Packages/FunctionInput/AddressInput';
import { NumberInput } from '@/features/Packages/FunctionInput/NumberInput';
import { DefaultInput } from '@/features/Packages/FunctionInput/DefaultInput';
import { AddIcon, CloseIcon } from '@chakra-ui/icons';

export const FunctionInput: FC<{
  input: AbiParameter;
  valueUpdated: (value: any) => void;
}> = ({ input, valueUpdated }) => {
  const getDefaultValue = () => {
    if (input.type.startsWith('address')) return '';
    if (input.type.startsWith('int')) return '0';
    if (input.type.startsWith('uint')) return '0';
    return null;
  };
  const isArray = useMemo(() => !!input?.type?.endsWith('[]'), [input]);
  const [dataArray, setDataArray] = useState<{ id: number; val: any | null }[]>(
    [{ id: Date.now(), val: getDefaultValue() }]
  );

  // const getValue = (index: number) => (isArray ? dataArray[index] : input);

  const add = () => {
    setDataArray([...dataArray, { id: Date.now(), val: getDefaultValue() }]);
  };

  const remove = (index: number) => {
    setDataArray(dataArray.splice(index, 1));
  };

  useEffect(() => {
    valueUpdated(dataArray.map((item) => item.val));
  }, [dataArray]);

  const handleUpdate = (index: number | null, value: any) => {
    if (isArray) {
      const updatedArray = [...dataArray];
      updatedArray[index as number].val = value;
      setDataArray(updatedArray);
    } else {
      valueUpdated(value);
    }
  };

  const getInputComponent = (_handleUpdate: (value: any) => void) => {
    switch (true) {
      case input.type.startsWith('bool'):
        return <BoolInput handleUpdate={_handleUpdate} />;
      case input.type.startsWith('address'):
        return <AddressInput handleUpdate={_handleUpdate} />;
      case input.type.startsWith('int') || input.type.startsWith('uint'):
        return <NumberInput handleUpdate={_handleUpdate} />;
      default:
        return (
          <DefaultInput handleUpdate={_handleUpdate} inputType={input.type} />
        );
    }
  };

  let c;

  if (!isArray) {
    c = (
      <Flex direction="row" align="center">
        <Flex flex="1">
          {getInputComponent((value: any) => handleUpdate(null, value))}
        </Flex>
      </Flex>
    );
  } else {
    c = (
      <>
        <Box>
          {dataArray.map((inp, index) => {
            return (
              <Flex flex="1" alignItems="center" mb="4" key={inp.id}>
                {getInputComponent((value: any) => handleUpdate(index, value))}
                {dataArray.length > 1 && (
                  <Box onClick={() => remove(index)} ml="4">
                    <CloseIcon name="close" color="red.500" />{' '}
                  </Box>
                )}
              </Flex>
            );
          })}
        </Box>

        <Link onClick={add} float="right">
          <AddIcon name="add" color="green.500" />
        </Link>
      </>
    );
  }

  return <Box>{c}</Box>;
};
