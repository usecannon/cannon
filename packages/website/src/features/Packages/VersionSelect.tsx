import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown } from 'lucide-react';
import { PackageCard } from '@/features/Search/PackageCard/PackageCard';
import Chain from '@/features/Search/PackageCard/Chain';
import { usePackageByName } from '@/hooks/api/usePackage';
import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
} from '@/components/ui/dialog';
import { useState } from 'react';

export const VersionSelect: FC<{
  pkg: any;
}> = ({ pkg }) => {
  const [isOpen, setIsOpen] = useState(false);

  const packagesQuery = usePackageByName({ name: pkg.name });

  if (packagesQuery.isPending) {
    return null;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="border-border hover:bg-accent/50"
      >
        <div className="flex items-baseline gap-1">
          {pkg.version}
          {pkg?.tag}
          <span className="text-xs text-muted-foreground mr-1">
            {pkg?.preset}
          </span>
          <Chain id={pkg?.chainId} />
        </div>
        <ChevronsUpDown className="h-3 w-3 opacity-80" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/80" />
          <DialogContent className="max-w-[80rem] border-none p-0">
            <PackageCard pkgs={packagesQuery.data.data} maxHeight={'75vh'} />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};
