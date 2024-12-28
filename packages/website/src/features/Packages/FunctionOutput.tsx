import { FC } from 'react';
import { AbiParameter } from 'abitype';
import { isArray, isObject } from 'lodash';
import { Info } from 'lucide-react';
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

const resultText = (type: string, result: any): string => {
  if (result !== null && result !== undefined) {
    return String(result);
  } else if (type === 'string') {
    return '(empty string)';
  } else if (type === 'boolean' || type === 'bool') {
    return '(false)';
  } else if (
    type === 'uint256' ||
    type === 'int256' ||
    type === 'uint128' ||
    type === 'int128'
  ) {
    return '0';
  } else {
    return '(no result)';
  }
};

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
        <div className="pl-4">
          {Object.values(value).map((component: any, resIdx: number) => {
            return (
              <FunctionOutput
                abiParameters={abiParameter.components[resIdx]}
                methodResult={component}
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
                <ClipboardButton
                  text={resultText(
                    abiParameter.type,
                    'tuple[' + tupleIndex + ']'
                  )}
                />
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
            {resultText(abiParameter.type, outputValue)}
            <ClipboardButton
              text={resultText(abiParameter.type, outputValue)}
            />
          </span>
        );
      } else if (isArray(value)) {
        if (abiParameter.type === 'address[]') {
          return (
            <div>
              {value.map((val, idx) => (
                <span className="text-xs block" key={idx}>
                  {resultText(abiParameter.type, val)}
                  <ClipboardButton text={resultText(abiParameter.type, val)} />
                </span>
              ))}
            </div>
          );
        } else if (index !== undefined) {
          return (
            <span className="text-xs block">
              {String(value[index]) === undefined
                ? resultText(abiParameter.type, value[index])
                : '[]'}
            </span>
          );
        } else {
          return value.map((val, idx) => (
            <span className="text-xs block" key={idx}>
              {resultText(abiParameter.type, val)}
              <ClipboardButton text={resultText(abiParameter.type, val)} />
            </span>
          ));
        }
      } else {
        return (
          <div
            className={cn(
              'flex items-center gap-2 justify-items-center py-2',
              'data-[tooltip-id]:float'
            )}
            data-tooltip-id={`${abiParameter.name}${abiParameter.type}`}
          >
            {(abiParameter.type.includes('int128') ||
              abiParameter.type.includes('int256')) &&
            methodResult ? (
              <div className="flex gap-2 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm">
                          {resultText(abiParameter.type, methodResult)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {`${formatEther(methodResult).toString()} wei`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ClipboardButton
                  text={resultText(abiParameter.type, methodResult)}
                />
              </div>
            ) : (
              <span className="text-sm">
                {resultText(abiParameter.type, methodResult)}
                <ClipboardButton
                  text={resultText(abiParameter.type, methodResult)}
                />
              </span>
            )}
          </div>
        );
      }
    }
  };

  return (
    <>
      {(abiParameters as Array<any>).length == 0 && (
        <div className="flex flex-1 items-center h-full py-4">
          <span className="text-sm m-auto text-muted-foreground">
            <Info className="inline-block -mt-0.5 mr-0.5 h-4 w-4" /> This
            function does not return any values
          </span>
        </div>
      )}
      {isArrayOutput(abiParameters) ? (
        abiParameters.map((abiParameter, index) => (
          <div className="overflow-x-scroll py-2" key={index}>
            <ItemLabel
              name={abiParameter.name || ''}
              type={abiParameter.internalType || ''}
            />
            {renderOutput(abiParameter, methodResult, index)}
          </div>
        ))
      ) : (
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
