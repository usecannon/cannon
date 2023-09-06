// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@synthetixio/core-contracts/contracts/proxy/UUPSImplementation.sol";

contract Upgrade is UUPSImplementation {
  function upgradeTo(address newImplementation) public override {
    _upgradeTo(newImplementation);
  }
}
