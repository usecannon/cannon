//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Storage {
    struct Store {
        bytes32[] packages;
        mapping(bytes32 => mapping(bytes32 => string)) urls;
        mapping(bytes32 => address) owners;
        mapping(bytes32 => bytes32[]) versions;
        mapping(bytes32 => address) nominatedOwner;
    }

    function _store() internal pure returns (Store storage store) {
        assembly {
            // bytes32(uint(keccak256("usecannon.cannon-registry")) - 1)
            store.slot := 0xd386b53009e5ad6d6853d9184c05c992a989289c1761a6d9dd1cdfd204098522
        }
    }
}
