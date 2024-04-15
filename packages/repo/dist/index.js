"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const connect_busboy_1 = __importDefault(require("connect-busboy"));
const pako_1 = __importDefault(require("pako"));
const consumers_1 = __importDefault(require("stream/consumers"));
const typestub_ipfs_only_hash_1 = __importDefault(require("typestub-ipfs-only-hash"));
const db_1 = require("./db");
const RKEY_FRESH_GRACE_PERIOD = 5 * 60; // 5 minutes, or else we delete any uploaded artifacts from fresh
if (!process.env.REDIS_URL) {
    throw new Error('please set REDIS_URL');
}
if (!process.env.UPSTREAM_IPFS_URL) {
    throw new Error('please set UPSTREAM_IPFS_URL');
}
const app = (0, express_1.default)();
const port = process.env.PORT || '3000';
const upstreamIpfs = process.env.UPSTREAM_IPFS_URL;
app.use((0, morgan_1.default)('short'));
app.use((0, connect_busboy_1.default)({ immediate: true }));
app.post('/api/v0/add', async (req, res) => {
    // check to ensure the uploaded artifact is a cannon package
    if (req.busboy) {
        let fileReceived = false;
        req.busboy.on('file', async (_name, stream) => {
            fileReceived = true;
            // compute resulting IPFS hash from the uploaded data
            const rawData = await consumers_1.default.buffer(stream);
            const ipfsHash = await typestub_ipfs_only_hash_1.default.of(rawData);
            const now = Math.floor(Date.now() / 1000) + RKEY_FRESH_GRACE_PERIOD;
            const rdb = await (0, db_1.getDb)(process.env.REDIS_URL);
            let isSavable = (await rdb.zScore(db_1.RKEY_FRESH_UPLOAD_HASHES, ipfsHash)) !== null ||
                (await rdb.zScore(db_1.RKEY_PKG_HASHES, ipfsHash)) !== null;
            // if IPFS hash is not already allowed, lets see if this is a cannon package
            if (!isSavable) {
                try {
                    const pkgData = JSON.parse(pako_1.default.inflate(rawData, { to: 'string' }));
                    //const def = new ChainDefinition(pkgData.def);
                    // package is valid. Add to upload hashes
                    isSavable = true;
                    const miscIpfsHash = lodash_1.default.last(pkgData.miscUrl.split('://'));
                    // as a special step here, we also save the misc url (we dont want to save it anywhere else)
                    await rdb.zAdd(db_1.RKEY_FRESH_UPLOAD_HASHES, { score: now, value: miscIpfsHash }, { NX: true });
                }
                catch (err) {
                    // pkg is not savable
                    console.log('cannon package reading fail', err);
                    return res.status(400).end('does not appear to be cannon package');
                }
            }
            if (isSavable) {
                // ensure the file is marked as a fresh upload
                await rdb.zAdd(db_1.RKEY_FRESH_UPLOAD_HASHES, { score: now, value: ipfsHash }, { NX: true });
                // TODO: do we need to sanitize the upstream upload ipfs url?
                await fetch(upstreamIpfs + req.url, {
                    method: 'POST',
                    body: req.body,
                });
            }
        });
        req.busboy.on('finish', () => {
            if (!fileReceived) {
                res.status(400).end('no upload data');
            }
        });
    }
    else {
        res.status(400).end('no upload data');
    }
});
app.post('/api/v0/get', async (req, res) => {
    const ipfsHash = req.query.arg;
    // if the IPFS hash is in our database, go ahead and proxy the request
    const rdb = await (0, db_1.getDb)(process.env.REDIS_URL);
    const batch = rdb.multi();
    batch.zScore(db_1.RKEY_FRESH_UPLOAD_HASHES, ipfsHash);
    batch.zScore(db_1.RKEY_PKG_HASHES, ipfsHash);
    batch.zScore(db_1.RKEY_EXTRA_HASHES, ipfsHash);
    const existsResult = await batch.exec();
    const hashIsSaved = lodash_1.default.some(existsResult, lodash_1.default.isNumber());
    if (hashIsSaved) {
        const upstreamRes = await fetch(upstreamIpfs + req.url, {
            method: 'POST',
        });
        // TODO: wtp does typescript think this doesn't work. literally on mdn example https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream#async_iteration_of_a_stream_using_for_await...of
        for await (const chunk of upstreamRes.body) {
            res.send(chunk);
        }
        res.end();
    }
    // otherwise dont return
    res.status(404).end('unregistered ipfs data');
});
app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
// IPFS
//# sourceMappingURL=index.js.map