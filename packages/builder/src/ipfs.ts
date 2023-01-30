import axios, { AxiosResponse } from 'axios';
import Debug from 'debug';
import pako from 'pako';

import FormData from 'form-data';

const getRequestHeaders = (isPublicInfura: boolean) => {
  let headers = {
    'User-Agent': `cannon-cli-2`,
    origin: isPublicInfura ? 'https://usecannon.com' : undefined,
  };
  return headers;
};

const debug = Debug('cannon:builder:ipfs');

// IPFS Gateway is a special type of read-only endpoint which may be supplied by the user. If that is the case,
// we need to alter how we are communicating with IPFS.
export function isIpfsGateway(ipfsUrl: string) {
  const url = new URL(ipfsUrl);
  return url.port !== '5001' && url.protocol !== 'http+ipfs' && url.protocol !== 'https+ipfs';
}

export async function readIpfs(ipfsUrl: string, hash: string): Promise<any> {
  debug(`downloading content from ${hash}`);

  let result: AxiosResponse;

  if (isIpfsGateway(ipfsUrl)) {
    result = await axios.get(ipfsUrl + `/ipfs/${hash}`, {
      responseType: 'arraybuffer',
      responseEncoding: 'application/octet-stream',
      headers: getRequestHeaders(ipfsUrl.includes('infura-ipfs')),
    });
  } else {
    result = await axios.post(
      ipfsUrl + `/api/v0/cat?arg=${hash}`,
      {},
      {
        responseEncoding: 'application/octet-stream',
        responseType: 'arraybuffer',
        headers: getRequestHeaders(ipfsUrl.includes('infura-ipfs')),
      }
    );
  }

  return JSON.parse(Buffer.from(await pako.inflate(result.data)).toString('utf8'));
}

export async function writeIpfs(ipfsUrl: string, info: any): Promise<string | null> {
  if (isIpfsGateway(ipfsUrl)) {
    // cannot write to IPFS on gateway
    return null;
  }

  const data = JSON.stringify(info);

  const buf = pako.deflate(data);
  debug('upload to ipfs:', buf.length, Buffer.from(buf).length);

  const formData = new FormData();
  formData.append('data', Buffer.from(buf));

  const result = await axios.post(ipfsUrl + '/api/v0/add', formData, {
    headers: getRequestHeaders(ipfsUrl.includes('infura-ipfs')),
  });

  debug('upload', result.statusText, result.data.Hash);

  return result.data.Hash;
}
