'use client';

import { FC } from 'react';
import { PackageCard } from '../Search/PackageCard/PackageCard';
import { CustomSpinner } from '@/components/CustomSpinner';
import Custom404 from '@/pages/404';
import { usePackageByName } from '@/hooks/api/usePackage';

export const PackagePage: FC<{
  name: string;
}> = ({ name }) => {
  const packagesQuery = usePackageByName({ name });

  if (packagesQuery.isLoading) {
    return <CustomSpinner />;
  }

  if (packagesQuery.isError) {
    throw new Error('Failed to fetch package');
  }

  return (
    <div className="flex flex-col w-full">
      {packagesQuery.isPending ? (
        <CustomSpinner />
      ) : packagesQuery.data ? (
        <div className="container mx-auto my-4 md:my-16 max-w-7xl">
          <PackageCard pkgs={packagesQuery.data.data} />
        </div>
      ) : (
        <div className="m-auto">
          <Custom404 text="Package not found" />
        </div>
      )}
    </div>
  );
};

export default PackagePage;
