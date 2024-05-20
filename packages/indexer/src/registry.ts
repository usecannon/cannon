import _ from 'lodash';
import {
  CannonStorage,
  ChainDefinition,
  createInitialContext,
  DeploymentInfo,
  getCannonContract,
  IPFSLoader,
  OnChainRegistry,
  PackageReference,
  StepState,
  parseVariant,
} from '@usecannon/builder';
import { createClient, RedisClientType, SchemaFieldTypes } from 'redis';
/* eslint no-console: "off" */
import * as viem from 'viem';
import * as viemChains from 'viem/chains';
import { mainnet, optimism } from 'viem/chains';

import * as rkey from './db';

const BLOCK_BATCH_SIZE = 5000;

const MAX_FAIL = 3;

const START_IDS = {
  '1': 16490000,
  '10': 119000000,
};

type ActualRedisClientType = ReturnType<typeof createClient>;

const LEGACY_PACKAGE_PUBLISH_EVENT = {
  anonymous: false,
  inputs: [
    {
      indexed: true,
      internalType: 'bytes32',
      name: 'name',
      type: 'bytes32',
    },
    {
      indexed: true,
      internalType: 'bytes32',
      name: 'tag',
      type: 'bytes32',
    },
    {
      indexed: true,
      internalType: 'bytes32',
      name: 'variant',
      type: 'bytes32',
    },
    {
      indexed: false,
      internalType: 'string',
      name: 'deployUrl',
      type: 'string',
    },
    {
      indexed: false,
      internalType: 'string',
      name: 'metaUrl',
      type: 'string',
    },
    {
      indexed: false,
      internalType: 'address',
      name: 'owner',
      type: 'address',
    },
  ],
  name: 'PackagePublish',
  type: 'event',
};

export const cannonChain: viem.Chain = {
  id: 13370,
  name: 'Cannon Local',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: { default: { http: ['http://localhost:8545'] } },
};

export const chains: viem.Chain[] = [cannonChain, ...Object.values(viemChains)];

function sleep(t: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
}

function addHexastoreToBatch(
  batch: ReturnType<RedisClientType['multi']>,
  relationKey: string,
  subject: string,
  predicate: string,
  object: string
) {
  batch.zAdd(relationKey, [
    { score: 0, value: `spo:${subject}:${predicate}:${object}` },
    { score: 0, value: `sop:${subject}:${object}:${predicate}` },
    { score: 0, value: `ops:${object}:${predicate}:${subject}` },
    { score: 0, value: `osp:${object}:${subject}:${predicate}` },
    { score: 0, value: `pso:${predicate}:${subject}:${object}` },
    { score: 0, value: `pos:${predicate}:${object}:${subject}` },
  ]);
}

const recordDeployStep: {
  [stepType: string]: (
    redis: ActualRedisClientType,
    state: StepState,
    def: ChainDefinition,
    pkg: any,
    packageRef: string,
    stepName: string
  ) => Promise<void>;
} = {
  provision: async (
    redis: ActualRedisClientType,
    state: StepState,
    def: ChainDefinition,
    pkg: any,
    packageRef: string,
    name: string
  ) => {
    const batch = redis.multi();

    const config = def.getConfig(name, await createInitialContext(def, pkg, 0, {}));

    const importedPackageRef = new PackageReference(config.source).fullPackageRef;

    // index: packages depending on/depended upon by package
    addHexastoreToBatch(batch, rkey.RKEY_PACKAGE_RELATION, packageRef, 'imports', importedPackageRef);

    // index: step counter
    batch.incr(`${rkey.RKEY_COUNTER_STEP_TYPE_PREFIX}:provision`);

    await batch.exec();
  },
  import: async (
    redis: ActualRedisClientType,
    state: StepState,
    def: ChainDefinition,
    pkg: any,
    packageRef: string,
    name: string
  ) => {
    const batch = redis.multi();

    const config = def.getConfig(name, await createInitialContext(def, pkg, 0, {}));

    const importedPackageRef = new PackageReference(config.source).fullPackageRef;

    // index: packages depending on/depended upon by package
    addHexastoreToBatch(batch, rkey.RKEY_PACKAGE_RELATION, packageRef, 'imports', importedPackageRef);

    // index: step counter
    batch.incr(`${rkey.RKEY_COUNTER_STEP_TYPE_PREFIX}:import`);

    await batch.exec();
  },
};

