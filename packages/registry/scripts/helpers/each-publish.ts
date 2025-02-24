import * as viem from 'viem';
import { DEFAULT_REGISTRY_ADDRESS, PackageReference } from '@usecannon/builder';
import { batches } from './batches';

export interface PublishData {
  name: string;
  version: string;
  preset: string;
  chainId: number;
  deployUrl: string;
  publisher: viem.Address;
  metaUrl?: string;
  feePaid?: bigint;
}

const _packagePublishEvents = viem.parseAbi([
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string url, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublish(bytes32 indexed name, bytes32[] indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner)',
  'event PackagePublishWithFee(bytes32 indexed name, bytes32 indexed tag, bytes32 indexed variant, string deployUrl, string metaUrl, address owner, uint256 feePaid)',
  // 'event PackageRegistered(bytes32 indexed name, address registrant)',
  // 'event TagPublish(bytes32 indexed name, bytes32 indexed variant, bytes32 indexed tag, bytes32 versionOfTag)', // only getting first version
]);

export async function* eachPublish(client: viem.PublicClient, startBlock: number) {
  const names = new Set<viem.Hex>();

  const latestBlock = Number((await client.getBlockNumber()).toString());

  for (const [fromBlock, toBlock] of batches(startBlock, latestBlock, 50000)) {
    const filter = await client.createEventFilter({
      address: DEFAULT_REGISTRY_ADDRESS,
      events: _packagePublishEvents,
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    });

    const logs = await client.getFilterLogs({ filter });
    for (const log of logs) {
      if (!log.args.name) {
        // eslint-disable-next-line no-console
        console.error('Invalid event:', log);
        continue;
      }

      try {
        const name = viem.hexToString(log.args.name, { size: 32 });
        const publisher = viem.getAddress(log.args.owner!);
        const [chainId, preset] = PackageReference.parseVariant(viem.hexToString(log.args.variant!, { size: 32 }));
        const deployUrl = (log.args as any).deployUrl || (log.args as any).url || undefined;
        const metaUrl = (log.args as any).metaUrl || undefined;
        const tag = (log.args as any).tag ? (log.args as any).tag : (log.args as any).tags?.[0];
        const version = viem.hexToString(tag!, { size: 32 });
        const feePaid = (log.args as any).feePaid || undefined;

        yield {
          name,
          version,
          preset,
          chainId,
          publisher,
          deployUrl,
          metaUrl,
          feePaid,
        } satisfies PublishData;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Invalid event:', log);
        // eslint-disable-next-line no-console
        console.error(err);
        continue;
      }
    }
  }

  return names;
}

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
