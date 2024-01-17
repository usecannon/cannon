import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import pako from 'pako';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';

import { parse as parseUrl } from 'simple-url';

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
      const ipfsQueryUrl = settings.ipfsApiUrl.endsWith('/') ? settings.ipfsApiUrl : settings.ipfsApiUrl + '/';

      let kuboQueryUrl = `${ipfsQueryUrl}api/v0/cat?arg=${cid}`;
      addLog(`Querying IPFS: ${kuboQueryUrl}`);

      const parsedUrl = parseUrl(kuboQueryUrl);
      const headers: { [k: string]: string } = {};

      if (parsedUrl.auth) {
        console.log('Detected basic auth in url');
        const [username, password] = parsedUrl.auth.split(':');
        headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        kuboQueryUrl = kuboQueryUrl.replace(/\/\/.*@/, '//');
      }

      const res = await axios
        .post(kuboQueryUrl, null, {
          headers,
          responseType: 'arraybuffer',
          signal,
        })
        .catch(async (err) => {
          addLog(`IPFS Error: ${err.message}`);
          const gatewayQueryUrl = `${ipfsQueryUrl}${cid}`;
          addLog(`Querying IPFS as HTTP gateway: ${gatewayQueryUrl}`);
          return await axios.get(gatewayQueryUrl, {
            responseType: 'arraybuffer',
            signal,
          });
        });

      const data = pako.inflate(res.data as any, { to: 'string' });
      const result = JSON.parse(data);
      return result;
    },
    enabled,
  });
}
