'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'react-feather';
import { codeToHtml } from 'shiki';

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  command?: string;
  expandButtonTitle?: string;
}

export const CommandPreview = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ command = '', className, ...props }, ref) => {
    const [hasCopied, setHasCopied] = React.useState(false);
    const [html, setHtml] = React.useState('');

    // Handle the async code highlighting
    React.useEffect(() => {
      const highlightCode = async () => {
        if (!command) return;

        const highlighted = await codeToHtml(command, {
          lang: 'bash',
          theme: 'github-dark-default',
          transformers: [
            {
              code(node) {
                node.properties['data-line-numbers'] = '';
              },
            },
          ],
        });

        setHtml(highlighted);
      };

      void highlightCode();
    }, [command]);

    async function copyToClipboard() {
      if (!command) return;
      await navigator.clipboard.writeText(command);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-md bg-muted/30 py-2.5 pl-4 font-mono text-sm flex items-center border border-border',
          className
        )}
        {...props}
      >
        <div
          className="w-full overflow-x-auto whitespace-nowrap pr-12"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {command && (
          <Button
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-7 w-7 bg-background border border-border absolute right-3"
            onClick={copyToClipboard}
          >
            {hasCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="sr-only">Copy command</span>
          </Button>
        )}
      </div>
    );
  }
);

CommandPreview.displayName = 'CommandPreview';
