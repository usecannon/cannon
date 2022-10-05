//import { Bytes, ByteArray, BigInt, ipfs, json, log } from '@graphprotocol/graph-ts';

import { Package, Version } from '../generated/schema';
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
  //version.tags = event.params.tags.map<string>((item) => item.toHexString());
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

    const keywords = obj.get('keywords');
    if (keywords) {
      const keywordsArray = keywords.toArray();
      for (let i = 0; i < keywordsArray.length; ++i) {
        addKeyword(keywordsArray[i].toString(), version.id);
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

function addKeyword(keywordId: string, versionId: string): void {
  let entity = Keyword.load(keywordId);
  if (!entity) {
    entity = new Keyword(keywordId);
  }
  entity.count = entity.count.plus(BigInt.fromI32(1));
  entity.save();

  let join_entity = PackageKeyword.load(versionId + '-' + keywordId);
  if (!join_entity) {
    join_entity = new PackageKeyword(versionId + '-' + keywordId);
    join_entity.cannon_package = versionId;
    join_entity.keyword = keywordId;
    join_entity.save();
  }
  */
}
