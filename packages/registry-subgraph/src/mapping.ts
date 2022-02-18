import { BigInt, ipfs, json, log } from "@graphprotocol/graph-ts"
import {
  CannonRegistry,
  ProtocolPublish
} from "../generated/CannonRegistry/CannonRegistry"
import { Package, Tag } from "../generated/schema"

export function handleProtocolPublish(event: ProtocolPublish): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let id = event.params.name.toString() + "@" + event.params.version.toString();
  let entity = Package.load(id);

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new Package(id);
  }

  // Entity fields can be set based on event parameters
  entity.name = event.params.name.toString();
  entity.version = event.params.version.toString();
  entity.url = event.params.url;
  entity.added = event.block.timestamp;
  entity.publisher = event.transaction.from.toHexString();

  let path = entity.url.slice(7) + '/cannon-metadata.json';
  let data = ipfs.cat(path);
  if(data) {
    let obj = json.fromBytes(data).toObject();
    let description = obj.get('description');
    if(description){
      entity.description = description.toString();
    }

    let tags = obj.get('tags');
    if(tags){
      let tagsArray = tags.toArray();
      for (let i = 0; i < tagsArray.length; ++i) {
        addTag(tagsArray[i].toString());
      }
    }
  }

  // Entities can be written to the store with `.save()`
  entity.save();
}

function addTag(tag:string): void{
  let entity = Tag.load(tag);
  if (!entity) {
    entity = new Tag(tag);
  }

  entity.count = entity.count.plus(BigInt.fromI32(1));
  entity.save();
}