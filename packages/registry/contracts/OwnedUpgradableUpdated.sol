//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@synthetixio/core-contracts/contracts/ownership/Ownable.sol";
import {UUPSImplementation} from "@synthetixio/core-contracts/contracts/proxy/UUPSImplementation.sol";

/**
 * @title Inhereted in order to make a contract upgradable. Upon upgrade, ensures the new contract is also upgradable.
 */
contract OwnedUpgradableUpdated is Ownable, UUPSImplementation {

  constructor() Ownable(msg.sender) {}
  /**
   * @notice Called by the contract owner to change the implementation code for the proxy
   */
  function upgradeTo(address _newImplementation) public override onlyOwner {
    _upgradeTo(_newImplementation);
  }
}
