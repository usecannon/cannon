"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineCtx = void 0;
const lodash_1 = __importDefault(require("lodash"));
function combineCtx(ctxs) {
    const ctx = lodash_1.default.clone(ctxs[0]);
    ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();
    // merge all blockchain outputs
    for (const additionalCtx of ctxs.slice(1)) {
        ctx.contracts = Object.assign(Object.assign({}, ctx.contracts), additionalCtx.contracts);
        ctx.txns = Object.assign(Object.assign({}, ctx.txns), additionalCtx.txns);
        ctx.imports = Object.assign(Object.assign({}, ctx.imports), additionalCtx.imports);
    }
    return ctx;
}
exports.combineCtx = combineCtx;
