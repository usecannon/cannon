import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'react-feather';
import { motion, AnimatePresence } from 'framer-motion';

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
    <Button
      size="icon"
      variant="ghost"
      className={`flex-shrink-0 h-7 w-7 bg-background border border-border absolute right-1 ${className}`}
      onClick={copyToClipboard}
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
            <Check className="h-3.5 w-3.5 text-green-500" />
          </motion.div>
        ) : (
          <motion.div
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Copy command</span>
    </Button>
  );
};

export default ClipboardButton;
