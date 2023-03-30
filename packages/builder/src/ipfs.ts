import axios, { AxiosResponse } from 'axios';
import Debug from 'debug';
import pako from 'pako';
import { Buffer } from 'buffer';
import FormData from 'form-data';

export interface Headers {
  [key: string]: string | string[] | number | boolean | null;
}

const debug = Debug('cannon:builder:ipfs');

// IPFS Gateway is a special type of read-only endpoint which may be supplied by the user. If that is the case,
// we need to alter how we are communicating with IPFS.
export function isIpfsGateway(ipfsUrl: string) {
  const url = new URL(ipfsUrl);
  return url.port !== '5001' && url.protocol !== 'http+ipfs:' && url.protocol !== 'https+ipfs:';
}

export async function readIpfs(ipfsUrl: string, hash: string, customHeaders: Headers = {}): Promise<any> {
  debug(`downloading content from ${hash}`);

  let result: AxiosResponse;

  if (isIpfsGateway(ipfsUrl)) {
    result = await axios.get(ipfsUrl + `/ipfs/${hash}`, {
      responseType: 'arraybuffer',
      responseEncoding: 'application/octet-stream',
      headers: customHeaders,
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
      }
    );
  }

  return JSON.parse(Buffer.from(await pako.inflate(result.data)).toString('utf8'));
}

export async function writeIpfs(ipfsUrl: string, info: any, customHeaders: Headers = {}): Promise<string | null> {
  if (isIpfsGateway(ipfsUrl)) {
    // cannot write to IPFS on gateway
    return null;
  }

  const data = JSON.stringify(info);

  const buf = pako.deflate(data);
  debug('upload to ipfs:', buf.length, Buffer.from(buf).length);

  const formData = new FormData();

  formData.append('data', Buffer.from(buf));
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
