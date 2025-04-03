import { Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import PackageTable from './PackageTable';

interface IPackageCardProps {
  pkgs: any[];
  maxHeight?: string;
}

export const PackageCardExpandable: FC<IPackageCardProps> = ({
  pkgs,
  maxHeight,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      key={pkgs[0].name}
      className="flex flex-col border border-border rounded-sm overflow-hidden"
      data-testid={`${pkgs[0].name}-section`}
    >
      <div
        className="flex flex-row px-3 py-2 items-center justify-between hover:bg-accent/60 cursor-pointer bg-accent/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <h4 className="font-medium text-sm">{pkgs[0].name}</h4>
          <Link
            href={'/packages/' + pkgs[0].name}
            className="ml-2 flex items-center text-muted-foreground hover:no-underline"
            onClick={(e) => e.stopPropagation()}
          >
            <LinkIcon className="w-4 h-4" />
          </Link>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="sm:hidden cursor-pointer"
          >
            {isOpen ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Switch
              className="scale-75"
              checked={!isOpen}
              onCheckedChange={(checked) => setIsOpen(!checked)}
              data-testid={`${pkgs[0].name}-filter-button`}
            />
            <p
              onClick={(checked) => setIsOpen(!checked)}
              className={cn(
                'text-xs cursor-pointer',
                isOpen && 'text-muted-foreground'
              )}
            >
              <span className="hidden sm:inline">
                Filter for latest on mainnet
              </span>
            </p>
          </div>
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key="content"
          initial={false}
          animate={{ height: 'auto' }}
          className="overflow-hidden bg-background"
        >
          <div className="align-middle overflow-auto" style={{ maxHeight }}>
            <PackageTable latestOnly={!isOpen} pkgs={pkgs} />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
