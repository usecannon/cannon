import { FC } from 'react';
import { Box, Text, Divider, FormLabel } from '@chakra-ui/react';
import { AbiParameter } from 'abitype';

export const FunctionOutput: FC<{
  output: AbiParameter | readonly AbiParameter[];
  result: any;
}> = ({ output, result }) => {
  const isArray = (_value: any) => Array.isArray(_value);
  const isObject = (_value: any) =>
    _value && typeof _value === 'object' && _value.constructor === Object;

  const arrayOutput: AbiParameter[] | undefined = isArray(output)
    ? (output as AbiParameter[])
    : undefined;
  const objectOutput: AbiParameter | undefined = isObject(output)
    ? (output as AbiParameter)
    : undefined;

  return (
    <div>
      {arrayOutput && (
        <div>
          {arrayOutput.map((item: any, index: number) => {
            return (
              <div key={index}>
                <FormLabel fontSize="sm">
                  {item.name && <Text display="inline">{item.name}</Text>}
                  {item.internalType && (
                    <Text fontSize="xs" color="whiteAlpha.700" display="inline">
                      {' '}
                      {item.internalType}
                    </Text>
                  )}
                </FormLabel>

                {item.components && (
                  <div>
                    {item.type === 'tuple' && result && (
                      <Box pb="2">
                        {Object.values(result).map(
                          (component: any, componentIndex: any) => {
                            return (
                              <FunctionOutput
                                output={item.components[componentIndex]}
                                result={component}
                                key={componentIndex}
                              />
                            );
                          }
                        )}
                      </Box>
                    )}
                  </div>
                )}
                {item.type === 'tuple[]' && result?.length && (
                  <div>
                    {(arrayOutput.length > 1 ? result[index] : result).map(
                      (resultItem: any, resultItemIndex: number) => {
                        if (isObject(resultItem)) {
                          return (
                            <div key={resultItemIndex}>
                              <Box pb="2">
                                {Object.values(resultItem).map(
                                  (component: any, componentIndex: any) => {
                                    return (
                                      <FunctionOutput
                                        output={item.components[componentIndex]}
                                        result={component}
                                        key={componentIndex}
                                      />
                                    );
                                  }
                                )}
                              </Box>
                              <Divider />
                            </div>
                          );
                        } else {
                          return (
                            <div key={resultItemIndex}>
                              <Box pb="2">
                                {resultItem.map(
                                  (component: any, componentIndex: number) => {
                                    return (
                                      <div key={componentIndex}>
                                        <FunctionOutput
                                          output={
                                            item.components[componentIndex]
                                          }
                                          result={component}
                                        />
                                      </div>
                                    );
                                  }
                                )}
                              </Box>
                            </div>
                          );
                        }
                      }
                    )}
                  </div>
                )}
                {(!item.components ||
                  (item.type !== 'tuple[]' && item.type !== 'tuple')) &&
                  !isArray(result) && <Box pl="1">{String(result)}</Box>}
                {(!item.components ||
                  (item.type !== 'tuple[]' && item.type !== 'tuple')) &&
                  isArray(result) && <Box pl="1">{String(result[index])}</Box>}
              </div>
            );
          })}
        </div>
      )}
      {objectOutput && (
        <div>
          {objectOutput.name}:{' '}
          {JSON.stringify(
            result,
            (key, value) => {
              typeof value === 'bigint' ? String(value) : value;
            },
            2
          )}
          <Text pl="1" fontSize="xs" color="whiteAlpha.700" display="inline">
            {objectOutput.internalType}
          </Text>
          <Text pt="1" pb="3" fontSize="xs" color="whiteAlpha.900">
            {String(result)}
          </Text>
        </div>
      )}
    </div>
  );
};