export async function notify(rawPackageRef: string, chainId: number) {
  const packageRef = new PackageReference(rawPackageRef);
  if (packageRef.version === 'latest') {
    return;
  }
  const notifyPkgs = _.chunk((process.env.NOTIFY_PKGS || '').split(','), 2);
  const notifyPkg = notifyPkgs.find((n) => n[0] === packageRef.name);
  if (notifyPkg) {
    // send notification for this built package
    if (notifyPkg[1].includes('discord.com')) {
      return fetch(notifyPkg[1], {
        method: 'POST',
        body: JSON.stringify({
          content: `**${packageRef.fullPackageRef}** on **${
            viem.extractChain({ chains, id: chainId })?.name || `unknown chain (${chainId})`
          }** was published`,
          embeds: [
            {
              title: packageRef.fullPackageRef,
              description: 'Package published',
              url: `https://usecannon.com/packages/${packageRef.name}/${packageRef.version}/${chainId}-${packageRef.preset}`,
            },
          ],
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  }
}

export async function handleCannonPublish(
  ctx: CannonStorage,
  redis: ActualRedisClientType,
  publishEvent: viem.Log & { args: { [name: string]: any } },
  packageRef: string,
  chainId: number,
  timestamp: number
) {
  const deployInfo = (await ctx.readBlob(publishEvent.args.deployUrl)) as DeploymentInfo;

  await redis.hSet(`${rkey.RKEY_PACKAGE_SEARCHABLE}:${packageRef}#${chainId}`, {
    miscUrl: deployInfo.miscUrl,
  });

  await redis.hSet(rkey.RKEY_URL_TO_PACKAGE, {
    [deployInfo.miscUrl]: packageRef,
  });

  const def = new ChainDefinition(deployInfo.def);

  for (const actionName of def.topologicalActions) {
    const [type] = actionName.split('.');

    if (recordDeployStep[type]) {
      try {
        await recordDeployStep[type](redis, deployInfo.state[actionName], def, deployInfo.meta, packageRef, actionName);
      } catch (err) {
        console.log(`[warn] failed special handler for ${type} on action ${actionName}: ${err?.toString && err.toString()}`);
      }
    } else {
      const batch = redis.multi();
      const state = deployInfo.state[actionName];

      // index: transaction/address resolve to package
      if (state) {
        // TODO: validate that this package is the authoritative source for all things
        for (const [contractName, contract] of Object.entries(state.artifacts.contracts || {})) {
          // note: have to deal with chain id here
          batch.zAdd(
            rkey.RKEY_ADDRESS_TO_PACKAGE,
            { score: timestamp, value: `${contract.address.toLowerCase()}:${chainId}` },
            { NX: true }
          );

          batch.hSetNX(rkey.RKEY_ADDRESS_TO_PACKAGE + ':' + chainId, contract.address.toLowerCase(), packageRef);

          if (contract.deployTxnHash) {
            // note: we dont include chainId in the index here because transaction ids are almost always unique
            batch.hSetNX(rkey.RKEY_TRANSACTION_TO_PACKAGE, contract.deployTxnHash, packageRef);
            batch.ts.incrBy(`${rkey.RKEY_TS_TRANSACTION_COUNT}:${chainId}`, 1, {
              TIMESTAMP: timestamp - (timestamp % 3600000),
              LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_TRANSACTION_COUNT },
            });
          }
          batch.ts.incrBy(`${rkey.RKEY_TS_CONTRACT_COUNT}:${chainId}`, 1, {
            TIMESTAMP: timestamp - (timestamp % 3600000),
            LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_CONTRACT_COUNT },
          });

          // process the contract abi as well
          for (const abiItem of contract.abi) {
            if (abiItem.type === 'function' || abiItem.type === 'error') {
              const functionHash = viem.toFunctionHash(abiItem as viem.AbiFunction);
              const selector = functionHash.slice(0, 10);
              const functionSignature = viem.toFunctionSignature(abiItem as viem.AbiFunction);

              const abiSearchKey = `${rkey.RKEY_ABI_SEARCHABLE}:${chainId}:${contract.address}:${functionSignature}`;
              batch.hSetNX(abiSearchKey, 'name', functionSignature);
              batch.hSetNX(abiSearchKey, 'selector', selector);
              batch.hSetNX(abiSearchKey, 'type', abiItem.type);
              batch.hSetNX(abiSearchKey, 'package', packageRef);
              batch.hSetNX(abiSearchKey, 'address', contract.address.toLowerCase());
              batch.hSetNX(abiSearchKey, 'contractName', contractName);
              batch.hSetNX(abiSearchKey, 'chainId', chainId.toString());
              batch.hSetNX(abiSearchKey, 'timestamp', Math.floor(timestamp / 1000).toString());
            }
          }
        }
        for (const txn of Object.values(state.artifacts.txns || {})) {
          batch.hSetNX(rkey.RKEY_TRANSACTION_TO_PACKAGE, txn.hash, packageRef);
          batch.ts.incrBy(`${rkey.RKEY_TS_TRANSACTION_COUNT}:${chainId}`, 1, {
            TIMESTAMP: timestamp - (timestamp % 3600000),
            LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_TRANSACTION_COUNT },
          });
        }
        batch.incr(`${rkey.RKEY_COUNTER_STEP_TYPE_PREFIX}:${type}`);
      } else {
        console.log('[warn] step data not found:', actionName);
      }

      await batch.exec();
    }
  }

  try {
    await notify(packageRef, chainId);
  } catch (err) {
    console.error('[warn] notify failed:', err);
  }
}

export async function createIndexesIfNedeed(redis: RedisClientType) {
  if (!(await redis.ft._list()).length) {
    console.log('[REG] create index', rkey.RKEY_PACKAGE_SEARCHABLE);
    await redis.ft.create(
      rkey.RKEY_PACKAGE_SEARCHABLE,
      {
        name: { type: SchemaFieldTypes.TEXT, NOSTEM: true },
        type: { type: SchemaFieldTypes.TAG },
        timestamp: { type: SchemaFieldTypes.NUMERIC, SORTABLE: true },
        chainId: { type: SchemaFieldTypes.TAG },
      },
      { PREFIX: rkey.RKEY_PACKAGE_SEARCHABLE + ':' }
    );

    await redis.ft.alter(rkey.RKEY_PACKAGE_SEARCHABLE, {
      name: { type: SchemaFieldTypes.TAG, AS: 'exactName' },
    });

    console.log('[REG] create index', rkey.RKEY_ABI_SEARCHABLE);
    await redis.ft.create(
      rkey.RKEY_ABI_SEARCHABLE,
      {
        name: { type: SchemaFieldTypes.TEXT, NOSTEM: true },
        contractName: { type: SchemaFieldTypes.TEXT, NOSTEM: true },
        selector: { type: SchemaFieldTypes.TAG },
        address: { type: SchemaFieldTypes.TAG },
        chainId: { type: SchemaFieldTypes.TAG },
        timestamp: { type: SchemaFieldTypes.NUMERIC, SORTABLE: true },
      },
      { PREFIX: rkey.RKEY_ABI_SEARCHABLE + ':' }
    );
  }
}

export async function getNewEvents(
  client: viem.PublicClient,
  registryChainId: number,
  redis: RedisClientType,
  registryContract: any
) {
  const currentBlock = Number(await client.getBlockNumber()) - 5;
  const lastIndexedBlock =
    Number(await redis.get(rkey.RKEY_LAST_IDX + ':' + registryChainId)) ||
    START_IDS[registryChainId.toString() as keyof typeof START_IDS];
  if (lastIndexedBlock === currentBlock) {
    const lastBlockTimestamp = Number((await client.getBlock({ blockNumber: BigInt(lastIndexedBlock) })).timestamp);
    return { scanToBlock: lastIndexedBlock, currentBlock, scanToTimestamp: lastBlockTimestamp, events: [] };
  }

  const parsableEvents = [
    viem.getAbiItem({ abi: registryContract.abi, name: 'PackagePublishWithFee' }) as any,
    viem.getAbiItem({ abi: registryContract.abi, name: 'TagPublish' }) as any,
    viem.getAbiItem({ abi: registryContract.abi, name: 'PackageUnpublish' }) as any,
    viem.getAbiItem({ abi: registryContract.abi, name: 'PackageOwnerChanged' }) as any,
    viem.getAbiItem({ abi: registryContract.abi, name: 'PackagePublishersChanged' }) as any,
    // legacy event
    LEGACY_PACKAGE_PUBLISH_EVENT,
  ];

  const scanToBlock = BigInt(Math.min(currentBlock, lastIndexedBlock + BLOCK_BATCH_SIZE));
  const logs = await client.getLogs({
    address: registryContract.address,
    events: parsableEvents,
    fromBlock: BigInt(lastIndexedBlock),
    toBlock: scanToBlock,
  });

  const events: (viem.Log & { timestamp?: number; chainId?: number })[] = viem.parseEventLogs({
    abi: parsableEvents,
    logs,
  });

  for (const event of events) {
    event.timestamp = Number((await client.getBlock({ blockNumber: event.blockNumber! })).timestamp);
    event.chainId = registryChainId;
  }

  const lastBlockTimestamp = Number((await client.getBlock({ blockNumber: scanToBlock })).timestamp);

  return { scanToBlock: Number(scanToBlock), currentBlock, scanToTimestamp: lastBlockTimestamp, events };
}

export async function scanChain(mainnetClient: viem.PublicClient, optimismClient: viem.PublicClient, registryContract: any) {
  const redis = createClient({ url: process.env.REDIS_URL! });
  redis.on('error', (err: any) => console.error('redis error:', err));
  await redis.connect();
  await createIndexesIfNedeed(redis as any);

  const storageCtx = new CannonStorage(
    new OnChainRegistry({ address: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba', provider: optimismClient }),
    {
      // shorter than usual timeout becuase we need to move on if its not resolving well
      ipfs: new IPFSLoader(process.env.IPFS_URL!, {}, 15000),
    }
  );

  let consecutiveFailures = 0;
  while (consecutiveFailures < MAX_FAIL) {
    try {
      const [mainnetScan, optimismScan] = await Promise.all([
        await getNewEvents(mainnetClient, 1, redis as RedisClientType, registryContract),
        await getNewEvents(optimismClient, 10, redis as RedisClientType, registryContract),
      ]);

      if (mainnetScan.scanToBlock === mainnetScan.currentBlock && optimismScan.scanToBlock === optimismScan.currentBlock) {
        console.log('[REG] checking indexes');
        await createIndexesIfNedeed(redis as any);
        await sleep(12000); // mainnet block time (optimism can wait a little)
      }

      // remove any events older than the latest block scanned on either chain
      const earliestScanTime = Math.min(mainnetScan.scanToTimestamp, optimismScan.scanToTimestamp);

      const [usableEvents, unusableEvents] = _.partition(
        [...mainnetScan.events, ...optimismScan.events],
        (e) => e.timestamp! < earliestScanTime
      );

      // add any events from process later events that may exist
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const e = await redis.lPop(rkey.RKEY_PROCESS_LATER_EVENTS);
        if (!e) {
          break;
        }

        const parsedEvent = JSON.parse(e);

        if (parsedEvent.timestamp < earliestScanTime) {
          usableEvents.push(parsedEvent);
        } else {
          // put the event back
          await redis.lPush(rkey.RKEY_PROCESS_LATER_EVENTS, e);
          break;
        }
      }

      if (unusableEvents.length) {
        console.log('[REG] push to later events:', unusableEvents.length);
        await redis.rPush(
          rkey.RKEY_PROCESS_LATER_EVENTS,
          unusableEvents.map((v) => JSON.stringify(v))
        );
      } else {
        console.log('[REG] no push later events');
      }

      console.log('[REG] process events', usableEvents.length);
      console.log('[REG] eth scan', new Date(mainnetScan.scanToTimestamp * 1000), mainnetScan.scanToBlock);
      console.log('[REG] opt scan', new Date(optimismScan.scanToTimestamp * 1000), optimismScan.scanToBlock);

      // for now process logs sequentially. In the future this could be paralellized
      for (const event of _.sortBy(usableEvents, 'timestamp') as any[]) {
        try {
          const variant = viem.hexToString(event.args.variant || '0x', { size: 32 });
          const [chainId, preset] = parseVariant(variant);

          const packageRef = `${viem.hexToString(event.args.name, { size: 32 })}:${viem.hexToString(event.args.tag || '0x', {
            size: 32,
          })}@${preset}`;

          const feePaid = event.args.feePaid || 0n;

          const batch = redis.multi();
          switch (event.eventName) {
            case 'PackagePublish':
            case 'PackagePublishWithFee':
              // general package name list: used for finding packages by name
              batch.hSet(`${rkey.RKEY_PACKAGE_SEARCHABLE}:${packageRef}#${chainId}`, {
                name: viem.hexToString(event.args.name, { size: 32 }),
                version: viem.hexToString(event.args.tag, { size: 32 }),
                preset,
                chainId: chainId,
                type: 'package',
                deployUrl: event.args.deployUrl,
                metaUrl: event.args.metaUrl,
                owner: event.args.owner,
                timestamp: event.timestamp,
                feePaid: event.feePaid || 0,
              });

              batch.hSet(rkey.RKEY_URL_TO_PACKAGE, {
                [event.args.deployUrl]: packageRef,
                [event.args.metaUrl]: packageRef,
              });

              batch.ts.incrBy(`${rkey.RKEY_TS_PACKAGE_COUNT}:${chainId}`, 1, {
                TIMESTAMP: (event.timestamp - (event.timestamp % 3600)) * 1000,
                LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_PACKAGE_COUNT },
              });

              batch.zAdd(rkey.RKEY_FEES_PAID, {
                score: event.timestamp * 1000,
                value: `${event.args.deployUrl}#${packageRef}#${feePaid.toString()}`,
              });
              batch.zAdd(rkey.RKEY_FEES_PAID, {
                score: event.timestamp * 1000,
                value: `${event.args.metaUrl}#${packageRef}#${feePaid.toString()}`,
              });
              batch.incrBy(rkey.RKEY_FEES_PAID + ':total', feePaid);
              batch.ts.incrBy(`${rkey.RKEY_TS_FEES_PAID}:${chainId}`, 1, {
                TIMESTAMP: (event.timestamp - (event.timestamp % 3600)) * 1000,
                LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_FEES_PAID },
              });

              batch.set(rkey.RKEY_LAST_UPDATED + ':' + event.chainId, event.timestamp);

              await batch.exec();

              // we don't want to process package publish if the priority chain (optimism) already published
              // (conversely we want optimism deployment to overwrite anything on the mainnet deployment)
              // effectively we would have to treat the mainnet as unpublished and therefore remove data
              // TODO
              /*if (
                event.chainId === 10 ||
                (await redis.zScore(rkey.RKEY_PACKAGE_NAMES, `${packageRef}#${chainId}#10`)) === null
              ) {*/
              console.log(
                `[REG] processing package publish (registry ${event.chainId}):`,
                packageRef,
                chainId,
                event.transactionHash
              );
              // TODO: event types here are dumb
              await handleCannonPublish(storageCtx, redis, event as any, packageRef, chainId, event.timestamp * 1000);
              //}

              break;
            case 'TagPublish':
              await redis.hSet(`${rkey.RKEY_PACKAGE_SEARCHABLE}:${packageRef}#${chainId}`, {
                name: viem.hexToString(event.args.name, { size: 32 }),
                tag: viem.hexToString(event.args.tag, { size: 32 }),
                preset,
                chainId,
                versionOfTag: viem.hexToString(event.args.versionOfTag, { size: 32 }),
                type: 'tag',
                timestamp: event.timestamp,
              });
              break;
            case 'PackageOwnerChanged':
              await redis.hSet(rkey.RKEY_PACKAGE_OWNERS, viem.hexToString(event.args.name, { size: 32 }), event.args.owner);
              break;
            case 'PackagePublishersChanged':
              await redis.hSet(
                rkey.RKEY_PACKAGE_PUBLISHERS + ':' + chainId,
                viem.hexToString(event.args.name, { size: 32 }),
                event.args.publisher.join(' ')
              );
              break;
            case 'PackageUnpublish':
              // remove this package ref from the zindex
              // removal from the zindex is enough to constitute that its removed for all intents and purposes
              // unpublishes are generally very rare so we don't want to put a ton of effort into it
              console.log(
                `[REG] unpublished package (registry ${event.chainId}):`,
                packageRef,
                chainId,
                event.transactionHash
              );

              await redis.del(`${rkey.RKEY_PACKAGE_SEARCHABLE}:${packageRef}#${chainId}`);

              // TODO: search for tags that depend on this key and delete them as well

              break;
            default:
              console.error('unrecognized event:', event);
              process.exit(1);
          }
        } catch (err) {
          console.log('[REG] failure parsing', event, err);
          // process this package later
          await redis.lPush(rkey.RKEY_RETRY_PROCESS_PACKAGE, JSON.stringify(event));
        }
      }

      await redis.set(rkey.RKEY_LAST_IDX + ':' + 1, mainnetScan.scanToBlock);
      await redis.set(rkey.RKEY_LAST_IDX + ':' + 10, optimismScan.scanToBlock);
      consecutiveFailures = 0;
    } catch (err) {
      console.error('failure while scanning cannon publishes:', err);
      consecutiveFailures++;
    }

    // prevent thrashing
    await sleep(250);
  }
}

export async function loop() {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL required environment variable is not defined');
  }
  if (!process.env.IPFS_URL) {
    throw new Error('IPFS_URL required environment variable is not defined');
  }
  if (!process.env.MAINNET_PROVIDER_URL) {
    throw new Error('MAINNET_PROVIDER_URL required environment variable is not defined');
  }
  if (!process.env.OPTIMISM_PROVIDER_URL) {
    throw new Error('OPTIMISM_PROVIDER_URL required environment variable is not defined');
  }

  const mainnetClient = viem.createPublicClient({ chain: mainnet, transport: viem.http(process.env.MAINNET_PROVIDER_URL) });
  const optimismClient = viem.createPublicClient({
    chain: optimism,
    transport: viem.http(process.env.OPTIMISM_PROVIDER_URL),
  });

  const storageCtx = new CannonStorage(
    new OnChainRegistry({ address: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba', provider: optimismClient as any }),
    {
      // shorter than usual timeout becuase we need to move on if its not resolving well
      ipfs: new IPFSLoader(process.env.IPFS_URL!, {}, 15000),
    }
  );

  console.log('fetching registry contract...');

  const registryContract = await getCannonContract({
    storage: storageCtx,
    package: 'registry',
    contractName: 'Proxy',
    chainId: 10,
  });

  console.log('start scan loop');
  await scanChain(mainnetClient, optimismClient as any, registryContract);

  console.error('error limit exceeded');
  process.exit(1);
}
