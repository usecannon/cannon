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
      className="block overflow-hidden border border-gray-600 rounded bg-black transition-all duration-120"
    >
      <div className="flex flex-row items-center p-2 bg-gray-800">
        <div className="px-1">
          <h4 className="inline-block text-sm font-semibold">{pkgs[0].name}</h4>
          <Link
            href={'/packages/' + pkgs[0].name}
            className="inline-block ml-1.5 align-middle"
          >
            <Link2Icon className="w-3 h-3 translate-y-[0.5px]" />
          </Link>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant="outline"
            className="font-[var(--font-miriam)] px-2 text-xs font-medium uppercase tracking-wider text-shadow-sm bg-gray-900 border-gray-500 hover:bg-gray-800"
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
