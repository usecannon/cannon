//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";

contract Storage {
  bytes32 private constant _SLOT_CANNON_REGISTRY_STORAGE = keccak256(abi.encode("usecannon.cannon.registry"));

  struct OldStore {
    mapping(bytes32 => OldPackage) packages;
    mapping(address => bool) verifiers;
  }

  struct OldPackage {
    address owner;
    address nominatedOwner;
    SetUtil.Bytes32Set versions;
    mapping(bytes32 => mapping(bytes32 => OldCannonDeployInfo)) deployments;
  }

  struct OldCannonDeployInfo {
    string deploy;
    string meta;
  }

  function _oldStore() internal pure returns (OldStore storage store) {
    bytes32 s = _SLOT_CANNON_REGISTRY_STORAGE;

    assembly {
      store.slot := s
    }
  }
}
