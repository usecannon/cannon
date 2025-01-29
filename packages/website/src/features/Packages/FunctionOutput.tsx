import { FC } from 'react';
import { AbiParameter } from 'abitype';
import { isObject, isNil, isPlainObject } from 'lodash';
import * as viem from 'viem';
import ClipboardButton from '@/components/ClipboardButton';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function _isArrayAbiParameter(
  value: AbiParameter | readonly AbiParameter[]
): value is readonly AbiParameter[] {
  return Array.isArray(value);
}

function _isNumberString(value: string): boolean {
  try {
    BigInt(value);
    return true;
  } catch (_) {
    return false;
  }
}

function _hasComponentsKey(
  item: AbiParameter
): item is AbiParameter & { components: readonly AbiParameter[] } {
  return (
    isObject(item) && 'components' in item && Array.isArray(item.components)
  );
}

const ItemLabel: FC<{ name: string; type: string }> = ({ name, type }) => (
  <div className="flex items-center gap-1 text-sm mb-0">
    {name?.length ? <span className="pr-1 font-semibold">{name}</span> : null}
    <span className="text-xs text-muted-foreground font-mono">{type}</span>
  </div>
);

function _isNumberType(type: string): boolean {
  if (typeof type !== 'string') {
    debugger;
    throw new Error(`Invalid type given to assert "${type}"`);
  }
  return (
    type.startsWith('uint') ||
    type.startsWith('int') ||
    type.startsWith('fixed') ||
    type.startsWith('ufixed')
  );
}

function _renderEmptyValue(type: string): string {
  if (_isNumberType(type)) {
    return '0';
  } else if (type.startsWith('bool')) {
    return 'false';
  } else if (type === 'address' || type === 'function') {
    return viem.zeroAddress.toString();
  } else if (type.startsWith('bytes')) {
    return '0x';
  } else if (type.startsWith('string')) {
    return '""';
  } else {
    return '(could not render result)';
  }
}

function _renderResultText(
  name: AbiParameter['name'],
  type: AbiParameter['type'],
  value: any
): string {
  if (isNil(value)) {
    return _renderEmptyValue(type);
  } else if (Array.isArray(value)) {
    const resultItem = value.find(
      (item: any) => name !== undefined && name in item
    );

    const result =
      resultItem && name !== undefined ? String(resultItem[name]) : '';

    return result;
  } else if (isPlainObject(value)) {
    return JSON.stringify(value);
  } else {
    return String(value);
  }
}

function _renderValue(abiParameter: AbiParameter, value: any) {
  const result = _renderResultText(abiParameter.name, abiParameter.type, value);

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-2 justify-items-center py-2',
          'data-[tooltip-id]:float'
        )}
        data-tooltip-id={`${abiParameter.name}${abiParameter.type}`}
      >
        {_isNumberType(abiParameter.type) && _isNumberString(result) ? (
          <div className="flex gap-2 items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm">{result}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {`${viem
                    .formatEther(
                      BigInt(
                        _renderResultText(
                          abiParameter.name,
                          abiParameter.type,
                          value
                        )
                      )
                    )
                    .toString()} wei`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ClipboardButton
              text={_renderResultText(
                abiParameter.name,
                abiParameter.type,
                value
              )}
            />
          </div>
        ) : (
          <span className="text-sm">
            {result}
            <ClipboardButton text={result} />
          </span>
        )}
      </div>
    </>
  );
}

function _renderOutput(
  abiParameter: AbiParameter,
  value: { [key: string]: any },
  indent = 0
) {
  const isTuple = abiParameter.type === 'tuple';
  const isTupleArray = abiParameter.type === 'tuple[]';
  const isAddressArray = abiParameter.type === 'address[]';

  const hasComponents = _hasComponentsKey(abiParameter);
  const isValidValue = Boolean(value);

  const isNamedParameter =
    isObject(value) && abiParameter.name && abiParameter.name in value;

  if (isTuple && hasComponents && isValidValue) {
    debugger;
    return (
      <div className={`pl-${4 * (indent + 1)}`}>
        {Object.values(abiParameter).map((component: any, resIdx: number) => {
          return (
            <FunctionOutput
              abiParameters={component}
              methodResult={value}
              indent={indent + 1}
              key={resIdx}
            />
          );
        })}
      </div>
    );
  } else if (isTupleArray && hasComponents && isValidValue) {
    return Array.isArray(value)
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
                    Array.isArray(tupleItem) ? tupleItem[compIdx] : tupleItem
                  }
                  indent={indent + 1}
                />
              )
            )}
          </div>
        ))
      : null;
  } else {
    if (isNamedParameter && abiParameter.name) {
      const outputValue = value[abiParameter.name];
      return (
        <span className="block pt-1 pb-2 text-xs">
          {String(outputValue)}
          <ClipboardButton text={outputValue} />
        </span>
      );
    } else if (Array.isArray(value)) {
      if (isAddressArray) {
        return (
          <div>
            {value.map((val, idx) => (
              <span className="text-xs block mt-2" key={idx}>
                {val}
                <ClipboardButton text={val} />
              </span>
            ))}
          </div>
        );
      } else {
        return value.map((val, idx) => (
          <span className="text-sm block" key={idx}>
            {_renderResultText(abiParameter.name, abiParameter.type, val)}
            <ClipboardButton
              text={_renderResultText(
                abiParameter.name,
                abiParameter.type,
                val
              )}
            />
          </span>
        ));
      }
    } else {
      return _renderValue(abiParameter, value);
    }
  }
}

export const FunctionOutput: FC<{
  abiParameters: AbiParameter | readonly AbiParameter[];
  methodResult: any;
  indent?: number;
}> = ({ abiParameters, methodResult, indent = 0 }) => {
  if (isNil(abiParameters)) return null;

  if (_isArrayAbiParameter(abiParameters)) {
    if (abiParameters.length === 0) {
      return (
        <div className="flex flex-1 items-center h-full py-4">
          <span className="text-sm m-auto text-muted-foreground">
            This function doesn&apos;t return any values.
          </span>
        </div>
      );
    } else {
      return abiParameters.map((abiParameter, index) => (
        <FunctionOutput
          abiParameters={abiParameter}
          methodResult={methodResult?.[index]}
          indent={indent + 1}
          key={index}
        />
      ));
    }
  }

  return (
    <div className="overflow-x-scroll py-2">
      <ItemLabel
        name={abiParameters.name || ''}
        type={abiParameters.internalType || ''}
      />
      {_renderOutput(abiParameters, methodResult, indent)}
    </div>
  );
};
