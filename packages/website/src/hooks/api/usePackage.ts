import { externalLinks } from '@/constants/externalLinks';
import { useQuery } from '@tanstack/react-query';
import { ApiDocument, ApiPackage } from '@usecannon/api/dist/src/types';
import axios from 'axios';

const fetchPackageByRef = async ({ queryKey }: { queryKey: string[] }) => {
  const [, fullPackagePath] = queryKey;
  try {
    const response = await axios.get<{ data: ApiPackage }>(`packages/${fullPackagePath}`, {
      baseURL: externalLinks.API_CANNON,
    });
    return response.data.data;
  } catch (error) {
    throw new Error('Failed to fetch package', error as Error);
  }
};

const fetchPackageByName = async ({ queryKey }: { queryKey: string[] }) => {
  const [, name] = queryKey;
  try {
    const response = await axios.get<{ total: any; data: ApiDocument[] }>(`packages/${name}`, {
      baseURL: externalLinks.API_CANNON,
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch package', error as Error);
  }
};

// TODO: handle pagination
export function usePackageByRef({
  name,
  tag,
  preset,
  chainId,
}: {
  name: string;
  tag: string;
  preset: string;
  chainId: number;
}) {
  return useQuery({
    queryKey: ['cannon.api.package.fullPackageRef', `${name}:${tag}@${preset}/${chainId}`],
    queryFn: fetchPackageByRef,
  });
}

// TODO: handle pagination
export function usePackageByName({ name }: { name: string }) {
  return useQuery({
    queryKey: ['cannon.api.package.packageName', name],
    queryFn: fetchPackageByName,
  });
}
