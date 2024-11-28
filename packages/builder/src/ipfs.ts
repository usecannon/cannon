import axios, { AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { Buffer } from 'buffer';
import Debug from 'debug';
import FormData from 'form-data';
import pako from 'pako';
import Hash from 'typestub-ipfs-only-hash';

export interface Headers {
  [key: string]: string | string[] | number | boolean | null;
}

const debug = Debug('cannon:builder:ipfs');

export function compress(data: string) {
  return pako.deflate(data);
}

export function uncompress(data: any) {
  return pako.inflate(data, { to: 'string' });
}

export async function getContentCID(value: string | Buffer): Promise<string> {
  return Hash.of(value);
}

export async function getContentUrl(content?: any): Promise<string | null> {
  if (!content) return null;
  const buffer = compress(JSON.stringify(content));
  return 'ipfs://' + (await getContentCID(Buffer.from(buffer)));
}

const FILE_URL_REGEX = /^ipfs:\/\/(?<cid>[a-zA-Z0-9]{46})$/;
export function parseIpfsUrl(url: string) {
  if (typeof url !== 'string' || !url) return null;
  return url.trim().match(FILE_URL_REGEX)?.groups?.cid || null;
}

export async function prepareFormData(info: any) {
  const data = JSON.stringify(info);
  const buf = compress(data);
  const cid = await getContentCID(Buffer.from(buf));

  const formData = new FormData();

  // This check is needed for proper functionality in the browser, as the Buffer is not correctly concatenated
  // But, for node we still wanna keep using Buffer
  const content = typeof window !== 'undefined' && typeof Blob !== 'undefined' ? new Blob([buf]) : Buffer.from(buf);
  formData.append('data', content);

  return { cid, formData };
}

export function setAxiosRetries(totalRetries = 3) {
  axiosRetry(axios, {
    retries: totalRetries,
    shouldResetTimeout: true,
    onRetry: (currentRetry, error) => {
      debug('Failed with error:', error);
      debug('Retrying...');

      if (currentRetry == totalRetries) {
        error.code = 'RETRY_ERROR';
        throw error;
      }
    },
    retryDelay: axiosRetry.exponentialDelay,
  });
}

// eslint-disable-next-line
export async function isIpfsGateway(ipfsUrl: string, _customHeaders?: any) {
  debug(`is-gateway ${ipfsUrl} false`);
  return false;
}

export async function readIpfs(
  ipfsUrl: string,
  hash: string,
  customHeaders: Headers = {},
  isGateway: boolean,
  timeout: number,
  retries = 3
): Promise<any> {
  debug(`downloading content from ${hash}`);
  setAxiosRetries(retries);

  let result: AxiosResponse;

  try {
    if (isGateway) {
      result = await axios.get(ipfsUrl + `/ipfs/${hash}`, {
        responseType: 'arraybuffer',
        responseEncoding: 'application/octet-stream',
        headers: customHeaders,
        timeout,
      });
    } else {
      // the +ipfs extension used to indicate a gateway is not recognized by
      // axios even though its just regular https
      // so we remove it if it exists
      result = await axios.post(
        ipfsUrl.replace('+ipfs', '') + `/api/v0/cat?arg=${hash}`,
        {},
        {
          responseEncoding: 'application/octet-stream',
          responseType: 'arraybuffer',
          headers: customHeaders,
          timeout,
        }
      );
    }
  } catch (err: any) {
    let errMsg = `could not download cannon package data from "${hash}": ${err.toString()}`;

    if (ipfsUrl.includes('infura')) {
      errMsg +=
        '\n\nNOTE: it appears you are using infura for IPFS. Please note that infura tends to be problematic when downloading IPFS artifacts outside of infura itself. Please consider using a different IPFS service.';
    }

    throw new Error(errMsg);
  }

  try {
    return JSON.parse(uncompress(result.data));
  } catch (err: any) {
    throw new Error(`could not decode cannon package data: ${err.toString()}`);
  }
}

export async function writeIpfs(
  ipfsUrl: string,
  info: any,
  customHeaders: Headers = {},
  isGateway: boolean,
  timeout: number,
  retries = 3
): Promise<string> {
  setAxiosRetries(retries);

  if (isGateway) {
    throw new Error(
      'unable to upload to ipfs: the IPFS url you have configured is either read-only (ie a gateway), or invalid. please double check your configuration.'
    );
  }

  const { cid, formData } = await prepareFormData(info);

  debug('upload to ipfs:', formData.getLengthSync());

  let result: AxiosResponse<any, any>;
  try {
    result = await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/add?local=true&to-files=%2F' + cid, formData, {
      headers: customHeaders,
      timeout,
    });
  } catch (err) {
    throw new Error(
      'Failed to upload to IPFS. Make sure you have a local IPFS daemon running and run `cannon setup` to confirm your configuration is set properly. ' +
        err
    );
  }

  debug('upload', result.statusText, result.data.Hash);

  if (cid !== result.data.Hash) {
    throw new Error('Invalid CID generated locally');
  }

  return cid;
}

export async function deleteIpfs(
  ipfsUrl: string,
  hash: string,
  customHeaders: Headers = {},
  isGateway: boolean,
  timeout: number
): Promise<void> {
  if (isGateway) {
    // cannot write to IPFS on gateway
    throw new Error('Cannot delete from IPFS gateway');
  }

  debug('delete from ipfs:', hash);

  try {
    await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/pin/rm?arg=' + hash, {}, { headers: customHeaders, timeout });
  } catch (err) {
    throw new Error('Failed to delete from IPFS. ' + err);
  }
}

export async function listPinsIpfs(ipfsUrl: string, customHeaders: Headers = {}, isGateway: boolean): Promise<string[]> {
  if (isGateway) {
    throw new Error('Cannot list pinned IPFS files on a gateway endpoint');
  }

  debug('list ipfs pins');
  try {
    const result = await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/pin/ls', { headers: customHeaders });

    return Object.keys(result.data.Keys).map((key) => 'ipfs://' + key);
  } catch (err) {
    throw new Error('Failed to list ipfs artifacts' + err);
  }
}

async function isIPFSRunningLocally(ipfsUrl: string): Promise<boolean> {
  try {
    const response = await axios.post(`${ipfsUrl}/api/v0/id`, {}, { timeout: 2000 });
    if (response.status === 200) return true;
  } catch (error) {
    return false;
  }
  return false;
}

async function getIPFSAvailabilityScoreLocally(ipfsUrl: string, cid: string): Promise<number> {
  try {
    const response = await axios.post(`${ipfsUrl}/api/v0/dht/findprovs?arg=${cid}`, {}, { timeout: 2000 });
    const lines = response.data.split('\n').filter(Boolean);
    let total = 0;

    for (const line of lines) {
      const obj = JSON.parse(line);
      if (obj.Type === 4 && Array.isArray(obj.Responses)) {
        total += obj.Responses.length;
      }
    }
    return total;
  } catch (error) {
    return 0;
  }
}

export async function fetchIPFSAvailability(ipfsUrl: string | undefined, cid: string): Promise<number | undefined> {
  if (!ipfsUrl) {
    return undefined;
  }
  if (await isIPFSRunningLocally(ipfsUrl)) {
    const score = await getIPFSAvailabilityScoreLocally(ipfsUrl, cid);
    return score;
  } else {
    debug('local ipfs unavailable, returning null for ipfs availability. Cannot fetch availability score.');
    return undefined;
  }
}
