"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanUnregisteredIpfs = void 0;
const lodash_1 = __importDefault(require("lodash"));
const ipfs_1 = require("@usecannon/builder/dist/ipfs");
const db_1 = require("./db");
const indexer_1 = require("@usecannon/indexer");
async function cleanUnregisteredIpfs(ipfsUrl, gracePeriod, minFees) {
    const now = Math.floor(Date.now() / 1000);
    const rdb = await (0, db_1.getDb)(process.env.REDIS_URL);
    const indexerRdb = await (0, db_1.getDb)(process.env.INDEXER_URL);
    console.log('[init] clean cycle');
    const expired = await rdb.zRangeWithScores(db_1.RKEY_FRESH_UPLOAD_HASHES, 0, now - gracePeriod, { BY: 'SCORE' });
    for (const artifact of expired) {
        const readBatch = indexerRdb.multi();
        readBatch.get(indexer_1.RKEY_LAST_UPDATED);
        readBatch.zRange(indexer_1.RKEY_FEES_PAID, artifact.value, '+', { LIMIT: { offset: 0, count: 1 } });
        const [indexerLastUpdated, feesRecord] = (await readBatch.exec());
        if (indexerLastUpdated < artifact.score) {
            // artifact cannot be calculated yet, because we havent scanned that far on-chain
            continue;
        }
        const [urlRef, , feePaid] = feesRecord.split('#');
        const ipfsHash = lodash_1.default.last(urlRef.split('://'));
        if (BigInt(feePaid) > lodash_1.default.sortedIndexBy(minFees, { startTimestamp: artifact.score, requiredFee: 0n }, 'score')) {
            console.log(`[keep] ${artifact.value}`);
            try {
                // TODO: also keep the misc url
                const miscUrl = JSON.parse(await (0, ipfs_1.readIpfs)(ipfsUrl, ipfsHash, {}, false, 10000, 0)).miscUrl;
                const miscIpfsHash = lodash_1.default.last(miscUrl.split('://'));
                const batch = rdb.multi();
                batch.zAdd(db_1.RKEY_PKG_HASHES, { score: artifact.score, value: ipfsHash });
                batch.zRem(db_1.RKEY_FRESH_UPLOAD_HASHES, miscIpfsHash);
                batch.zAdd(db_1.RKEY_EXTRA_HASHES, { score: artifact.score, value: miscIpfsHash });
                await batch.exec();
            }
            catch (err) {
                console.log(`[fail] did not keep upload hash: ${err}`);
            }
        }
        else {
            console.log(`[wipe] ${artifact.value}`);
            try {
                await (0, ipfs_1.deleteIpfs)(ipfsUrl, ipfsHash, {}, false, 10000);
            }
            catch (err) {
                console.log(`[fail] did not delete upload hash: ${err}`);
                continue;
            }
        }
        await rdb.zRem(db_1.RKEY_FRESH_UPLOAD_HASHES, artifact.value);
    }
    console.log('[done] clean cycle');
}
exports.cleanUnregisteredIpfs = cleanUnregisteredIpfs;
//# sourceMappingURL=cleaner.js.map