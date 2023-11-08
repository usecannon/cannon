import axios, { AxiosResponse } from 'axios';
import { Buffer } from 'buffer';
import Debug from 'debug';
import FormData from 'form-data';
import pako from 'pako';

export interface Headers {
  [key: string]: string | string[] | number | boolean | null;
}

const debug = Debug('cannon:builder:ipfs');

export async function readIpfs(ipfsUrl: string, hash: string, customHeaders: Headers = {}, isGateway = false): Promise<any> {
  debug(`downloading content from ${hash}`);

  let result: AxiosResponse;

  try {
    if (isGateway) {
      result = await axios.get(ipfsUrl + `/ipfs/${hash}`, {
        responseType: 'arraybuffer',
        responseEncoding: 'application/octet-stream',
        headers: customHeaders,
        // 5 minutes timeout
        timeout: 5 * 60 * 1000,
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
          // 5 minutes timeout
          timeout: 5 * 60 * 1000,
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
    return JSON.parse(pako.inflate(result.data, { to: 'string' }));
  } catch (err: any) {
    throw new Error(`could not decode cannon package data: ${err.toString()}`);
  }
}

export async function writeIpfs(
  ipfsUrl: string,
  info: any,
  customHeaders: Headers = {},
  isGateway = false
): Promise<string | null> {
  if (isGateway) {
    throw new Error('Cannot write files to an IPFS gateway endpoint');
  }

  const data = JSON.stringify(info);

  const buf = pako.deflate(data);
  debug('upload to ipfs:', buf.length, Buffer.from(buf).length);

  const formData = new FormData();

  // This check is needed for proper functionality in the browser, as the Buffer is not correctly concatenated
  // But, for node we still wanna keep using Buffer
  const content = typeof window !== 'undefined' && typeof Blob !== 'undefined' ? new Blob([buf]) : Buffer.from(buf);

  formData.append('data', content);
  try {
    const result = await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/add', formData, { headers: customHeaders });

    debug('upload', result.statusText, result.data.Hash);

    return result.data.Hash;
  } catch (err) {
    throw new Error(
      'Failed to upload to IPFS. Make sure you have a local IPFS daemon running and run `cannon setup` to confirm your configuration is set properly. ' +
        err
    );
  }
}

export async function deleteIpfs(
  ipfsUrl: string,
  hash: string,
  customHeaders: Headers = {},
  isGateway = false
): Promise<void> {
  if (isGateway) {
    // cannot write to IPFS on gateway
    throw new Error('Cannot delete from IPFS gateway');
  }

  debug('delete from ipfs:', hash);

  try {
    await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/pin/rm?arg=' + hash, {}, { headers: customHeaders });
  } catch (err) {
    throw new Error('Failed to delete from IPFS. ' + err);
  }
}

export async function listPinsIpfs(ipfsUrl: string, customHeaders: Headers = {}, isGateway = false): Promise<string[]> {
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
