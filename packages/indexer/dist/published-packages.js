"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loop = exports.handleCannonPublish = void 0;
/* eslint no-console: "off" */
const viem = __importStar(require("viem"));
const chains_1 = require("viem/chains");
const redis_1 = require("redis");
const builder_1 = require("@usecannon/builder");
const RKEY_LAST_IDX = 'reg:lastBlock';
const RKEY_ADDRESS_TO_PACKAGE = 'reg:addressToPackage';
const RKEY_TRANSACTION_TO_PACKAGE = 'reg:transactionToPackage';
const RKEY_PACKAGE_RELATION = 'reg:packageRelation';
const RKEY_RETRY_PROCESS_PACKAGE = 'reg:retryPackage';
const RKEY_COUNTER_STEP_TYPE_PREFIX = 'reg:counter:';
const RKEY_PACKAGE_NAMES = 'reg:packages';
const BLOCK_BATCH_SIZE = 5000;
const MAX_FAIL = 3;
function addHexastoreToBatch(batch, relationKey, subject, predicate, object) {
    batch.zAdd(relationKey, [
        { score: 0, value: `spo:${subject}:${predicate}:${object}` },
        { score: 0, value: `sop:${subject}:${object}:${predicate}` },
        { score: 0, value: `ops:${object}:${predicate}:${subject}` },
        { score: 0, value: `osp:${object}:${subject}:${predicate}` },
        { score: 0, value: `pso:${predicate}:${subject}:${object}` },
        { score: 0, value: `pos:${predicate}:${object}:${subject}` },
    ]);
}
const recordDeployStep = {
    contract: async (redis, state, def, packageRef) => {
        const batch = redis.multi();
        // index: contract address to package
        // TODO: validate that this package is the authoritative source for all things
        // a major point of validation is 1) its the first, and 2) the contract source code, when compiled, matches up
        // tho these steps on their own are not 100% certainty since another person could frontrun
        batch.hSet(RKEY_ADDRESS_TO_PACKAGE, Object.values(state.artifacts.contracts)[0].address, packageRef);
        // TODO: index function/event/error signatures
        // index: step counter
        batch.incr(`${RKEY_COUNTER_STEP_TYPE_PREFIX}:contract`);
        await batch.exec();
    },
    router: async (redis, state, def, packageRef) => {
        const batch = redis.multi();
        // index: transaction to package
        // TODO: validate that this package is the authoritative source for all things
        batch.hSet(RKEY_ADDRESS_TO_PACKAGE, Object.values(state.artifacts.contracts)[0].hash, packageRef);
        // index: step counter
        batch.incr(`${RKEY_COUNTER_STEP_TYPE_PREFIX}:router`);
        await batch.exec();
    },
    invoke: async (redis, state, def, packageRef) => {
        const batch = redis.multi();
        // index: transaction to package
        // TODO: validate that this package is the authoritative source for all things
        batch.hSet(RKEY_TRANSACTION_TO_PACKAGE, Object.values(state.artifacts.txns)[0].hash, packageRef);
        // index: step counter
        batch.incr(`${RKEY_COUNTER_STEP_TYPE_PREFIX}:invoke`);
        await batch.exec();
    },
    provision: async (redis, state, def, packageRef, name) => {
        const batch = redis.multi();
        const config = def.getConfig(name, {});
        const importedPackageRef = new builder_1.PackageReference(config.source).fullPackageRef;
        // index: packages depending on/depended upon by package
        addHexastoreToBatch(batch, RKEY_PACKAGE_RELATION, packageRef, 'imports', importedPackageRef);
        // index: step counter
        batch.incr(`${RKEY_COUNTER_STEP_TYPE_PREFIX}:provision`);
        await batch.exec();
    },
    import: async (redis, state, def, packageRef, name) => {
        const batch = redis.multi();
        const config = def.getConfig(name, {});
        const importedPackageRef = new builder_1.PackageReference(config.source).fullPackageRef;
        // index: packages depending on/depended upon by package
        addHexastoreToBatch(batch, RKEY_PACKAGE_RELATION, packageRef, 'imports', importedPackageRef);
        // index: step counter
        batch.incr(`${RKEY_COUNTER_STEP_TYPE_PREFIX}:import`);
        await batch.exec();
    },
};
async function handleCannonPublish(ctx, client, redis, publishEvent, packageRef) {
    const deployInfo = (await ctx.readBlob(publishEvent.args.deployUrl));
    const def = new builder_1.ChainDefinition(deployInfo.def);
    for (const actionName of def.topologicalActions) {
        const [type] = actionName.split(':');
        if (recordDeployStep[type]) {
            await recordDeployStep[type](redis, deployInfo.state[actionName], def, packageRef, actionName);
        }
    }
}
exports.handleCannonPublish = handleCannonPublish;
async function loop() {
    if (!process.env.REDIS_URL) {
        throw new Error('REDIS_URL required environment variable is not defined');
    }
    if (!process.env.IPFS_URL) {
        throw new Error('IPFS_URL required environment variable is not defined');
    }
    if (!process.env.MAINNET_PROVIDER_URL) {
        throw new Error('MAINNET_PROVIDER_URL required environment variable is not defined');
    }
    const redis = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
    const client = viem.createPublicClient({ chain: chains_1.mainnet, transport: viem.http(process.env.MAINNET_PROVIDER_URL) });
    redis.on('error', (err) => console.error('redis error:', err));
    await redis.connect();
    const storageCtx = new builder_1.CannonStorage(new builder_1.OnChainRegistry({ address: '0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba', provider: client }), {
        ipfs: new builder_1.IPFSLoader(process.env.IPFS_LOADER),
    });
    const registryContract = await (0, builder_1.getCannonContract)({ storage: storageCtx, package: 'registry', contractName: 'Proxy' });
    let consecutiveFailures = 0;
    while (consecutiveFailures < MAX_FAIL) {
        try {
            const lastIndexedBlock = Number(await redis.get(RKEY_LAST_IDX)) || 15000000;
            console.log('[REG] scan block', lastIndexedBlock, lastIndexedBlock + BLOCK_BATCH_SIZE);
            const logs = await client.getLogs({
                address: registryContract.address,
                event: viem.getAbiItem({ abi: registryContract.abi, name: 'PackagePublish' }),
                fromBlock: BigInt(lastIndexedBlock),
                toBlock: BigInt(lastIndexedBlock + BLOCK_BATCH_SIZE),
            });
            // for now process logs sequentially. In the future this could be paralellized
            const events = viem.parseEventLogs({ abi: registryContract.abi, eventName: 'PackagePublish', logs });
            for (const event of events) {
                try {
                    const packageRef = `${event.name}:${event.tag}@${event.variant.split('-')[1]}`;
                    //const chainId = log.variant.split('-')[0];
                    const batch = redis.multi();
                    // index: list of all package names, sorted set for easy resolution/querying
                    batch.zAdd(`${RKEY_PACKAGE_NAMES}`, { score: 0, value: packageRef });
                    await batch.exec();
                    console.log('[REG] processing package publish:', event.args);
                    // TODO: event types here are dumb
                    await handleCannonPublish(storageCtx, client, redis, event, packageRef);
                }
                catch (err) {
                    // process this package later
                    await redis.lPush(RKEY_RETRY_PROCESS_PACKAGE, JSON.stringify(event));
                }
            }
            await redis.set(RKEY_LAST_IDX, lastIndexedBlock + BLOCK_BATCH_SIZE);
            consecutiveFailures = 0;
        }
        catch (err) {
            console.error('failure while scannong cannon publishes:', err);
            consecutiveFailures++;
        }
        console.error('error limit exceeded');
        process.exit(1);
    }
}
exports.loop = loop;
//# sourceMappingURL=published-packages.js.map