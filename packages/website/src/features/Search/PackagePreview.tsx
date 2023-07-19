import { FC } from 'react';
import { GetPackagesQuery } from '@/types/graphql/graphql';
import PublishInfo from '@/features/Search/PublishInfo';
import PackageNetworks from '@/features/Search/PackageNetworks';

export const PackagePreview: FC<{ packages: GetPackagesQuery['packages'] }> = ({
  packages,
}) => {
  if (!packages?.length) {
    return <div>'No packages found'</div>;
  }
  return (
    <div>
      {' '}
      {packages.map((pkg) => (
        <div>
          <PublishInfo p={pkg} />
          <PackageNetworks p={pkg} />
        </div>
      ))}
    </div>
  );
};
