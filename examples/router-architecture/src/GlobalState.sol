// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

library GlobalState {
  bytes32 private constant _SLOT_NAME = keccak256(abi.encode("io.GlobalState"));

  struct Data {
    uint256 count;
    string greeting;
  }

  function load() internal pure returns (GlobalState.Data storage store) {
    bytes32 s = _SLOT_NAME;
    assembly {
      store.slot := s
    }
  }
}
