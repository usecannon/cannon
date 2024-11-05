'use client';

import { Box, Text, useClipboard } from '@chakra-ui/react';
import { FC } from 'react';
import { Copy } from 'react-feather';

interface ICommandPreviewProps {
  command: string;
  className?: string;
}

export const CommandPreview: FC<ICommandPreviewProps> = ({
  command,
  className,
}) => {
  const { hasCopied, onCopy } = useClipboard(command);
  const index = command.indexOf(' ');
  const firstPart = command.substring(0, index);
  const secondPart = command.substring(index, command.length);
  return (
    <Box
      py={1}
      px={3}
      position="relative"
      className={className + ' bg-muted/30'}
      borderRadius="md"
    >
      <Text fontFamily="var(--font-mono)">
        <Text as="span" color="#61afef">
          {firstPart}
        </Text>
        <Text as="span">{secondPart}</Text>
      </Text>
      <Box
        position="absolute"
        top="8px"
        right="10px"
        cursor="pointer"
        onClick={onCopy}
      >
        {hasCopied ? <Text fontSize="xs">Copied</Text> : <Copy size={16} />}
      </Box>
    </Box>
  );
};

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  expandButtonTitle?: string;
}

export const CommandPreview2 = function CodeBlockWrapper({
  expandButtonTitle = 'View Code',
  className,
  children,
  ...props
}: CodeBlockProps) {
  const [isOpened, setIsOpened] = React.useState(false);

  return (
    <Collapsible open={isOpened} onOpenChange={setIsOpened}>
      <div className={cn('relative overflow-hidden', className)} {...props}>
        <CollapsibleContent
          forceMount
          className={cn('overflow-hidden', !isOpened && 'max-h-32')}
        >
          <div
            className={cn(
              '[&_pre]:my-0 [&_pre]:max-h-[650px] [&_pre]:pb-[100px]',
              !isOpened ? '[&_pre]:overflow-hidden' : '[&_pre]:overflow-auto]'
            )}
          >
            {children}
          </div>
        </CollapsibleContent>
        <div
          className={cn(
            'absolute flex items-center justify-center bg-gradient-to-b from-zinc-700/30 to-zinc-950/90 p-2',
            isOpened ? 'inset-x-0 bottom-0 h-12' : 'inset-0'
          )}
        >
          <CollapsibleTrigger asChild>
            <Button variant="secondary" className="h-8 text-xs">
              {isOpened ? 'Collapse' : expandButtonTitle}
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
    </Collapsible>
  );
};
