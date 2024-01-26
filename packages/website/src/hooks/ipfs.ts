import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import pako from 'pako';
import { useStore } from '@/helpers/store';
import { useLogs } from '@/providers/logsProvider';

import { create as createUrl, parse as parseUrl } from 'simple-url';

export function useQueryIpfsData(url?: string, enabled?: boolean, raw?: boolean) {
  const settings = useStore((s) => s.settings);
  const { addLog } = useLogs();
  return useQuery({
    queryKey: [url, raw],
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

      if (raw) {
        return res.data;
      }

      const data = pako.inflate(res.data as any, { to: 'string' });
      try {
        const result = JSON.parse(data);
        return result;
      } catch (err) {
        return data;
      }
    },
    enabled,
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

  console.log('uploaded', res.statusText, res.data.Hash);

  return res.data.Hash;
}
