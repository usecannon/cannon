//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract EfficientStorage {
  bytes32 private constant _SLOT_CANNON_REGISTRY_STORAGE = keccak256(abi.encode("usecannon.cannon.registry.efficient"));

  struct Store {
    mapping(bytes16 => string) strings;
    mapping(bytes32 => Package) packages;
    mapping(address => bool) verifiers;
  }

  struct Package {
    mapping(bytes32 => mapping(bytes32 => CannonDeployInfo)) deployments;
    address owner;
    address nominatedOwner;
    uint256 additionalDeployersLength;
    mapping(uint256 => address) additionalDeployers;
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
