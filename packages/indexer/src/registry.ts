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
} from '@usecannon/builder';
import { createClient, RedisClientType } from 'redis';
/* eslint no-console: "off" */
import * as viem from 'viem';
import * as viemChains from 'viem/chains';
import { mainnet } from 'viem/chains';

import * as rkey from './db';

const BLOCK_BATCH_SIZE = 5000;

const MAX_FAIL = 3;

type ActualRedisClientType = ReturnType<typeof createClient>;

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
  client: viem.PublicClient,
  redis: ActualRedisClientType,
  publishEvent: viem.Log & { args: { [name: string]: any } },
  packageRef: string,
  chainId: number,
  timestamp: number
) {
  const deployInfo = (await ctx.readBlob(publishEvent.args.deployUrl)) as DeploymentInfo;

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
        for (const contract of Object.values(state.artifacts.contracts || {})) {
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

              batch.zAdd(rkey.RKEY_SELECTOR_LIST + ':' + abiItem.type, {
                value: `${selector}:${timestamp}:${functionSignature}`,
                score: 1,
              });
              batch.zAdd(
                rkey.RKEY_SELECTOR_CONTRACT + ':' + abiItem.type,
                [
                  { score: timestamp, value: `${contract.address.toLowerCase()}:${functionSignature}` },
                  { score: timestamp, value: `${functionSignature}:${contract.address.toLowerCase()}` },
                ],
                { NX: true }
              );
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

  const redis = createClient({ url: process.env.REDIS_URL! });
  const client = viem.createPublicClient({ chain: mainnet, transport: viem.http(process.env.MAINNET_PROVIDER_URL) });

  redis.on('error', (err: any) => console.error('redis error:', err));

  await redis.connect();

  const storageCtx = new CannonStorage(
    new OnChainRegistry({ address: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba', provider: client as any }),
    {
      // shorter than usual timeout becuase we need to move on if its not resolving well
      ipfs: new IPFSLoader(process.env.IPFS_URL!, {}, 45000),
    }
  );

  const registryContract = await getCannonContract({
    storage: storageCtx,
    package: 'registry',
    contractName: 'Proxy',
    chainId: 1,
  });

  let consecutiveFailures = 0;
  while (consecutiveFailures < MAX_FAIL) {
    try {
      const currentBlock = Number(await client.getBlockNumber()) - 5;
      const lastIndexedBlock = Number(await redis.get(rkey.RKEY_LAST_IDX)) || 16490000;
      if (lastIndexedBlock === currentBlock) {
        await sleep(12000); // ethereum block time
        continue;
      }

      console.log('[REG] scan block', lastIndexedBlock, Math.min(lastIndexedBlock + BLOCK_BATCH_SIZE, currentBlock));

      const logs = await client.getLogs({
        address: registryContract.address,
        event: viem.getAbiItem({ abi: registryContract.abi, name: 'PackagePublish' }) as any,
        fromBlock: BigInt(lastIndexedBlock),
        toBlock: BigInt(Math.min(currentBlock, lastIndexedBlock + BLOCK_BATCH_SIZE)),
      });

      // for now process logs sequentially. In the future this could be paralellized
      const events: any[] = viem.parseEventLogs({ abi: registryContract.abi, eventName: 'PackagePublish', logs });
      for (const event of events) {
        try {
          const packageRef = `${viem.hexToString(event.args.name, { size: 32 })}:${viem.hexToString(event.args.tag, {
            size: 32,
          })}@${viem.hexToString(event.args.variant, { size: 32 }).split('-')[1]}`;
          const chainId = parseInt(viem.hexToString(event.args.variant, { size: 32 }).split('-')[0]);
          const feePaid = event.args.feePaid || 0n;

          // most redis time primitives expect millisecond timestamp
          const timestamp = Number((await client.getBlock({ blockNumber: event.blockNumber })).timestamp) * 1000;
          const batch = redis.multi();

          // index: list of all package names, sorted set for easy resolution/querying
          // timestamp is set as the score so we can easily get the "last package published" or between any date range
          batch.zAdd(`${rkey.RKEY_PACKAGE_NAMES}`, { score: timestamp, value: packageRef + '#' + chainId });
          batch.ts.incrBy(`${rkey.RKEY_TS_PACKAGE_COUNT}:${chainId}`, 1, {
            TIMESTAMP: timestamp - (timestamp % 3600000),
            LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_PACKAGE_COUNT },
          });

          batch.zAdd(rkey.RKEY_FEES_PAID, {
            score: timestamp,
            value: `${event.args.deployUrl}#${packageRef}#${feePaid.toString()}`,
          });
          batch.zAdd(rkey.RKEY_FEES_PAID, {
            score: timestamp,
            value: `${event.args.metaUrl}#${packageRef}#${feePaid.toString()}`,
          });
          batch.incrBy(rkey.RKEY_FEES_PAID, feePaid);
          batch.ts.incrBy(`${rkey.RKEY_TS_FEES_PAID}:${chainId}`, 1, {
            TIMESTAMP: timestamp - (timestamp % 3600000),
            LABELS: { chainId: `${chainId}`, kind: rkey.RKEY_TS_FEES_PAID },
          });

          batch.set(rkey.RKEY_LAST_UPDATED, timestamp);

          await batch.exec();

          console.log('[REG] processing package publish:', packageRef, chainId, event.transactionHash);
          // TODO: event types here are dumb
          await handleCannonPublish(storageCtx, client, redis, event as any, packageRef, chainId, timestamp);
        } catch (err) {
          console.log('[REG] failure parsing', event, err);
          // process this package later
          await redis.lPush(rkey.RKEY_RETRY_PROCESS_PACKAGE, JSON.stringify(event));
        }
      }

      await redis.set(rkey.RKEY_LAST_IDX, Math.min(currentBlock, lastIndexedBlock + BLOCK_BATCH_SIZE));
      consecutiveFailures = 0;
    } catch (err) {
      console.error('failure while scannong cannon publishes:', err);
      consecutiveFailures++;
    }

    // prevent thrashing
    await sleep(250);
  }
  console.error('error limit exceeded');
  process.exit(1);
}
