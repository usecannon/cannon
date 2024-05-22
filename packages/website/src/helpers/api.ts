import axios from 'axios';

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
    const response = await axios.get(`packages/${name}`, { baseURL });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch package', error as Error);
  }
};
