import { store } from '@graphprotocol/graph-ts'
import { Package, Variant, Tag } from '../generated/schema';
import { PackagePublish, PackageUnpublish } from '../generated/CannonRegistry/CannonRegistry';

export function handlePublish(event: PackagePublish): void {
  const package_name = event.params.name.toString();
  let cannon_package = Package.load(package_name);
  if (!cannon_package) {
    cannon_package = new Package(package_name);
  }
  cannon_package.name = package_name;
  cannon_package.last_publisher = event.params.owner.toHexString();
  cannon_package.last_updated = event.block.timestamp;
  cannon_package.save();

  const tag_name = event.params.tag.toString();
  let tag = Tag.load(package_name + ':' + tag_name);
  if (!tag) {
    tag = new Tag(package_name + ':' + tag_name);
  }
  tag.name = tag_name;
  tag.last_publisher = event.params.owner.toHexString();
  tag.last_updated = event.block.timestamp;
  tag.cannon_package = cannon_package.id;
  tag.save();

  const variant_name = event.params.variant.toString();
  let variant = Variant.load(package_name + ':' + tag_name + ':' + variant_name);
  if (!variant) {
    variant = new Variant(package_name + ':' + tag_name + ':' + variant_name);
  }
  variant.name = variant_name;
  variant.last_publisher = event.params.owner.toHexString();
  variant.last_updated = event.block.timestamp;
  variant.tag = tag.id;
  variant.deploy_url = event.params.deployUrl;
  variant.meta_url = event.params.metaUrl;
  variant.cannon_package = cannon_package.id;
  if (variant_name.includes('-')) {
    variant.chain_id = <i32>parseInt(variant_name.split('-')[0]);
    variant.preset = variant_name.split('-').slice(1).join('-');
    variant.save();
  }
}

export function handleUnpublish(event: PackageUnpublish): void {
  const package_name = event.params.name.toString();
  const tag_name = event.params.tag.toString();
  const variant_name = event.params.variant.toString();
  
  let variant = Variant.load(package_name + ':' + tag_name + ':' + variant_name);
  if (variant) {
    store.remove('Variant', variant.id);
  }

  // Check if the tag has other variants
  let tagId = package_name + ':' + tag_name;
  let tag = Tag.load(tagId);
  if (tag) {
    let variants = store.get('Variant', { where: { tag: tagId } });
    if (variants.length === 0) {
      // If no variants are associated with this tag, delete the tag
      store.remove('Tag', tag.id);
    }
  }

  // Check if the package has other tags
  let package = Package.load(package_name);
  if (package) {
    let tags = store.get('Tag', { where: { cannon_package: package_name } });
    if (tags.length === 0) {
      // If no tags are associated with this package, delete the package
      store.remove('Package', package.id);
    }
  }
}
