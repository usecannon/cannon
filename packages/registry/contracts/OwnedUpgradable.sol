//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {Ownable} from "./misc/Ownable.sol";
import {UUPSImplementation} from "./misc/UUPSImplementation.sol";

contract OwnedUpgradable is Ownable, UUPSImplementation {
  function upgradeTo(address _newImplementation) public override onlyOwner {
    _upgradeTo(_newImplementation);
  }
}
