import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import pako from 'pako';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';

export function useQueryIpfsData(url?: string, enabled?: boolean) {
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();
  return useQuery({
    queryKey: [url],
    queryFn: async ({ signal }) => {
      if (typeof url !== 'string') {
        throw new Error(`Invalid IPFS url: ${url}`);
      }
      const cid = url.replace('ipfs://', '');
      const res = await axios.get(`${settings.ipfsQueryUrl}${cid}`, {
        responseType: 'arraybuffer',
        signal,
      });
      const data = pako.inflate(res.data, { to: 'string' });
      const result = JSON.parse(data);
      addLog(`Loaded IPFS from URL ${url}: ${JSON.stringify(result)}`);
      return result;
    },
    enabled,
  });
}
