import { FC } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';
import { InfoOutlineIcon } from '@chakra-ui/icons';

export const FunctionOutput: FC<{
  output: AbiParameter | readonly AbiParameter[];
  result: any;
}> = ({ output, result }) => {
  const isArrayOutput = (
    value: AbiParameter | readonly AbiParameter[]
  ): value is readonly AbiParameter[] => isArray(value);

  const hasComponents = (
    item: AbiParameter
  ): item is AbiParameter & { components: readonly AbiParameter[] } => {
    return 'components' in item && isArray(item.components);
  };

  const ItemLabel: FC<{ name: string; type: string }> = ({ name, type }) => (
    <Box alignItems={'center'} gap={1} fontSize="sm" mb={0}>
      <Text>{name}</Text>
      <Text fontSize="xs" color="whiteAlpha.700">
        {type}
      </Text>
    </Box>
  );

  const renderOutput = (item: AbiParameter, value: { [key: string]: any }) => {
    // TUPLE
    if (item.type === 'tuple' && hasComponents(item) && value) {
      return (
        <Box pl="4">
          {Object.values(value).map((component: any, componentIndex: any) => {
            return (
              <FunctionOutput
                output={item.components[componentIndex]}
                result={component}
                key={componentIndex}
              />
            );
          })}
        </Box>
      );
      // ARRAY OF TUPLES
    } else if (item.type === 'tuple[]' && hasComponents(item) && value) {
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
      // === Rendering of Results  ===
      if (isObject(value) && item.name && item.name in value) {
        const outputValue = value[item.name];
        return (
          <Text pt="1" pb="2" fontSize="sm" color="whiteAlpha.900">
            {String(outputValue)}
          </Text>
        );
      } else if (isArray(value)) {
        return value.map((val, idx) => (
          <Text display="inline" key={idx}>
            {String(val)}
          </Text>
        ));
      } else {
        // FALLBACK
        return (
          <Text pt="1" pb="2" fontSize="sm" color="whiteAlpha.900">
            {result !== null || undefined ? String(result) : '---'}
          </Text>
        );
      }
    }
  };

  return (
    <>
      {(output as Array<any>).length == 0 && (
        <Flex flex="1">
          <Text fontSize="sm" m="auto" color="gray.500">
            <InfoOutlineIcon mt={-0.5} mr={0.5} /> This function does not return
            any values
          </Text>
        </Flex>
      )}
      {isArrayOutput(output) ? (
        output.map((item, index) => (
          <Box overflowX={'scroll'} p={2} key={index}>
            <ItemLabel name={item.name || ''} type={item.internalType || ''} />
            {renderOutput(item, result)}
          </Box>
        ))
      ) : (
        <Box overflowX={'scroll'} p={2}>
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
