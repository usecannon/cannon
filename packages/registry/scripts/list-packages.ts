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

/** All events emitted by the Registry historically:
 0xae9e4fe11ae9989c7024c08a5e7ad3c74549dfa97ab2ba6e06cf9ced24c32864
   * PackagePublishWithFee (index_topic_1 bytes32 name, index_topic_2 bytes32 tag, index_topic_3 bytes32 variant, string deployUrl, string metaUrl, address owner, uint256 feePaid)
 0x3e0ad7f27e5b52a020ecd925eec9840b6bc48a884646be7657023c81a9ba16bb
   * PackagePublish (index_topic_1 bytes32 name, index_topic_2 bytes32 tag, index_topic_3 bytes32 variant, string deployUrl, string metaUrl, address owner)
 0xa33e19d55770245fbf58c12353aff6d18d00c3ae9ea6c88ce0cf187dd786dfe7
   * PackagePublish (index_topic_1 bytes32 name, index_topic_2 bytes32[] tags, bytes32 variant, string deployUrl, string metaUrl, address owner)
0xb0ebb377cade576ad7d89269d69e2431d97d1da8f509b35c03b93966118ace41
  * PackageUnpublish (index_topic_1 bytes32 name, index_topic_2 bytes32 tag, index_topic_3 bytes32 variant, address owner)
0x9d696e15efe12aa4b795ee74f770ec31b8fe0228fabb01cfc2a34e3c03bbc684
  * PackagePublishersChanged (index_topic_1 bytes32 name, address[] publisher)
0x389155cedb12ddb2eb4d488b710ca2a4d03c477d7092463a6ab99133eb98c873
  * PackageOwnerNominated (index_topic_1 bytes32 name, address currentOwner, address nominatedOwner)
0xe102503ed2e071dd4a7f27e9167666f13ca71765f69d35d38945c4be9e2e9dfd
  * TagPublish (index_topic_1 bytes32 name, index_topic_2 bytes32 variant, index_topic_3 bytes32 tag, bytes32 versionOfTag)
0x1bb6b2d0a13820344e8829adf8efae82ae3969496f2461aac94856962cd6a28f
  * PackageOwnerChanged (index_topic_1 bytes32 name, address owner)
0xd659c179d5ce464c32d3191d8655c4557b5828cedf99cc837023be5cd42167b8
  * PackageRegistered (index_topic_1 bytes32 name, address registrant)
0x5d611f318680d00598bb735d61bacf0c514c6b50e1e5ad30040a4df2b12791c7
  * Upgraded (index_topic_1 address self, address implementation)
0xb532073b38c83145e3e5135377a08bf9aab55bc0fd7c1179cd4fb995d2a5159c
  * OwnerChanged (address oldOwner, address newOwner)
0x906a1c6bd7e3091ea86693dd029a831c19049ce77f1dce2ce0bab1cacbabce22
  * OwnerNominated (address newOwner)
*/

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
