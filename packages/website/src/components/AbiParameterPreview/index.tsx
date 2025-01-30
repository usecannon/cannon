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

function EncodedValueInput({ value }: { value: string }) {
  return (
    <Input
      type="text"
      className="focus:border-muted-foreground/40 focus:ring-0 hover:border-muted-foreground/40 font-mono"
      readOnly
      value={value}
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
  abiParameter,
  value,
}: {
  abiParameter: viem.AbiParameter;
  value?: unknown;
}) {
  const { type, name } = abiParameter;
  const { rawValue, tooltipText, isTuple, parsedValue } = parseAbiParameter(
    abiParameter,
    value
  );

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

      {isTuple ? (
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
            <ClipboardButton text={rawValue} />
          </div>
        </div>
      )}
    </div>
  );
}
