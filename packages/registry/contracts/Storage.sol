//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";

contract Storage {
  bytes32 private constant _SLOT_CANNON_REGISTRY_STORAGE = keccak256(abi.encode("usecannon.cannon.registry"));

  struct Store {
    mapping(bytes32 => Package) packages;
    mapping(address => bool) verifiers;
  }

  struct Package {
    address owner;
    address nominatedOwner;
    SetUtil.Bytes32Set versions;
    mapping(bytes32 => mapping(bytes32 => CannonDeployInfo)) deployments;
  }

  struct CannonDeployInfo {
    string deploy;
    string meta;
  }

  function _store() internal pure returns (Store storage store) {
    bytes32 s = _SLOT_CANNON_REGISTRY_STORAGE;

    assembly {
      store.slot := s
    }
  }
}
