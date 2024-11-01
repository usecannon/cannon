import { Link2Icon } from '@radix-ui/react-icons';
import PackageTable from './PackageTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FC, useState } from 'react';

interface IPackageCardProps {
  pkgs: any[];
  maxHeight?: string;
}

export const PackageCardExpandable: FC<IPackageCardProps> = ({
  pkgs,
  maxHeight,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const onToggle = () => setIsOpen(!isOpen);

  return (
    <div
      key={pkgs[0].name}
      className="block overflow-hidden border border-border rounded bg-black transition-all duration-120"
    >
      <div className="flex flex-row items-center p-2">
        <div className="px-1 flex items-center">
          <h4 className="font-semibold text-lg">{pkgs[0].name}</h4>
          <Link
            href={'/packages/' + pkgs[0].name}
            className="ml-2 flex items-center"
          >
            <Link2Icon className="w-4 h-4" />
          </Link>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggle}
            id={`${pkgs[0].name}-expandable-button`}
          >
            {isOpen ? 'Show Less' : 'Show More'}
          </Button>
        </div>
      </div>
      <div className="align-middle overflow-auto" style={{ maxHeight }}>
        <PackageTable latestOnly={!isOpen} pkgs={pkgs} />
      </div>
    </div>
  );
};
