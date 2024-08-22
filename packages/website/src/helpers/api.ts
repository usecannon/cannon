import axios from 'axios';
import { ApiPackage } from '@usecannon/api/types';
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.usecannon.com';

export const getSearch = async ({ queryKey }: { queryKey: any[] }) => {
  const [, searchTerm] = queryKey;
  try {
    const response = await axios.get('search', {
      baseURL,
      params: {
        query: searchTerm,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch packages', error as Error);
  }
};

export const getPackages = async ({ queryKey }: { queryKey: any[] }) => {
  const [, searchTerm, selectedChains, types] = queryKey;
  try {
    const response = await axios.get('search', {
      baseURL,
      params: {
        query: searchTerm,
        chainIds: selectedChains.length > 0 ? selectedChains.join(',') : undefined,
        types,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch packages', error as Error);
  }
};

export const getChains = async () => {
  try {
    const response = await axios.get('chains', { baseURL });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch chains', error as Error);
  }
};

export const getPackage = async ({ queryKey }: { queryKey: any[] }) => {
  const [, name] = queryKey;

  try {
    const response = await axios.get<ApiPackage>(`packages/${name}`, { baseURL });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch package', error as Error);
  }
};

export const getPackage2 = async ({ queryKey }: { queryKey: any[] }) => {
  const [, name] = queryKey;

  const a: ApiPackage = {
    type: 'package',
    name: name,
    pepe: 1,
  };

  return a;
};
