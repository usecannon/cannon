import { FC } from 'react';
import { Box, Text, Divider} from '@chakra-ui/react';
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
  const objectArrayOutput: AbiParameter[] | undefined = isArray(output)
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
                      </div>
                    )}
                  </div>
                )}
                {item.type === 'tuple[]' && (
                  <div>
                    {(arrayOutput.length > 1 ? result[index] : result).map(
                      (resultItem: any, resultItemIndex: number) => {
                        if (isObject(resultItem)) {
                          return (
                            <div key={resultItemIndex}>
                              <Box pl="1" pt="2" pb="2">
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
                              <Divider size='l' />
                            </div>
                          )
                        } else {
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
                      }
                    )}
                  </div>
                )}
                {(!item.components ||
                  (item.type !== 'tuple[]' && item.type !== 'tuple')) && (
                    <div>{String(result)}</div>
                  )}
              </div>
            );
          })}
        </div>
      )}
      {objectOutput && (
        <div>
          {objectOutput.name}: {JSON.stringify(result, (key, value) => {
            typeof value === 'bigint'
              ? String(value)
              : value
          }, 2)}
          <Text fontSize="xs" color="whiteAlpha.700" display="inline">
            {objectOutput.internalType}
          </Text>
          <Text pl="1" pt="1" pb="3" fontSize="xs" color="whiteAlpha.900">
            {String(result)}
          </Text>
        </div>
      )}
    </div>
  );
};
