import React, { useState } from 'react';
import { useStore } from '@/helpers/store';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type CopySettingButtonProps = {
  className?: string;
};

const CopySettingButton: React.FC<CopySettingButtonProps> = ({
  className = '',
}) => {
  const [hasCopied, setHasCopied] = useState(false);
  const settings = useStore((s) => s.settings);
  const safeTxServices = useStore((s) => s.safeTxServices);

  async function copyToClipboard() {
    const data = {
      safeTxServices: safeTxServices,
      settings: {
        ipfsApiUrl: settings.ipfsApiUrl,
        cannonSafeBackendUrl: settings.cannonSafeBackendUrl,
        customProviders: settings.customProviders,
        pythUrl: settings.pythUrl,
      },
    };

    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  }

  return (
    <Button
      variant="ghost"
      className={`flex-shrink-0 bg-background border border-border items-center justify-center ${className}`}
      onClick={copyToClipboard}
      data-testid="setting-copy-button"
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
      <span>
        <span className="block sm:hidden">Copy</span>
        <span className="hidden sm:block">Copy settings</span>
      </span>
    </Button>
  );
};

export default CopySettingButton;
