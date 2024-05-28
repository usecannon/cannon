//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract EfficientStorage {
  bytes32 private constant _SLOT_CANNON_REGISTRY_STORAGE = keccak256(abi.encode("usecannon.cannon.registry.efficient"));

  struct Store {
    mapping(bytes16 => string) strings;
    mapping(bytes32 => Package) packages;
    mapping(address => bool) verifiers;
    uint256 publishFee;
    uint256 registerFee;
  }

  struct Package {
    mapping(bytes32 => mapping(bytes32 => CannonDeployInfo)) deployments;
    address owner;
    address nominatedOwner;
    uint256 additionalPublishersLength;
    mapping(uint256 => address) additionalPublishers;
  }

  struct CannonDeployInfo {
    bytes16 deploy;
    bytes16 meta;
  }

  function _store() internal pure returns (Store storage store) {
    bytes32 s = _SLOT_CANNON_REGISTRY_STORAGE;

    assembly {
      store.slot := s
    }
  }
}
