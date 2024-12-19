import { IPFSLoader } from '@usecannon/builder';
import { create as createUrl, parse as parseUrl } from 'simple-url';

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

  if (parsedUrl.auth) {
    const [username, password] = parsedUrl.auth.split(':');
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  }

  return { url: createUrl(uri), headers };
}

/**
 * Extracts the IPFS hash from various input formats.
 * @param input - The input string containing an IPFS resource.
 * @returns The IPFS hash if found, or null if not detected.
 */
export function extractIpfsHash(input: string): string | null {
  if (typeof input !== 'string' || !input.trim()) {
    return null;
  }

  // Regular expression to match IPFS hashes with or without the ipfs:// protocol
  const ipfsHashRegex = /^(?:ipfs:\/\/)?([a-zA-Z0-9]{46})$/i;
  const match = input.trim().match(ipfsHashRegex);

  // If there's a match, return the IPFS hash (captured group)
  return match ? match[1] : null;
}
