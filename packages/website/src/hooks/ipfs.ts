import { useQuery, UseQueryResult } from '@tanstack/react-query';
import axios from 'axios';
import pako from 'pako';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';

import { create as createUrl, parse as parseUrl } from 'simple-url';

function useFetchIpfsData<T>({
  url,
  enabled,
  parseResult,
}: {
  url?: string;
  enabled?: boolean;
  parseResult: (data: ArrayBuffer) => T;
}) {
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();

  return useQuery<T>({
    queryKey: [url],
    enabled,
    queryFn: async ({ signal }) => {
      if (typeof url !== 'string') {
        throw new Error(`Invalid IPFS url: ${url}`);
      }
      const cid = url.replace('ipfs://', '');
      // Add trailing slash if missing
      const ipfsQueryUrl = settings.ipfsApiUrl.replace(/\/?$/, '/');

      let kuboQueryUrl = `${ipfsQueryUrl}api/v0/cat?arg=${cid}`;
      addLog('info', `Querying IPFS: ${kuboQueryUrl}`);

      const parsedUrl = parseUrl(kuboQueryUrl);
      const headers: { [k: string]: string } = {};

      if (parsedUrl.auth) {
        const [username, password] = parsedUrl.auth.split(':');
        headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        kuboQueryUrl = kuboQueryUrl.replace(/\/\/.*@/, '//');
      }

      const res = await axios
        .post<ArrayBuffer>(kuboQueryUrl, null, {
          headers,
          responseType: 'arraybuffer',
          signal,
        })
        // In case the file fetch failed, let's try using the public ipfs.io gateway
        .catch(async (err) => {
          addLog('error', `IPFS Error: ${err.message}`);
          // Use the same protocol as the users', http on development and https on production
          const protocol = window.location.protocol.startsWith('http') ? window.location.protocol : 'http:';
          const gatewayQueryUrl = `${protocol}//ipfs.io/ipfs/${cid}`;
          addLog('info', `Querying IPFS as HTTP gateway: ${gatewayQueryUrl}`);
          return await axios.get<ArrayBuffer>(gatewayQueryUrl, {
            responseType: 'arraybuffer',
            signal,
          });
        });

      return parseResult(res.data);
    },
  });
}

export function useQueryIpfsDataRaw(url?: string, enabled?: boolean) {
  return useFetchIpfsData<ArrayBuffer>({ url, enabled, parseResult: (data) => data });
}

export function useQueryIpfsDataParsed<T>(url?: string, enabled?: boolean): UseQueryResult<T> {
  return useFetchIpfsData<T>({
    url,
    enabled,
    parseResult: (data) => {
      const _data = pako.inflate(data, { to: 'string' });
      return JSON.parse(_data);
    },
  });
}

// Create an ipfs url with compatibility for custom auth and https+ipfs:// protocol
export function createIpfsUrl(base: string, pathname: string) {
  const parsedUrl = parseUrl(base);
  const headers: { [k: string]: string } = {};

  const customProtocol = parsedUrl.protocol.endsWith('+ipfs');

  const uri = {
    protocol: customProtocol ? parsedUrl.protocol.split('+')[0] : parsedUrl.protocol,
    host: customProtocol && !parsedUrl.host.includes(':') ? `${parsedUrl.host}:5001` : parsedUrl.host,
    pathname,
    query: parsedUrl.query,
    hash: parsedUrl.hash,
  };

  if (parsedUrl.auth) {
    const [username, password] = parsedUrl.auth.split(':');
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  }

  return { url: createUrl(uri), headers };
}

export async function writeIpfs(ipfsUrl: string, content: string, { compress = false } = {}) {
  if (!content) throw new Error('No content to upload');

  const data = compress ? new Blob([pako.deflate(content)]) : content;

  const formData = new FormData();
  formData.append('data', data);

  const { url, headers } = createIpfsUrl(ipfsUrl, '/api/v0/add');
  const res = await axios.post(url, formData, { headers });

  return res.data.Hash;
}
