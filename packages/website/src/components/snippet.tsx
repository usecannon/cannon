import React, { useEffect, useState } from 'react';
import { codeToHtml } from 'shiki';
import { ClipboardButton } from '@/components/ClipboardButton';

export const Snippet = ({ ...props }: React.HTMLAttributes<HTMLPreElement>) => {
  const [html, setHtml] = useState('');
  const command = (props.children as any).props.children as string;

  // Handle the async code highlighting
  useEffect(() => {
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
    <div className="relative rounded-md font-mono text-sm flex items-start border border-border overflow-hidden bg-[#0d1117]">
      <div
        data-section="code"
        className="w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
        data-testid="code-section"
      />
      {command && (
        <ClipboardButton
          text={command}
          className={'absolute right-3 top-3 bg-transparent'}
        />
      )}
    </div>
  );
};
