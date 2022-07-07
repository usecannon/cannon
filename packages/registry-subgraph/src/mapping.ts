import { BigInt, ipfs, json, log } from '@graphprotocol/graph-ts';

import { Package, Version, PackageTag, Tag } from '../generated/schema';
import { ProtocolPublish } from '../generated/CannonRegistry/CannonRegistry';

export function handlePublish(event: ProtocolPublish): void {
  const id = event.params.name.toString();
  let cannon_package = Package.load(id);
  if (!cannon_package) {
    cannon_package = new Package(id);
  }

  const version_string = event.params.version.toString();
  let version = Version.load(id + ':' + version_string);
  if (!version) {
    version = new Version(id + ':' + version_string);
  }
  version.name = version_string;
  version.url = event.params.url;
  version.publisher = event.params.owner.toHexString();
  version.added = event.block.timestamp;
  version.cannon_package = cannon_package.id;

  cannon_package.save();
  version.save();

  /*
  const metadata_path = entity.url.slice(7) + '/cannonfile.json';
  const metadata_data = ipfs.cat(metadata_path);
  if (metadata_data) {
    const obj = json.fromBytes(metadata_data).toObject();
    const description = obj.get('description');
    if (description) {
      entity.description = description.toString();
    }

    const tags = obj.get('tags');
    if (tags) {
      const tagsArray = tags.toArray();
      for (let i = 0; i < tagsArray.length; ++i) {
        addTag(tagsArray[i].toString(), id);
      }
    }
  } else {
    log.warning('Could not retrieve metadata for {}', [id]);
  }

  const readme_path = entity.url.slice(7) + '/README.md';
  const readme_data = ipfs.cat(readme_path);
  if (readme_data) {
    //entity.readme = readme_data.toString();
  } else {
    log.warning('Could not retrieve readme for {}', [id]);
  }

  const toml_path = entity.url.slice(7) + '/cannonfile.toml';
  const toml_data = ipfs.cat(toml_path);
  if (toml_data) {
    //entity.cannonfile = toml_data.toString();
  } else {
    log.warning('Could not retrieve cannonfile for {}', [id]);
  }

  entity.save();
}

function addTag(tagId: string, packageId: string): void {
  let entity = Tag.load(tagId);
  if (!entity) {
    entity = new Tag(tagId);
  }
  entity.count = entity.count.plus(BigInt.fromI32(1));
  entity.save();

  let join_entity = PackageTag.load(packageId + '-' + tagId);
  if (!join_entity) {
    join_entity = new PackageTag(packageId + '-' + tagId);
    join_entity.cannon_package = packageId;
    join_entity.tag = tagId;
    join_entity.save();
  }
  */
}
