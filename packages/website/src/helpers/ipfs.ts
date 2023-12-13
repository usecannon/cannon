import { IPFSLoader } from '@usecannon/builder';
import { create as createUrl, parse as parseUrl } from 'simple-url';

const FILE_URL_REGEX = /^(?:ipfs:\/\/|@ipfs:)?(?<cid>[a-zA-Z0-9]{46})$/;

export function parseIpfsHash(url: string) {
  if (typeof url !== 'string') throw new Error(`Invalid url "${url}"`);
  if (!url) return '';
  return url.trim().match(FILE_URL_REGEX)?.groups?.cid || '';
}

export class IPFSBrowserLoader extends IPFSLoader {
  constructor(ipfsUrl: string) {
    const { url, headers } = createIpfsUrl(ipfsUrl);
    super(url.replace(/\/$/, ''), headers);
  }
}

// Create an ipfs url with compatibility for custom auth
export function createIpfsUrl(base: string, pathname = '') {
  const parsedUrl = parseUrl(base);
  const headers: { [k: string]: string } = {};

  const uri = {
    protocol: parsedUrl.protocol,
    host: parsedUrl.host,
    pathname: pathname || parsedUrl.pathname,
    query: parsedUrl.query,
    hash: parsedUrl.hash,
  };

  console.log('the uri info', parsedUrl, uri);

  if (parsedUrl.auth) {
    console.log('Detected basic auth in url');
    const [username, password] = parsedUrl.auth.split(':');
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  }

  console.log('URL FINAL', createUrl(uri), headers);

  return { url: createUrl(uri), headers };
}
