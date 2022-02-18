import fs from 'fs/promises';
import { IPFSHTTPClient, create } from 'ipfs-http-client';

type IPFSFileContent = {
  remotePath: string;
  content:
    | string
    | InstanceType<typeof String>
    | ArrayBufferView
    | ArrayBuffer
    | Blob
    | ReadableStream<Uint8Array>;
};

type IPFSFileRemote = {
  remotePath: string;
  localPath: string;
};

export type IPFSFile = IPFSFileContent | IPFSFileRemote;

export default class IPFS {
  client: IPFSHTTPClient;

  constructor({ url = 'http://localhost:5001/api/v0' } = {}) {
    this.client = create({ url });
  }

  async add(files: IPFSFile[]) {
    const results = [];

    for await (const result of this.client.addAll(_openFiles(files))) {
      results.push(result);
    }

    return results;
  }
}

async function _openFile(file: IPFSFileRemote) {
  const fileHandler = await fs.open(file.localPath, 'r');

  return {
    path: file.remotePath,
    content: fileHandler.createReadStream(),
  };
}

async function* _openFiles(files: IPFSFile[]) {
  for (const file of files) {
    const fileWithContent = file as IPFSFileContent;
    if (fileWithContent.content) {
      yield {
        path: fileWithContent.remotePath,
        content: fileWithContent.content,
      };
    } else {
      yield _openFile(file as IPFSFileRemote);
    }
  }
}
