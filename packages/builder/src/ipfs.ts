import axios, { AxiosResponse } from 'axios';
import { Buffer } from 'buffer';
import Debug from 'debug';
import FormData from 'form-data';
import * as Block from 'multiformats/block';
import * as raw from 'multiformats/codecs/raw';
import { sha256 } from 'multiformats/hashes/sha2';
import pako from 'pako';

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

export async function getContentCID(value: Uint8Array): Promise<string> {
  // Create an IPLD block with the raw data and SHA2-256 hash
  const block = await Block.encode({ value, codec: raw, hasher: sha256 });

  // The CID is accessible via the block.cid property
  return block.cid.toString();
}

export async function isIpfsGateway(ipfsUrl: string) {
  const res = await axios.post(ipfsUrl + '/api/v0/cat', null, { timeout: 15 * 1000 });
  return !res.data.includes('argument "ipfs-path" is required');
}

export async function readIpfs(
  ipfsUrl: string,
  hash: string,
  customHeaders: Headers = {},
  isGateway: boolean
): Promise<any> {
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
    return JSON.parse(uncompress(result.data));
  } catch (err: any) {
    throw new Error(`could not decode cannon package data: ${err.toString()}`);
  }
}

export async function writeIpfs(
  ipfsUrl: string,
  info: any,
  customHeaders: Headers = {},
  isGateway: boolean
): Promise<string> {
  const data = JSON.stringify(info);
  const buf = compress(data);
  const cid = await getContentCID(buf);

  if (!isGateway) {
    debug('upload to ipfs:', buf.length, Buffer.from(buf).length);
    const formData = new FormData();

    // This check is needed for proper functionality in the browser, as the Buffer is not correctly concatenated
    // But, for node we still wanna keep using Buffer
    const content = typeof window !== 'undefined' && typeof Blob !== 'undefined' ? new Blob([buf]) : Buffer.from(buf);
    formData.append('data', content);
    try {
      const result = await axios.post(ipfsUrl.replace('+ipfs', '') + '/api/v0/add', formData, { headers: customHeaders });

      debug('upload', result.statusText, result.data.Hash);

      if (cid !== result.data.Hash) {
        throw new Error('nope');
      }
    } catch (err) {
      throw new Error(
        'Failed to upload to IPFS. Make sure you have a local IPFS daemon running and run `cannon setup` to confirm your configuration is set properly. ' +
          err
      );
    }
  }

  return cid;
}

export async function deleteIpfs(
  ipfsUrl: string,
  hash: string,
  customHeaders: Headers = {},
  isGateway: boolean
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
