//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {EfficientStorage} from "../EfficientStorage.sol";
import {Storage} from "../Storage.sol";

contract StorageReader is Storage, EfficientStorage {
  function getStoreData(bytes32 _packageName) external view returns (bool) {
    return _oldStore().packages[_packageName].owner != address(0);
  }

  // function getOldStoreData(
  //   bytes32 _packageName,
  // ) external view returns (string memory) {
  //   string memory v = _store().strings[
  //     _store().packages[_packageName].deployments[_packageVersionName][_packageVariant].meta
  //   ];

  //   if (bytes(v).length == 0) {
  //     v = _oldStore().packages[_packageName].deployments[_packageVersionName][_packageVariant].meta;
  //   }

  //   return v;
  // }
}
