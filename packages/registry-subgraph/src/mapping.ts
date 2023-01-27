import { Package, Variant } from '../generated/schema';
import { PackagePublish } from '../generated/CannonRegistry/CannonRegistry';

export function handlePublish(event: PackagePublish): void {
  const id = event.params.name.toString();
  let cannon_package = Package.load(id);
  if (!cannon_package) {
    cannon_package = new Package(id);
  }
  cannon_package.name = id;
  cannon_package.added = event.block.timestamp;
  cannon_package.save();

  const variant_string = event.params.variant.toString();
  let variant = Variant.load(id + ':' + variant_string);
  if (!variant) {
    variant = new Variant(id + ':' + variant_string);
  }
  variant.name = variant_string;
  variant.deploy_url = event.params.deployUrl;
  variant.meta_url = event.params.metaUrl;
  variant.publisher = event.params.owner.toHexString();
  variant.added = event.block.timestamp;
  variant.cannon_package = cannon_package.id;
  //variant.tags = event.params.tags.toString().split(',');
  variant.save();
}
