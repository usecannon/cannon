import * as viem from 'viem';
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
import { parseAbiParameter } from '@/components/AbiParameterPreview/utils';
import { ReactNode } from 'react';
import { ExternalLinkButton } from '@/components/ExternalLinkButton';
import { useCannonChains } from '@/providers/CannonProvidersProvider';

function EncodedValueInput({ value }: { value: string }) {
  return (
    <Input
      type="text"
      className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40 font-mono"
      readOnly
      value={value}
      data-testid="encode-value-input"
    />
  );
}

function TooltipWrapper({
  children,
  tooltipText,
}: {
  children: ReactNode;
  tooltipText: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="w-full">{children}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-mono">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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

          <div className="absolute right-0 top-1">
            {explorerUrl && <ExternalLinkButton href={explorerUrl} />}
            <ClipboardButton text={rawValue as string} />
          </div>
        </div>
      )}
    </div>
  );
}
