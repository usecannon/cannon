import { Link2Icon } from '@radix-ui/react-icons';
import PackageTable from './PackageTable';
import Link from 'next/link';
import { FC } from 'react';
import { ApiDocument } from '@usecannon/api/dist/src/types';
import { Card, CardHeader } from '@/components/ui/card';

interface IPackageCardProps {
  pkgs: ApiDocument[];
  maxHeight?: string;
}

export const PackageCard: FC<IPackageCardProps> = ({ pkgs, maxHeight }) => {
  return (
    <Card
      key={pkgs[0].name}
      className="relative overflow-hidden border border-gray-600 bg-black transition-all duration-[120ms]"
    >
      <CardHeader className="flex justify-between bg-gray-800 p-2">
        <h4 className="text-sm font-semibold w-full flex">
          {pkgs[0].name}

          <Link
            href={'/packages/' + pkgs[0].name}
            className="inline-block ml-auto"
          >
            <Link2Icon className="h-4 w-4" />
          </Link>
        </h4>
      </CardHeader>

      <div className="overflow-auto" style={{ maxHeight: maxHeight }}>
        <PackageTable latestOnly={false} pkgs={pkgs} />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-black/50 to-transparent" />
    </Card>
  );
};
