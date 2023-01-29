import { Package, Variant, Tag } from '../generated/schema';
import { PackagePublish } from '../generated/CannonRegistry/CannonRegistry';

export function handlePublish(event: PackagePublish): void {
  const package_name = event.params.name.toString();
  let cannon_package = Package.load(package_name);
  if (!cannon_package) {
    cannon_package = new Package(package_name);
  }
  cannon_package.name = package_name;
  cannon_package.last_updated = event.block.timestamp;
  cannon_package.save();

  const tag_name = event.params.tag.toString();
  let tag = Tag.load(package_name + ':' + tag_name);
  if (!tag) {
    tag = new Tag(package_name + ':' + tag_name);
  }
  tag.last_updated = event.block.timestamp;
  tag.cannon_package = cannon_package.id;
  tag.save();

  const variant_name = event.params.variant.toString();
  let variant = Variant.load(package_name + ':' + variant_name);
  if (!variant) {
    variant = new Variant(package_name + ':' + variant_name);
  }
  variant.name = variant_name;
  variant.publisher = event.params.owner.toHexString();
  variant.added = event.block.timestamp;
  variant.tag = tag.id;
  variant.deploy_url = event.params.deployUrl;
  variant.meta_url = event.params.metaUrl;
  variant.save();
}
