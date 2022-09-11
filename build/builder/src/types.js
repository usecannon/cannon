import _ from 'lodash';
export function combineCtx(ctxs) {
    const ctx = _.clone(ctxs[0]);
    ctx.timestamp = Math.floor(Date.now() / 1000).toString(); //(await this.provider.getBlock(await this.provider.getBlockNumber())).timestamp.toString();
    // merge all blockchain outputs
    for (const additionalCtx of ctxs.slice(1)) {
        ctx.contracts = Object.assign(Object.assign({}, ctx.contracts), additionalCtx.contracts);
        ctx.txns = Object.assign(Object.assign({}, ctx.txns), additionalCtx.txns);
        ctx.imports = Object.assign(Object.assign({}, ctx.imports), additionalCtx.imports);
    }
    return ctx;
}
