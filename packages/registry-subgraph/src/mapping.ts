import { Package, Variant, Tag } from '../generated/schema';
import { PackagePublish, PackagePublishWithFee, TagPublish } from '../generated/CannonRegistry/CannonRegistry';
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts';

class PublishEntry {
  name: Bytes;
  tag: Bytes;
  variant: Bytes;
  deployUrl: string;
  metaUrl: string;
  owner: Address;

  constructor() {
    this.name = new Bytes(0);
    this.tag = new Bytes(0);
    this.variant = new Bytes(0);
    this.deployUrl = '';
    this.metaUrl = '';
    this.owner = new Address(0);
  }
}

export function handlePublishTag(event: TagPublish): void {
  // the ipfs urls are not repeated for us in this event, so we have to resolve them from the local db
  const package_name = event.params.name.toString();
  const version_name = event.params.versionOfTag.toString();
  const variant_name = event.params.variant.toString();
  let tagged_variant = Variant.load(package_name + ':' + version_name + ':' + variant_name);

  if (tagged_variant == null) {
    return;
  }

  let entry = new PublishEntry();
  entry.name = event.params.name;
  entry.tag = event.params.tag;
  entry.variant = event.params.variant;
  entry.deployUrl = tagged_variant.deploy_url;
  entry.metaUrl = tagged_variant.meta_url;
  entry.owner = event.transaction.from;

  _savePublishEntry(entry, event.block.timestamp);
}

export function handlePublishWithFee(event: PackagePublishWithFee): void {
  let entry = new PublishEntry();
  entry.name = event.params.name;
  entry.tag = event.params.tag;
  entry.variant = event.params.variant;
  entry.deployUrl = event.params.deployUrl;
  entry.metaUrl = event.params.metaUrl;
  entry.owner = event.transaction.from;

  _savePublishEntry(entry, event.block.timestamp);
}

export function handlePublish(event: PackagePublish): void {
  let entry = new PublishEntry();
  entry.name = event.params.name;
  entry.tag = event.params.tag;
  entry.variant = event.params.variant;
  entry.deployUrl = event.params.deployUrl;
  entry.metaUrl = event.params.metaUrl;
  entry.owner = event.transaction.from;

  _savePublishEntry(entry, event.block.timestamp);
}

function _savePublishEntry(entry: PublishEntry, timestamp: BigInt): void {
  const package_name = entry.name.toString();
  let cannon_package = Package.load(package_name);
  if (!cannon_package) {
    cannon_package = new Package(package_name);
  }
  cannon_package.name = package_name;
  cannon_package.last_publisher = entry.owner.toHexString();
  cannon_package.last_updated = timestamp;
  cannon_package.save();

  const tag_name = entry.tag.toString();
  let tag = Tag.load(package_name + ':' + tag_name);
  if (!tag) {
    tag = new Tag(package_name + ':' + tag_name);
  }
  tag.name = tag_name;
  tag.last_publisher = entry.owner.toHexString();
  tag.last_updated = timestamp;
  tag.cannon_package = cannon_package.id;
  tag.save();

  const variant_name = entry.variant.toString();
  let variant = Variant.load(package_name + ':' + tag_name + ':' + variant_name);
  if (!variant) {
    variant = new Variant(package_name + ':' + tag_name + ':' + variant_name);
  }
  variant.name = variant_name;
  variant.last_publisher = entry.owner.toHexString();
  variant.last_updated = timestamp;
  variant.tag = tag.id;
  variant.deploy_url = entry.deployUrl;
  variant.meta_url = entry.metaUrl;
  variant.cannon_package = cannon_package.id;
  if (variant_name.includes('-')) {
    variant.chain_id = <i32>parseInt(variant_name.split('-')[0]);
    variant.preset = variant_name.split('-').slice(1).join('-');
    variant.save();
  }
}
