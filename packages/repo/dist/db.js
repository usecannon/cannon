"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = exports.RKEY_EXTRA_HASHES = exports.RKEY_PKG_HASHES = exports.RKEY_FRESH_UPLOAD_HASHES = void 0;
const redis_1 = require("redis");
exports.RKEY_FRESH_UPLOAD_HASHES = 'repo:tempUploadHashes';
exports.RKEY_PKG_HASHES = 'repo:pkgHashes';
exports.RKEY_EXTRA_HASHES = 'repo:longTermHashes';
async function getDb(url) {
    const client = (0, redis_1.createClient)({ url });
    await client.connect();
    return client;
}
exports.getDb = getDb;
//# sourceMappingURL=db.js.map