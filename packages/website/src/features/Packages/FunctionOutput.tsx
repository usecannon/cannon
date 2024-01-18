import { FC } from 'react';
import { Box, Text, Tag } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';

export const FunctionOutput: FC<{
  output: AbiParameter | readonly AbiParameter[];
  result: any;
}> = ({ output, result }) => {
  const isArray = (value: any) => Array.isArray(value);

  const isArrayOutput = (
    value: AbiParameter | readonly AbiParameter[]
  ): value is readonly AbiParameter[] => {
    return Array.isArray(value);
  };

  const isObject = (_value: any) =>
    _value && typeof _value === 'object' && _value.constructor === Object;


  const renderOutput = (item: AbiParameter, value: any) => {
    if (item.type === 'tuple' && item.components) {
      return (
        <Box pl="4">
          {item.components.map((component: AbiParameter, idx) => (
            <FunctionOutput
              key={idx}
              output={[component]}
              result={isArray(value) ? value[idx] : value}
            />
          ))}
        </Box>
      );
    } else if (item.type === 'tuple[]' && item.components) {
      return isArray(value)
        ? value.map((tupleItem: AbiParameter, tupleIndex) => (
          <Box key={tupleIndex} pl="4">
            {item.components.map(
              (component: AbiParameter, compIdx: number) => (
                <FunctionOutput
                  key={compIdx}
                  output={[component]}
                  result={tupleItem[compIdx]}
                />
              )
            )}
          </Box>
        ))
        : null;
    } else if (isObject(value) && !Array.isArray(value)) {
      // New handling for objects
      return (
        <Box pl="4">
          {Object.keys(value).map((key, idx) => (
            <Text key={idx}>
              {key}: {String(value[key])}
            </Text>
          ))}
        </Box>
      );
    } else if (item.type !== 'tuple[]' && item.type !== 'tuple[]') {
      return <Text>{String(value)}</Text>;
    }
  };

  return (
    <>
      {isArrayOutput(output) ? (
        output.map((item, index) => (
          <div key={index}>
            <Text> {item.name}</Text>
            <Tag colorScheme="teal" size={'sm'}>
              {item.type}
            </Tag>
            {renderOutput(item, result)}
          </div>
        ))
      ) : (
        <div>
          <Text> {output.name}</Text>
          <Tag colorScheme="teal" size={'sm'}>
            {output.type}
          </Tag>
          {renderOutput(output, result)}
        </div>
      )}
    </>
  );
};
