import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'react-feather';

interface ClibpboardButtonProps {
  text: string;
  className?: string;
}

export const ClipboardButton: FC<ClibpboardButtonProps> = ({
  text,
  className,
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className={`flex-shrink-0 h-7 w-7 bg-background border border-border absolute right-3 ${className}`}
        onClick={copyToClipboard}
      >
        {hasCopied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="sr-only">Copy command</span>
      </Button>
    </>
  );
};

export default ClipboardButton;
