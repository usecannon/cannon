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

  const hasresultItems = (
    item: AbiParameter
  ): item is AbiParameter & { resultItems: readonly AbiParameter[] } => {
    return 'resultItems' in item && isArray(item.resultItems);
  };

  const ItemLabel: FC<{ name: string; type: string }> = ({ name, type }) => (
    <Box alignItems={'center'} gap={1} fontSize="sm" mb={0}>
      <Text pr={1} fontWeight="bold" as="span">
        {name}
      </Text>
      <Text as="span" fontSize="xs" color="whiteAlpha.700">
        {type}
      </Text>
    </Box>
  );

  const renderOutput = (item: AbiParameter, value: { [key: string]: any }) => {
    if (item.type === 'tuple' && hasresultItems(item) && value) {
      return (
        <Box pl="4">
          {Object.values(value).map(
            (resultItem: any, resIdx: number) => {
              return (
                <FunctionOutput
                  output={item.resultItems[resIdx]}
                  result={resultItem}
                  key={resIdx}
                />
              );
            }
          )}
        </Box>
      );
    } else if (item.type === 'tuple[]' && hasresultItems(item) && value) {
      return isArray(value)
        ? value.map((tupleItem, tupleIndex) => (
          <Box key={tupleIndex} pl="4">
            {item.resultItems.map(
              (resultItem: AbiParameter, compIdx: number) => (
                <FunctionOutput
                  key={compIdx}
                  output={resultItem}
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
          <Text pt="1" pb="2" fontSize="xs" color="whiteAlpha.900">
            {String(outputValue)}
          </Text>
        );
      } else if (isArray(value)) {
        return value.map((val, idx) => (
          <Text fontSize="xs" display="inline" key={idx}>
            {String(val)}
          </Text>
        ));
      } else {
        // FALLBACK
        return (
          <Text pt="1" pb="2" fontSize="xs" color="whiteAlpha.900">
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
