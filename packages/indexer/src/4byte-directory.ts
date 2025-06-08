import axios from 'axios';
// import _ from 'lodash';
import * as rkey from './db';
/* eslint no-console: "off" */
import { ActualRedisClientType, useRedis } from './redis';

type DirectoryEntry = {
  id: number;
  created_at: string;
  text_signature: string;
  hex_signature: string;
  bytes_signature: string;
};

type DirectoryResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DirectoryEntry[];
};

function sleep(t: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
}

export async function scan4ByteDirectory(rdb: ActualRedisClientType, nextDirectoryUrl: string, type: 'function' | 'event') {
  const response = await axios.get<DirectoryResponse>(nextDirectoryUrl);

  console.log('received batch', nextDirectoryUrl, response.statusText);

  const batch = rdb.multi();

  for (const item of response.data.results) {
    const abiSearchKey = `${rkey.RKEY_ABI_SEARCHABLE}:4bd:${type}:${item.text_signature}`;
    batch.hSetNX(abiSearchKey, 'name', item.text_signature);
    batch.hSetNX(abiSearchKey, 'selector', item.hex_signature);
    batch.hSetNX(abiSearchKey, 'type', type);
    batch.hSetNX(abiSearchKey, 'timestamp', Math.floor(new Date(item.created_at).getTime() / 1000).toString());
  }
  await batch.exec();

  return response.data.next;
}

export async function loop() {
  const redis = await useRedis();

  console.log('start signature database scan loop');

  while (true) {
    let nextUrl: string | null = 'https://www.4byte.directory/api/v1/signatures/?format=json';
    let failureCount = 0;
    while (nextUrl) {
      try {
        nextUrl = await scan4ByteDirectory(redis, nextUrl, 'function');
        failureCount = 0;
      } catch (err) {
        console.error('failed with error', err);
        if (failureCount >= 5) {
          console.error('error limit exceeded');
          process.exit(1);
        }
        await sleep(Math.pow(failureCount++, 2));
      }
    }

    nextUrl = 'https://www.4byte.directory/api/v1/event-signatures/?format=json';
    while (nextUrl) {
      try {
        nextUrl = await scan4ByteDirectory(redis, nextUrl, 'event');
        failureCount = 0;
      } catch (err) {
        console.error('failed with error', err);
        if (failureCount >= 5) {
          console.error('error limit exceeded');
          process.exit(1);
        }
        await sleep(Math.pow(failureCount++, 2));
      }
    }
  }
}

if (require.main === module) {
  void loop();
}
