//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Storage {
  struct Store {
    mapping(bytes32 => Package) packages;
    mapping(address => bool) verifiers;
  }

  struct Package {
    address owner;
    address nominatedOwner;
    bytes32[] versions;
    mapping(bytes32 => string) versionUrls;
  }

  function _store() internal pure returns (Store storage store) {
    assembly {
      // bytes32(uint(keccak256("usecannon.cannon.registry")) - 1)
      store.slot := 0xc1d43f226fc86c5ffbb0bdc2447f5a3d1ab534c239d7dc14b283a49f5d5dbd2a
    }
  }
}
