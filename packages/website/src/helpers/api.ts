import axios from 'axios';
import { externalLinks } from '@/constants/externalLinks';
import { SearchResponse } from '@usecannon/api/src/routes/search';

// TODO: move all this to typed hooks

export const getSearch = async ({ queryKey }: { queryKey: any[] }) => {
  const [, searchTerm] = queryKey;
  try {
    const response = await axios.get<SearchResponse>('search', {
      baseURL: externalLinks.API_CANNON,
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
      baseURL: externalLinks.API_CANNON,
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
    const response = await axios.get('chains', { baseURL: externalLinks.API_CANNON });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch chains', error as Error);
  }
};

export const getSelectors = async (sigs: string[]) => {
  try {
    const response = await axios.get('selector', { baseURL: externalLinks.API_CANNON, params: { q: sigs.join(',') } });
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch selectors', error as Error);
  }
}
