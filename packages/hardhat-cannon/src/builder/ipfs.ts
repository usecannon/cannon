import fs from 'fs/promises';
import { create, IPFSHTTPClient } from 'ipfs-http-client';

export interface IPFSFile {
  remotePath: string
  localPath: string
}

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

async function _openFile(file: IPFSFile) {
  const fileHandler = await fs.open(file.localPath, 'r');

  return {
    path: file.remotePath,
    content: fileHandler.createReadStream(),
  };
}

async function* _openFiles(files: IPFSFile[]) {
  for (const file of files) {
    yield _openFile(file);
  }
}
