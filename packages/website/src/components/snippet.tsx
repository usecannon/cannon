import React from 'react';
import { codeToHtml } from 'shiki';
import { Check, Copy } from 'react-feather';
import { Button } from '@/components/ui/button';

export const Snippet = ({ ...props }: React.HTMLAttributes<HTMLPreElement>) => {
  const [hasCopied, setHasCopied] = React.useState(false);
  const [html, setHtml] = React.useState('');
  const command = (props.children as any).props.children as string;

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
    <div className="mt-3 first:mt-0 relative rounded-md font-mono text-sm flex items-start border border-border overflow-hidden bg-[#0d1117]">
      <div
        data-section="code"
        className="w-full overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {command && (
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0 h-7 w-7 border border-border absolute right-3 top-3"
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
};
