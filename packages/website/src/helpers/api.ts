import axios from 'axios';

export const getPackages = async ({ queryKey }: { queryKey: any[] }) => {
  // queryKey[1] is searchTerm, queryKey[2] is selectedChains
  const [, searchTerm, selectedChains, types] = queryKey;
  try {
    const response = await axios.get('https://api.usecannon.com/search', {
      params: {
        query: searchTerm,
        chainIds: selectedChains.length > 0 ? selectedChains.join(',') : undefined,
        types,
      },
    });
    return response.data; // Assuming the API returns data directly
  } catch (error) {
    throw new Error('Failed to fetch packages', error as Error);
  }
};

export const getChains = async () => {
  try {
    const response = await axios.get('https://api.usecannon.com/chains');
    return response.data; // Assuming the API returns data directly
  } catch (error) {
    throw new Error('Failed to fetch chains', error as Error);
  }
};

export const getPackage = async ({ queryKey }: { queryKey: any[] }) => {
  // queryKey[1] is name
  const [, name] = queryKey;
  try {
    const response = await axios.get('https://api.usecannon.com/packages/' + name);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch package', error as Error);
  }
};
