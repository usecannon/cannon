import { Link as LinkIcon } from 'lucide-react';
import PackageTable from './PackageTable';
import Link from 'next/link';
import { FC } from 'react';
import { ApiDocument } from '@usecannon/api/dist/src/types';
import React, { useState } from 'react';
import SearchInput from '@/components/SearchInput';

interface IPackageCardProps {
  pkgs: ApiDocument[];
  maxHeight?: string;
}

export const PackageCard: FC<IPackageCardProps> = ({ pkgs, maxHeight }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <div
      key={pkgs[0].name}
      className="block overflow-hidden border border-border rounded bg-black transition-all duration-120"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full p-2 space-y-2 sm:space-y-0">
        <div className="px-1 flex flex-wrap items-center">
          <h4 className="font-semibold text-lg">{pkgs[0].name}</h4>
          <Link
            href={'/packages/' + pkgs[0].name}
            className="ml-2 flex items-center"
          >
            <LinkIcon className="w-4 h-4" />
          </Link>
        </div>
        <SearchInput size="sm" onSearchChange={setSearchTerm} />
      </div>

      <div className="align-middle overflow-auto" style={{ maxHeight }}>
        <PackageTable latestOnly={false} pkgs={pkgs} searchTerm={searchTerm} />
      </div>
    </div>
  );
};
