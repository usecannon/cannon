import * as viem from 'viem';
import { isNil, isObject } from 'lodash';
import { Snippet } from '@/components/snippet';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCannonChains } from '@/providers/CannonProvidersProvider';
import { ExternalLinkButton } from './ExternalLinkButton';

interface Props {
  chainId: number;
  abiParameter: viem.AbiParameter;
  value?: unknown;
}

export function AbiParameterPreview({ chainId, abiParameter, value }: Props) {
  const { type, name } = abiParameter;
  const val = isNil(value) ? _renderEmptyValue(abiParameter) : value;
  const tooltipText = _encodeArgTooltip(type, val);
  const { getExplorerUrl } = useCannonChains();
  const explorerUrl =
    type === 'address' ? getExplorerUrl(chainId, val) : undefined;

  return (
    <div>
      <Label>
        {name && <span>{name}</span>}
        {type && (
          <span className="text-xs text-muted-foreground font-mono">
            {' '}
            {type}
          </span>
        )}
      </Label>
      {type.endsWith('[]') || type === 'tuple' ? (
        <Snippet>
          <code>{_encodeArg(type, val)}</code>
        </Snippet>
      ) : (
        <div className="group relative">
          {tooltipText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="text"
                    className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40 font-mono"
                    readOnly
                    value={_encodeArg(type, val)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-mono">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!tooltipText && (
            <Input
              type="text"
              className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40 font-mono"
              readOnly
              value={_encodeArg(type, val)}
            />
          )}
          <div className="absolute flex gap-1 right-0 top-0 p-1">
            {explorerUrl && <ExternalLinkButton href={explorerUrl} />}
            <ClipboardButton text={val} />
          </div>
        </div>
      )}
    </div>
  );
}

function _hasComponentsKey(
  item: viem.AbiParameter
): item is viem.AbiParameter & { components: readonly viem.AbiParameter[] } {
  return (
    isObject(item) && 'components' in item && Array.isArray(item.components)
  );
}

function _isNumberType(type: string): boolean {
  if (typeof type !== 'string') {
    throw new Error(`Invalid type given to assert "${type}"`);
  }

  if (type.endsWith('[]')) {
    return false;
  }

  return (
    type.startsWith('uint') ||
    type.startsWith('int') ||
    type.startsWith('fixed') ||
    type.startsWith('ufixed')
  );
}

function _renderEmptyValue(abiParameter: viem.AbiParameter): any {
  const { type } = abiParameter;

  if (type.endsWith('[]')) {
    return [];
  } else if (_isNumberType(type)) {
    return '0';
  } else if (type.startsWith('bool')) {
    return false;
  } else if (type === 'address' || type === 'function') {
    return viem.zeroAddress.toString();
  } else if (type === 'bytes') {
    return '0x';
  } else if (type.startsWith('bytes')) {
    const size = Number(type.slice(5)) * 2 || 0;
    const bytes = Array.from({ length: size }, () => '0');
    return `0x${bytes.join('')}`;
  } else if (type.startsWith('string')) {
    return '';
  } else if (type === 'tuple') {
    const result: { [key: string]: unknown } = {};

    if (_hasComponentsKey(abiParameter)) {
      for (const component of abiParameter.components) {
        if (typeof component.name === 'string' && component.name) {
          result[component.name] = _renderEmptyValue(component);
        }
      }
    }

    return result;
  } else {
    return '(no result)';
  }
}

function _encodeArg(type: string, val: string): string {
  if (type.endsWith('[]')) {
    const values = Array.isArray(val) ? val : [val];
    const results = values.map((v) => _encodeArg(type.slice(0, -2), v));

    const isTuple = type.startsWith('tuple');
    return JSON.stringify(
      results.map((v) => (isTuple ? JSON.parse(v) : v)),
      (_, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
  }

  if (type.startsWith('bytes') && val.startsWith('0x')) {
    try {
      const b = viem.hexToBytes(val as viem.Hex);
      const t = b.findIndex((v) => v < 0x20);
      if (b[t] != 0 || b.slice(t).find((v) => v != 0) || t === 0) {
        // this doesn't look like a terminated ascii hex string. leave it as hex
        return val;
      }

      return viem.bytesToString(viem.trim(b, { dir: 'right' }));
    } catch (err) {
      return val.toString();
    }
  } else if (type == 'tuple') {
    // TODO: use a lib?
    return JSON.stringify(
      val,
      (_, v) => (typeof v === 'bigint' ? v.toString() : v),
      2
    );
  } else if (type == 'bool') {
    return val ? 'true' : 'false';
  } else if (type.startsWith('uint') || type.startsWith('int')) {
    return val ? BigInt(val).toString() : '0';
  }

  return val.toString();
}

function _encodeArgTooltip(type: string, val: string): string {
  if (Array.isArray(val)) {
    if (!type.endsWith('[]')) {
      throw Error(`Invalid arg type "${type}" and val "${val}"`);
    }

    const arrayTooltip = `["${val
      .map((v) => _encodeArgTooltip(type.slice(0, -2), v))
      .join('", "')}"]`;
    return arrayTooltip === _encodeArg(type, val) ? '' : arrayTooltip;
  }

  if (type.startsWith('bytes') && val.startsWith('0x')) {
    const bytesTooltip = val.toString();
    return bytesTooltip === _encodeArg(type, val) ? '' : bytesTooltip;
  } else if (type == 'tuple') {
    const tupleTooltip = JSON.stringify(val, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    return tupleTooltip === _encodeArg(type, val) ? '' : tupleTooltip;
  } else if (type == 'bool') {
    const boolTooltip = val ? 'true' : 'false';
    return boolTooltip === _encodeArg(type, val) ? '' : boolTooltip;
  } else if (['int256', 'uint256', 'int128', 'uint128'].includes(type)) {
    if (!val) return '';
    const etherValue = `${viem.formatEther(
      BigInt(val)
    )} assuming 18 decimal places`;
    return etherValue === _encodeArg(type, val) ? '' : etherValue;
  }

  return '';
}
