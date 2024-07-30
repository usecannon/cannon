import _ from 'lodash';
import * as rkey from './db';
import { ActualRedisClientType, useRedis } from './redis';
import { verify } from '@usecannon/cli/dist/src/commands/verify';
import { resolveCliSettings } from '@usecannon/cli/dist/src/settings';

/* eslint no-console: "off" */

export async function loop() {
  const cliSettings = resolveCliSettings();
  const rdb = await useRedis();

  const specialChainSettings = await import (process.cwd() + '/verify-chains.json');

  let lastKey = rdb.get(rkey.RKEY_REGISTRY_STREAM + ':auto-verify-last');

  const e = await rdb.xRead(rkey.RKEY_REGISTRY_STREAM, { BLOCK: true, COUNT: 1 });
  while (e) {
    // run the cannon verify command from the cli
    await verify(e.packageUrl, _.defaults({ specialChainSettings[chainId.toString()] }, cliSettings), null, e.chainId);

    let lastKey = rdb.set(rkey.RKEY_REGISTRY_STREAM + ':auto-verify-last', ++lastKey);
    e = await rdb.xRead(rkey.RKEY_REGISTRY_STREAM, { BLOCK: true, COUNT: 1 });
  }
}
