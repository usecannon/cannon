#!/usr/bin/env ts-node

/* eslint-disable no-console */

import * as viem from 'viem';
import { getClients } from './helpers/clients';
import { eachPublish, PublishData } from './helpers/each-publish';

const ETH_START_BLOCK = 19543644;
const OP_START_BLOCK = 119000000;

async function main() {
  const { ethClient, opClient } = getClients();

  console.log('[');
  const [ethPublishes, opPublishes] = await Promise.all([
    _listPublishes(ethClient, ETH_START_BLOCK),
    _listPublishes(opClient, OP_START_BLOCK),
  ]);

  for (const publish of [...ethPublishes, ...opPublishes]) {
    console.log(JSON.stringify(publish));
  }

  console.log(']');
}

async function _listPublishes(client: viem.PublicClient, startBlock: number) {
  const publishes: PublishData[] = [];

  for await (const publish of eachPublish(client, startBlock)) {
    publishes.push(publish);
  }

  return publishes;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
