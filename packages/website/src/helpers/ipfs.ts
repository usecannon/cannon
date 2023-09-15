import { IPFSLoader } from '@usecannon/builder';
import { create as createUrl, parse as parseUrl } from 'simple-url';

const FILE_URL_REGEX = /^(?:ipfs:\/\/|@ipfs:)?(?<cid>[a-zA-Z0-9]{46})$/;

export function parseIpfsHash(url: string) {
  if (typeof url !== 'string') throw new Error(`Invalid url "${url}"`);
  if (!url) return '';
  return url.trim().match(FILE_URL_REGEX)?.groups?.cid || '';
}

export function isIpfsUploadEndpoint(ipfsUrl: string) {
  try {
    const url = new URL(ipfsUrl);
    return url.port === '5001' || url.protocol === 'http+ipfs:' || url.protocol === 'https+ipfs:';
  } catch (_) {
    return false;
  }
}

export class IPFSBrowserLoader extends IPFSLoader {
  constructor(ipfsUrl: string) {
    const { url, headers } = createIpfsUrl(ipfsUrl);
    super(url.replace(/\/$/, ''), headers);
  }
}

// Create an ipfs url with compatibility for custom auth and https+ipfs:// protocol
export function createIpfsUrl(base: string, pathname = '') {
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
