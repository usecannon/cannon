//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {EfficientStorage} from "../EfficientStorage.sol";
import {Storage} from "../Storage.sol";

contract StorageReader is Storage, EfficientStorage {
  function usesOldStorage(bytes32 _packageName) external view returns (bool) {
    bool usesOld = _oldStore().packages[_packageName].owner != address(0);
    bool usesNew = _store().packages[_packageName].owner != address(0);
    return usesOld && !usesNew;
  }
}
