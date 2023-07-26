import { FC } from 'react';
import { Box, Text } from '@chakra-ui/react';
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
                <h4>
                  {item.name}
                  <Text fontSize="xs" color="whiteAlpha.700" display="inline">
                    {item.internalType}
                  </Text>
                </h4>
                {item.components && (
                  <div>
                    {item.type === 'tuple' && (
                      <div>
                        {result.map((component: any, componentIndex: any) => {
                          return (
                            <FunctionOutput
                              output={item.components[componentIndex]}
                              result={component}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {item.type === 'tuple[]' && (
                  <div>
                    {(arrayOutput.length > 1 ? result[index] : result).map(
                      (resultItem: any, resultItemIndex: number) => {
                        return (
                          <div key={resultItemIndex}>
                            <Box pl="1" pt="2" pb="2">
                              {resultItem.map(
                                (component: any, componentIndex: number) => {
                                  return (
                                    <div key={componentIndex}>
                                      <FunctionOutput
                                        output={item.components[componentIndex]}
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
                    )}
                  </div>
                )}
                {!item.components ||
                  (item.type !== 'tuple[]' && item.type !== 'tuple' && (
                    <div>{result}</div>
                  ))}
              </div>
            );
          })}
        </div>
      )}
      {objectOutput && (
        <div>
          {objectOutput.name}: {result}
          <Text fontSize="xs" color="whiteAlpha.700" display="inline">
            {objectOutput.internalType}
          </Text>
        </div>
      )}
    </div>
  );
};
