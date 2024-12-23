import { FC } from 'react';
import { Box, Text, Flex } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { Tooltip } from '@chakra-ui/react';
import { formatEther } from 'viem';

const isArrayOutput = (
  value: AbiParameter | readonly AbiParameter[]
): value is readonly AbiParameter[] => isArray(value);

const hasComponentsKey = (
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

export const FunctionOutput: FC<{
  abiParameters: AbiParameter | readonly AbiParameter[];
  methodResult: any;
}> = ({ abiParameters, methodResult }) => {
  const renderOutput = (
    abiParameter: AbiParameter,
    value: { [key: string]: any },
    index?: number
  ) => {
    if (
      abiParameter.type === 'tuple' &&
      hasComponentsKey(abiParameter) &&
      value
    ) {
      return (
        <Box pl="4">
          {Object.values(value).map((component: any, resIdx: number) => {
            return (
              <FunctionOutput
                abiParameters={abiParameter.components[resIdx]}
                methodResult={component}
                key={resIdx}
              />
            );
          })}
        </Box>
      );
    } else if (
      abiParameter.type === 'tuple[]' &&
      hasComponentsKey(abiParameter) &&
      value
    ) {
      return isArray(value)
        ? value.map((tupleItem, tupleIndex) => (
            <Box key={tupleIndex} pl="4">
              <Text as="span" fontSize="xs" color="whiteAlpha.700">
                tuple[{tupleIndex}]
              </Text>
              {abiParameter.components.map(
                (component: AbiParameter, compIdx: number) => (
                  <FunctionOutput
                    key={compIdx}
                    abiParameters={component}
                    methodResult={
                      isArray(tupleItem) ? tupleItem[compIdx] : tupleItem
                    }
                  />
                )
              )}
            </Box>
          ))
        : null;
    } else {
      if (isObject(value) && abiParameter.name && abiParameter.name in value) {
        const outputValue = value[abiParameter.name];
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
        if (abiParameter.type === 'address[]') {
          return (
            <Box>
              {value.map((val, idx) => (
                <Text fontSize="xs" display="block" key={idx}>
                  {String(val)}
                </Text>
              ))}
            </Box>
          );
        } else if (index !== undefined) {
          return (
            <Text fontSize="xs" display="block">
              {String(value[index])}
            </Text>
          );
        } else {
          return value.map((val, idx) => (
            <Text fontSize="xs" display="block" key={idx}>
              {String(val)}
            </Text>
          ));
        }
      } else {
        return (
          <Flex
            alignItems="center"
            gap={2}
            justifyItems="center"
            py={2}
            data-tooltip-id={`${abiParameter.name}${abiParameter.type}`}
            data-tooltip-float
          >
            {(abiParameter.type.includes('int128') ||
              abiParameter.type.includes('int256')) &&
            methodResult ? (
              <>
                <Tooltip
                  label={`${formatEther(methodResult).toString()} wei`}
                  aria-label="Decimal Representation"
                >
                  <Flex gap={2} alignItems="center">
                    <Text
                      fontSize="xs"
                      color="whiteAlpha.900"
                      verticalAlign="center"
                    >
                      {String(methodResult)}
                    </Text>
                  </Flex>
                </Tooltip>
              </>
            ) : (
              <Text fontSize="xs" color="whiteAlpha.900" verticalAlign="center">
                {methodResult !== null || undefined
                  ? String(methodResult)
                  : '(no result)'}
              </Text>
            )}
          </Flex>
        );
      }
    }
  };

  return (
    <>
      {(abiParameters as Array<any>).length == 0 && (
        <Flex flex="1">
          <Text fontSize="sm" m="auto" color="gray.500">
            <InfoOutlineIcon mt={-0.5} mr={0.5} /> This function does not return
            any values
          </Text>
        </Flex>
      )}
      {isArrayOutput(abiParameters) ? (
        abiParameters.map((abiParameter, index) => (
          <Box overflowX={'scroll'} p={2} key={index}>
            <ItemLabel
              name={abiParameter.name || ''}
              type={abiParameter.internalType || ''}
            />
            {renderOutput(abiParameter, methodResult, index)}
          </Box>
        ))
      ) : (
        <Box overflowX={'scroll'} p={2}>
          <ItemLabel
            name={abiParameters.name || ''}
            type={abiParameters.internalType || ''}
          />
          {renderOutput(abiParameters, methodResult)}
        </Box>
      )}
    </>
  );
};
