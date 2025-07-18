import * as viem from 'viem';
import { Snippet } from '@/components/snippet';
import { ClipboardButton } from '@/components/ClipboardButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { parseAbiParameter } from '@/components/AbiParameterPreview/utils';
import { ReactNode, forwardRef } from 'react';
import { ExternalLinkButton } from '@/components/ExternalLinkButton';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

const EncodedValueInput = forwardRef<HTMLInputElement, { value: string }>(
  ({ value }, ref) => {
    return (
      <Input
        ref={ref}
        type="text"
        className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40 font-mono"
        readOnly
        value={value}
        data-testid="encode-value-input"
      />
    );
  }
);

EncodedValueInput.displayName = 'EncodedValueInput';

function TooltipWrapper({
  children,
  tooltipText,
}: {
  children: ReactNode;
  tooltipText: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild className="w-full">
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs font-mono">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function AbiParameterPreview({
  chainId,
  abiParameter,
  value,
}: {
  chainId: number;
  abiParameter: viem.AbiParameter;
  value?: unknown;
}) {
  const { type, name } = abiParameter;
  const { rawValue, tooltipText, isTupleArray, isTuple, parsedValue } =
    parseAbiParameter(abiParameter, value);

  const { getExplorerUrl } = useCannonChains();
  const explorerUrl =
    type === 'address'
      ? getExplorerUrl(chainId, rawValue as viem.Address)
      : undefined;

  return (
    <div>
      <Label>
        {name && <span>{name}</span>}
        {type && (
          <span
            className="text-xs text-muted-foreground font-mono"
            data-testid="type-label"
          >
            {' '}
            {type}
          </span>
        )}
      </Label>

      {isTuple || isTupleArray ? (
        <Snippet>
          <code>{parsedValue}</code>
        </Snippet>
      ) : (
        <div className="group relative">
          {tooltipText ? (
            <TooltipWrapper tooltipText={tooltipText}>
              <EncodedValueInput value={parsedValue} />
            </TooltipWrapper>
          ) : (
            <EncodedValueInput value={parsedValue} />
          )}

          <div className="absolute right-2 top-1 space-x-1">
            {explorerUrl && <ExternalLinkButton href={explorerUrl} />}
            <ClipboardButton text={rawValue as string} />
          </div>
        </div>
      )}
    </div>
  );
}
