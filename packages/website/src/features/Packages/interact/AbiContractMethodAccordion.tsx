import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { FC, ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { AbiFunction } from 'abitype';
import { toFunctionSignature } from 'viem';
import { useRouter } from 'next/router';

interface Props {
  f: AbiFunction;
  content: ReactNode;
  anchor: string;
  selected?: boolean;
}

export const AbiContractMethodAccordion: FC<Props> = ({
  f,
  content,
  anchor,
  selected,
}) => {
  const [isOpen, setIsOpen] = useState(selected || false);
  const router = useRouter();

  // Auto-expand when selected
  useEffect(() => {
    if (selected) {
      setIsOpen(true);
    }
  }, [selected]);

  return (
    <div className="flex flex-col border border-border rounded-sm overflow-hidden">
      <div
        className="flex flex-row px-3 py-2 items-center justify-between hover:bg-accent/60 cursor-pointer bg-accent/50 transition-colors"
        id={anchor}
        onClick={() => setIsOpen(!isOpen)}
      >
        {f.name && (
          <h2 className="text-sm font-mono flex items-center">
            <span className="break-all">
              {toFunctionSignature(f)}
              <Link
                className="text-muted-foreground ml-2 hover:no-underline"
                href={`${router.asPath.split('#')[0]}#${anchor}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isOpen) {
                    setIsOpen(true);
                  }
                }}
              >
                #
              </Link>
            </span>
          </h2>
        )}
        <ChevronDownIcon
          className={cn(
            'w-5 h-5 transition-transform duration-300',
            isOpen && 'rotate-180'
          )}
        />
      </div>
      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
