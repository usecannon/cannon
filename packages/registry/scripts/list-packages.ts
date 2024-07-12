#!/usr/bin/env ts-node

/* eslint-disable no-console */

import { DEFAULT_REGISTRY_ADDRESS } from '@usecannon/builder';
import CannonRegistryAbi from '@usecannon/builder/dist/src/abis/CannonRegistry';
import * as viem from 'viem';
import { mainnet, optimism } from 'viem/chains';

const { PROVIDER_URL } = process.env;

// Used only for getting additional publishers
const OPTIMISM_PROVIDER_URL = 'wss://optimism-rpc.publicnode.com';

// const REGISTRY_DEPLOY_BLOCK = 16493645; // Contract deployment block
const REGISTRY_DEPLOY_BLOCK = 19543644; // First publish event emitted

if (typeof PROVIDER_URL !== 'string' || !PROVIDER_URL) {
  throw new Error('Missing RPC Provider url to use. Needs to have archival node, e.g. Alchemy.');
}

async function main() {
  const client = viem.createPublicClient({
    chain: mainnet,
    transport: PROVIDER_URL?.startsWith('wss://') ? viem.webSocket(PROVIDER_URL) : viem.http(PROVIDER_URL),
  });

  const contract = viem.getContract({
    address: DEFAULT_REGISTRY_ADDRESS,
    abi: CannonRegistryAbi,
    client,
  });

  const opContract = viem.getContract({
    address: DEFAULT_REGISTRY_ADDRESS,
    abi: CannonRegistryAbi,
    client: viem.createPublicClient({
      chain: optimism,
      transport: OPTIMISM_PROVIDER_URL?.startsWith('wss://')
        ? viem.webSocket(OPTIMISM_PROVIDER_URL)
        : viem.http(OPTIMISM_PROVIDER_URL),
    }),
  });

  const packageNames = await getPackageNames(client);

  console.log('{');
  for (const [i, [bytes32name, name]] of Object.entries(packageNames)) {
    const owner = await contract.read.getPackageOwner([bytes32name]);

    const ethPublishers = await contract.read.getAdditionalPublishers([bytes32name]);
    const opPublishers = await opContract.read.getAdditionalPublishers([bytes32name]);
    const publishers = Array.from(new Set([...ethPublishers, ...opPublishers]));

    const comma = Number.parseInt(i) === packageNames.length - 1 ? '' : ',';
    console.log(`  "${name}": { "owner:": "${owner}", "publishers": ${JSON.stringify(publishers)} }${comma}`);
  }
  console.log('}');
}

const _packagePublishEvents = viem.parseAbi([
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string url, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublishWithFee(bytes32 indexed name, bytes32 indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner, uint256 feePaid)',
  'event PackageRegistered(bytes32 indexed name, address registrant)',
]);

async function getPackageNames(client: viem.PublicClient) {
  const names = new Set<[string, string]>();

  const latestBlock = Number((await client.getBlockNumber()).toString());

  for (const [fromBlock, toBlock] of batches(REGISTRY_DEPLOY_BLOCK, latestBlock, 50000)) {
    const filter = await client.createEventFilter({
      address: DEFAULT_REGISTRY_ADDRESS,
      events: _packagePublishEvents,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    const logs = await client.getFilterLogs({ filter });
    for (const log of logs) {
      if (!log.args.name) {
        console.error(log);
        throw new Error('Invalid event');
      }
      const name = viem.hexToString(log.args.name, { size: 32 });
      names.add([log.args.name, name]);
    }
  }

  return Array.from(names);
}

function* batches(start: number, end: number, batchSize: number) {
  const count = Math.ceil((end - start) / batchSize);
  for (let i = 0; i < count; i++) {
    const batchStart = start + batchSize * i;
    const batchEnd = batchStart + batchSize - 1 > end ? end : batchStart + batchSize - 1;
    yield [batchStart, batchEnd];
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
