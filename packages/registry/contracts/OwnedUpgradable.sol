//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "@synthetixio/core-contracts/contracts/ownership/Ownable.sol";
import {UUPSImplementation} from "@synthetixio/core-contracts/contracts/proxy/UUPSImplementation.sol";

contract OwnedUpgradable is Ownable, UUPSImplementation {
  constructor() Ownable(msg.sender) {}

  function upgradeTo(address _newImplementation) public override onlyOwner {
    _upgradeTo(_newImplementation);
  }
}
