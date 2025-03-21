import { Link as LinkIcon } from 'lucide-react';
import PackageTable from './PackageTable';
import Link from 'next/link';
import { FC } from 'react';
import { ApiDocument } from '@usecannon/api/dist/src/types';

interface IPackageCardProps {
  pkgs: ApiDocument[];
  maxHeight?: string;
}

export const PackageCard: FC<IPackageCardProps> = ({ pkgs, maxHeight }) => {
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
            <LinkIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="align-middle overflow-auto" style={{ maxHeight }}>
        <PackageTable latestOnly={false} pkgs={pkgs} />
      </div>
    </div>
  );
};
