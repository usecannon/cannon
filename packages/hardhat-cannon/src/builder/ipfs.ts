import fs from 'fs-extra';
import path from 'path';
import { IPFSHTTPClient, Options, create, globSource } from 'ipfs-http-client';

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

  constructor(options: Options = { url: 'http://127.0.0.1:5001/api/v0' }) {
    this.client = create(options);
  }

  async add(files: IPFSFile[]) {
    const results = [];

    for await (const result of this.client.addAll(_openFiles(files), {
      pin: true,
    })) {
      results.push(result);
    }

    return results;
  }
}

async function _openFile(file: IPFSFileRemote) {
  const fileHandler = fs.createReadStream(file.localPath);

  return {
    path: file.remotePath,
    content: fileHandler,
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
      const localFile = file as IPFSFileRemote;
      const stat = await fs.stat(localFile.localPath);

      if (stat.isDirectory()) {
        for await (const child of globSource(localFile.localPath, '**/*')) {
          yield {
            path: path.join(file.remotePath, child.path),
            content: child.content,
          };
        }
      } else {
        yield _openFile(localFile);
      }
    }
  }
}
