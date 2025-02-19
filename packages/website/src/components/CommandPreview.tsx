'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { codeToHtml } from 'shiki';
import { ClipboardButton } from '@/components/ClipboardButton';

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  command?: string;
  expandButtonTitle?: string;
}

export const CommandPreview = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ command = '', className, ...props }, ref) => {
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

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-md bg-[#0d1117] py-2.5 pl-4 font-mono text-sm flex items-center border border-border overflow-hidden',
          className
        )}
        {...props}
      >
        <div
          className="w-full overflow-x-auto whitespace-nowrap pr-12"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {command && (
          <ClipboardButton text={command} className={'absolute right-3'} />
        )}
      </div>
    );
  }
);

CommandPreview.displayName = 'CommandPreview';
