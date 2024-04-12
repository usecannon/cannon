import { FC } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { HiCalculator } from 'react-icons/hi';
import { Tooltip } from '@chakra-ui/react';
import { formatEther } from 'viem';

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
      {name?.length ? (
        <Text pr={1} fontWeight="semibold" as="span">
          {name}
        </Text>
      ) : (
        ''
      )}
      <Text as="span" fontSize="xs" color="whiteAlpha.700">
        {type}
      </Text>
    </Box>
  );

  const renderOutput = (item: AbiParameter, value: { [key: string]: any }) => {
    if (item.type === 'tuple' && hasComponents(item) && value) {
      return (
        <Box pl="4">
          {Object.values(value).map((component: any, resIdx: number) => {
            return (
              <FunctionOutput
                output={item.components[resIdx]}
                result={component}
                key={resIdx}
              />
            );
          })}
        </Box>
      );
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
      if (isObject(value) && item.name && item.name in value) {
        const outputValue = value[item.name];
        return (
          <Text
            display="block"
            pt="1"
            pb="2"
            fontSize="xs"
            color="whiteAlpha.900"
          >
            {String(outputValue)}
          </Text>
        );
      } else if (isArray(value)) {
        return value.map((val, idx) => (
          <Text fontSize="xs" display="block" key={idx}>
            {String(val)}
          </Text>
        ));
      } else {
        return (
          <Flex
            alignItems="center"
            gap={2}
            justifyItems="center"
            py={2}
            data-tooltip-id={`${item.name}${item.type}`}
            data-tooltip-float
          >
            {(item.type.includes('int128') || item.type.includes('int256')) &&
            result ? (
              <>
                <Tooltip
                  label={formatEther(result).toString()}
                  aria-label="Decimal Representation"
                >
                  <Flex gap={2} alignItems="center">
                    <Text
                      fontSize="xs"
                      color="whiteAlpha.900"
                      verticalAlign="center"
                    >
                      {result !== null || undefined ? String(result) : '---'}
                    </Text>
                    <HiCalculator color="#0092b4" size={18} />
                  </Flex>
                </Tooltip>
              </>
            ) : (
              <Text fontSize="xs" color="whiteAlpha.900" verticalAlign="center">
                {result !== null || undefined ? String(result) : '---'}
              </Text>
            )}
          </Flex>
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
