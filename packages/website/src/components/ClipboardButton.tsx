import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ClibpboardButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const ClipboardButton: FC<ClibpboardButtonProps> = ({
  text,
  className,
  size = 'default',
}) => {
  const [hasCopied, setHasCopied] = useState(false);

  async function copyToClipboard() {
    await navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }

  function adjustCopyIconClass(size: 'sm' | 'default' | 'lg') {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 [&_svg]:h-3.5 [&_svg]:w-3.5';
      case 'lg':
        return 'h-8 w-8 [&_svg]:h-4.5 [&_svg]:w-4.5';
      default:
        return 'h-7 w-7 [&_svg]:h-4 [&_svg]:w-4';
    }
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className={`flex-shrink-0 ${adjustCopyIconClass(
        size
      )} bg-background border border-border ${className}`}
      onClick={copyToClipboard}
      data-testid="clipboard-copy-button"
    >
      <AnimatePresence mode="wait" initial={false}>
        {hasCopied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Check className="text-green-500" data-testid="copied-icon" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="text-muted-foreground" data-testid="copy-icon" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Copy command</span>
    </Button>
  );
};

export default ClipboardButton;
