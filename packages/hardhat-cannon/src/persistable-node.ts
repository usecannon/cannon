import { CheckpointTrie, SecureTrie as Trie } from 'merkle-patricia-tree';
import { HardhatNetworkProvider } from 'hardhat/internal/hardhat-network/provider/provider';
import { HardhatNode } from 'hardhat/internal/hardhat-network/provider/node.js';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { deflate, inflate } from 'zlib';
import { promisify } from 'util';
import { BN } from 'bn.js';

const deflatePromise = promisify(deflate);
const inflatePromise = promisify(inflate);

interface SerializableNodeState {
  storage: { [key: string]: any };

  // timestamp is stored so that contracts do not get confused because of going back in time
  minTimestamp: number;
}

export async function accessHreProvider(hre: HardhatRuntimeEnvironment): Promise<HardhatNetworkProvider> {
  let provider = hre.network.provider;

  // triggers init if not already run
  await provider.send('eth_blockNumber');

  // seacrh for node
  // @ts-ignore
  while (!provider._node) {
    provider =
      // @ts-ignore
      provider._provider || provider._wrapped || provider._wrappedProvider;

    if (!provider) {
      throw new Error('Hardhat Network must be in use to perform this operation');
    }
  }

  // @ts-ignore
  return provider;
}

export async function storeHreNode(hre: HardhatRuntimeEnvironment, node: HardhatNode): Promise<void> {
  const provider = accessHreProvider(hre);

  // @ts-ignore
  provider._node = node;
}

export async function dumpState(hre: HardhatRuntimeEnvironment): Promise<Buffer> {
  const provider = await accessHreProvider(hre);

  // @ts-ignore
  const node: HardhatNode = provider._node;

  const state: SerializableNodeState = {
    // note: would be best if `dumpState` or a similar function was supported within the state manager
    // itnode, but we have to hack it a bit here
    storage: await dumpStorage(node),
    minTimestamp: (await node.getLatestBlock()).header.timestamp.toNumber(),
  };

  // TODO: would be way better to utilize streaming here
  return deflatePromise(Buffer.from(JSON.stringify(state)));
}

export async function loadState(hre: HardhatRuntimeEnvironment, rawState: Buffer): Promise<boolean> {
  // TODO: would be way better to utilize streaming here
  const deflatedState = await inflatePromise(rawState);

  const state: SerializableNodeState = JSON.parse(deflatedState.toString('utf8'));

  const provider = await accessHreProvider(hre);

  // @ts-ignore
  const node: HardhatNode = provider._node;

  await importStorage(node, state.storage);

  const curTimestamp = (await node.getLatestBlock()).header.timestamp.toNumber();

  node.setNextBlockTimestamp(new BN(Math.max(curTimestamp, state.minTimestamp)));

  return true;
}

async function dumpStorage(node: HardhatNode): Promise<{ [key: string]: any }> {
  const storage: { [key: string]: any } = {};

  // @ts-ignore
  if (node._stateManager._state) {
    // ForkStateManager
    // @ts-ignore
    for (const account of node._stateManager._state.entries()) {
      storage[account[0]] = account[1]; // todo
    }

    // @ts-ignore
  } else {
    // DefaultStateManager
    // @ts-ignore
    storage.db = await trieDbDump(node._stateManager._trie);
    // @ts-ignore
    storage.root = await trieDump(node._stateManager._trie);
  }

  return storage;
}

function trieDbDump(trie: Trie): Promise<[string, string][]> {
  const dbData: [string, string][] = [];

  return new Promise((resolve) => {
    trie.db._leveldb
      .createReadStream({ keyEncoding: 'binary', valueEncoding: 'binary' })
      .on('data', async (d: { key: string; value: string }) => {
        dbData.push([Buffer.from(d.key, 'binary').toString('hex'), Buffer.from(d.value, 'binary').toString('hex')]);
      })
      .on('end', () => {
        resolve(dbData);
      });
  });
}

function trieDump(trie: Trie): Promise<[string, string][]> {
  const trieData: [string, string][] = [];
  //await new TrieReadStream(trie)

  return new Promise((resolve) => {
    trie
      .createReadStream()
      .on('data', (d: { key: Buffer; value: Buffer }) => {
        //console.log(d.key.toString('hex'));

        trieData.push([d.key.toString('hex'), d.value.toString('hex')]);
      })
      .on('end', () => {
        resolve(trieData);
      });
  });
}

async function importStorage(node: HardhatNode, storage: { [key: string]: any }) {
  // @ts-ignore
  if (node._stateManager._state) {
    // ForkStateManager
  } else {
    // DefaultStateManager

    // @ts-ignore
    await trieDbImport(node._stateManager._trie, storage.db);
    // @ts-ignore
    await trieImport(node._stateManager._trie, storage.root);
  }
}

async function trieDbImport(trie: Trie, data: [string, string][]): Promise<void> {
  for (const [k, v] of data) {
    await trie.db._leveldb.put(Buffer.from(k, 'hex'), Buffer.from(v, 'hex'), {
      keyEncoding: 'binary',
      valueEncoding: 'binary',
    });
  }
}

async function trieImport(trie: Trie, data: [string, string][]): Promise<void> {
  for (const [k, v] of data) {
    await CheckpointTrie.prototype.put.call(trie, Buffer.from(k, 'hex'), Buffer.from(v, 'hex'));
  }
}
