import { FC } from 'react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';
import { formatEther } from 'viem';
import ClipboardButton from '@/components/ClipboardButton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const isArrayOutput = (
  value: AbiParameter | readonly AbiParameter[]
): value is readonly AbiParameter[] => isArray(value);

const hasComponentsKey = (
  item: AbiParameter
): item is AbiParameter & { components: readonly AbiParameter[] } => {
  return 'components' in item && isArray(item.components);
};

const ItemLabel: FC<{ name: string; type: string }> = ({ name, type }) => (
  <div className="flex items-center gap-1 text-sm mb-0">
    {name?.length ? <span className="pr-1 font-semibold">{name}</span> : null}
    <span className="text-xs text-muted-foreground font-mono">{type}</span>
  </div>
);

const resultText = (
  name: string | undefined,
  type: string,
  value: any
): string => {
  if (typeof value !== 'object') {
    return String(value);
  } else if (value !== null && value !== undefined) {
    const resultItem = value.find(
      (item: any) => name !== undefined && name in item
    );
    const result: string =
      resultItem && name !== undefined ? String(resultItem[name]) : '';

    return result;
  }

  switch (type) {
    case 'string':
      return '(empty string)';
    case 'boolean':
    case 'bool':
      return '(false)';
    case 'uint256':
    case 'int256':
    case 'uint128':
    case 'int128':
      return '0';
    default:
      return '(no result)';
  }
};

export const FunctionOutput: FC<{
  abiParameters: AbiParameter | readonly AbiParameter[];
  methodResult: any;
}> = ({ abiParameters, methodResult }) => {
  const renderValue = (abiParameter: AbiParameter, value: any) => {
    return (
      <>
        <div
          className={cn(
            'flex items-center gap-2 justify-items-center py-2',
            'data-[tooltip-id]:float'
          )}
          data-tooltip-id={`${abiParameter.name}${abiParameter.type}`}
        >
          {(abiParameter.type.includes('int128') ||
            abiParameter.type.includes('int256')) &&
          value ? (
            <div className="flex gap-2 items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex gap-2 items-center">
                      <span className="text-sm">
                        {resultText(
                          abiParameter.name,
                          abiParameter.type,
                          value
                        )}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {`${formatEther(
                      BigInt(
                        resultText(abiParameter.name, abiParameter.type, value)
                      )
                    ).toString()} wei`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <ClipboardButton
                text={resultText(abiParameter.name, abiParameter.type, value)}
              />
            </div>
          ) : (
            <span className="text-sm">
              {resultText(abiParameter.name, abiParameter.type, value)}
              <ClipboardButton
                text={resultText(abiParameter.name, abiParameter.type, value)}
              />
            </span>
          )}
        </div>
      </>
    );
  };

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
        <div className="pl-4">
          {Object.values(abiParameter).map((component: any, resIdx: number) => {
            return (
              <FunctionOutput
                abiParameters={component}
                methodResult={value}
                key={resIdx}
              />
            );
          })}
        </div>
      );
    } else if (
      abiParameter.type === 'tuple[]' &&
      hasComponentsKey(abiParameter) &&
      value
    ) {
      return isArray(value)
        ? value.map((tupleItem, tupleIndex) => (
            <div key={tupleIndex} className="pl-4">
              <span className="text-xs text-muted-foreground font-mono">
                tuple[{tupleIndex}]
              </span>
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
            </div>
          ))
        : null;
    } else {
      if (isObject(value) && abiParameter.name && abiParameter.name in value) {
        const outputValue = value[abiParameter.name];
        return (
          <span className="block pt-1 pb-2 text-xs">
            {String(outputValue)}
            <ClipboardButton text={outputValue} />
          </span>
        );
      } else if (isArray(value)) {
        if (abiParameter.type === 'address[]') {
          return (
            <div>
              {value.map((val, idx) => (
                <span className="text-xs block mt-2" key={idx}>
                  {String(val)}
                  <ClipboardButton text={String(val)} />
                </span>
              ))}
            </div>
          );
        } else if (index !== undefined) {
          return renderValue(abiParameter, value);
        } else {
          return value.map((val, idx) => (
            <span className="text-sm block" key={idx}>
              {resultText(abiParameter.name, abiParameter.type, val)}
              <ClipboardButton
                text={resultText(abiParameter.name, abiParameter.type, val)}
              />
            </span>
          ));
        }
      } else {
        return renderValue(abiParameter, value);
      }
    }
  };

  return (
    <>
      {(abiParameters as Array<any>).length == 0 && methodResult === null && (
        <div className="flex flex-1 items-center h-full py-4">
          <span className="text-sm m-auto text-muted-foreground">
            This function doesn’t return any values.
          </span>
        </div>
      )}
      {isArrayOutput(abiParameters)
        ? abiParameters.map((abiParameter, index) => (
            <div className="overflow-x-scroll py-2" key={index}>
              <ItemLabel
                name={abiParameter.name || ''}
                type={abiParameter.internalType || ''}
              />
              {renderOutput(abiParameter, methodResult, index)}
            </div>
          ))
        : abiParameters.name !== undefined &&
          abiParameters.type !== undefined && (
            <div className="overflow-x-scroll py-2">
              <ItemLabel
                name={abiParameters.name || ''}
                type={abiParameters.internalType || ''}
              />
              {renderOutput(abiParameters, methodResult)}
            </div>
          )}
    </>
  );
};
