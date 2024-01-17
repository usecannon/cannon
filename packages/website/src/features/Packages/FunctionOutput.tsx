import { FC, ReactNode } from 'react';
import { Box, Text, Code, Heading, Stack, Flex } from '@chakra-ui/react';
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

  const renderOutput = (item: AbiParameter, value: any): ReactNode => {
    // Tuples
    if (
      item.type === 'tuple' &&
      'components' in item &&
      isArray(item.components)
    ) {
      return (
        <>
          {item.components.map((component, idx) => {
            const componentValue = isArray(value) ? value[idx] : value;
            return (
              <FunctionOutput
                key={idx}
                output={component}
                result={componentValue}
              />
            );
          })}
        </>
      );
      // Array of Tuples
    } else if (
      item.type === 'tuple[]' &&
      item.type.endsWith('[]') &&
      'components' in item &&
      isArray(item.components)
    ) {
      return isArray(value)
        ? value.map((tupleItem: AbiParameter, idx) => (
          <Box key={idx} pl="4">
            {item.components.map((component, compIdx) => {
              const componentValue = isArray(tupleItem)
                ? tupleItem[compIdx]
                : tupleItem;
              return (
                <FunctionOutput
                  key={`${idx}-${compIdx}`}
                  output={component}
                  result={componentValue}
                />
              );
            })}
          </Box>
        ))
        : null;
      //Arrays
    } else if (item.type.endsWith('[]')) {
      return isArray(value) ? (
        value.map((val: any, idx: number) => (
          <Text key={idx}>{String(val)}</Text>
        ))
      ) : (
        <Text>{String(value)}</Text>
      );
      // Other types and Objects
    } else {
      return <Text>{String(value)}</Text>;
    }
  };

  return (
    <>
      <Stack>
        {isArrayOutput(output) ? (
          output.map((item, index) => (
            <Box key={index} pl={2} pt={0}>
              <Flex gap={1} alignItems={'center'}>
                {item.name && (
                  <Heading
                    size="xs"
                    fontWeight={400}
                    letterSpacing={'1px'}
                    color="gray.300"
                  >
                    {item.name}
                  </Heading>
                )}

                <Text size={'xs'} color={'gray'}>
                  {item.type}
                </Text>
              </Flex>
              {renderOutput(item, result)}
            </Box>
          ))
        ) : (
          <Box ml={4}>
            <Heading size="sm">{output.name || ''}</Heading>
            <Code size={'xs'} color={'gray'}>
              {output.type}
            </Code>
            {renderOutput(output, result)}
          </Box>
        )}
      </Stack>
    </>
  );
};
