import { FC } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
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

  const ItemLabel: FC<{ name: string; type: string }> = ({ name, type }) => (
    <Flex alignItems={'center'} gap={1} fontSize="sm" mb={0}>
      <Text>{name}</Text>
      <Text fontSize="xs" color="whiteAlpha.700">
        {type}
      </Text>
    </Flex>
  );

  const renderOutput = (item: AbiParameter, value: any) => {
    // TUPLE
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
      // ARRAY OF TUPLES
    } else if (item.type === 'tuple[]' && item.components) {
      return isArray(value)
        ? value.map((tupleItem, tupleIndex) => (
            <Box key={tupleIndex} pl="4">
              {item.components.map(
                (component: AbiParameter, compIdx: number) => (
                  <FunctionOutput
                    key={compIdx}
                    output={component}
                    result={isArray(tupleItem) ? tupleItem[compIdx] : tupleItem}
                  />
                )
              )}
            </Box>
          ))
        : null;
    } else {
      // OBJECTS
      if (isObject(value) && item.name && item.name in value) {
        return (
          <Text pt="1" pb="3" fontSize="sm" color="whiteAlpha.900">
            {String(value[item.name])}
          </Text>
        );
      } else if (isArray(value)) {
        // ARRAYS
        return value.map((val, idx) => <Text key={idx}>{String(val)}</Text>);
      } else {
        // FALLBACK
        return (
          <Text pt="1" pb="3" fontSize="sm" color="whiteAlpha.900">
            {result !== null || undefined ? String(result) : '---'}
          </Text>
        );
      }
    }
  };

  return (
    <>
      {isArrayOutput(output) ? (
        output.map((item, index) => (
          <Box p={2} key={index}>
            <ItemLabel name={item.name || ''} type={item.internalType || ''} />
            {renderOutput(item, result)}
          </Box>
        ))
      ) : (
        <Box p={2}>
          <ItemLabel
            name={output.name || ''}
            type={output.internalType || ''}
          />
          {renderOutput(output, result)}
        </Box>
      )}
    </>
  );
};
