import { FC } from 'react';
import { Box, Text, Tag, FormLabel, Flex } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';

export const FunctionOutput: FC<{
  output: AbiParameter | readonly AbiParameter[];
  result: any;
}> = ({ output, result }) => {
  // Helper function to check if a value is an array of AbiParameters
  const isArrayOutput = (
    value: AbiParameter | readonly AbiParameter[]
  ): value is readonly AbiParameter[] => isArray(value);

  // Renders the output based on the type and structure of the item
  const renderOutput = (item: AbiParameter, value: any) => {
    if (item.type === 'tuple' && item.components) {
      return (
        <Box pl="4">
          {item.components.map((component: AbiParameter, idx) => (
            <FunctionOutput
              key={idx}
              output={component}
              result={isArray(value) ? value[idx] : value}
            />
          ))}
        </Box>
      );
    } else if (item.type === 'tuple[]' && item.components) {
      return isArray(value)
        ? value.map((tupleItem, tupleIndex) => (
            <Box key={tupleIndex} pl="4">
              {item.components.map((component, compIdx) => (
                <FunctionOutput
                  key={compIdx}
                  output={component}
                  result={isArray(tupleItem) ? tupleItem[compIdx] : tupleItem}
                />
              ))}
            </Box>
          ))
        : null;
    } else {
      // Check if the value is an object and item.name is a valid key
      if (isObject(value) && item.name && item.name in value) {
        console.log('value ', value);
        return <Text>{String(value[item.name])}</Text>;
      } else if (isArray(value)) {
        // If the value is an array, render each element
        return value.map((val, idx) => <Text key={idx}>{String(val)}</Text>);
      } else {
        // For primitive types or other cases, just convert the value to a string
        return (
          <Text pt="1" pb="3" fontSize="xs" color="whiteAlpha.900">
            {result !== null ? String(result) : '---'}
          </Text>
        );
      }
    }
  }
  return (
    <>
      {isArrayOutput(output) ? (
        output.map((item, index) => (
          <Box p={2} key={index}>
            <Text>{item.name}</Text>
            <Tag colorScheme="teal" size={'sm'}>
              {item.type}
            </Tag>
            {renderOutput(item, result)}
          </Box>
        ))
      ) : (
          <Box p={2}>
          <Flex alignItems={'center'} gap={1} fontSize="sm" mb={0}>
            {output.name && <Text>{output.name}</Text>}
            {output.internalType && (
              <Text fontSize="xs" color="whiteAlpha.700">
                {output.internalType}
              </Text>
            )}
          </Flex>

          {renderOutput(output, result)}
        </Box>
      )}
    </>
  );
};
