//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnableStorage} from "@synthetixio/core-contracts/contracts/ownership/OwnableStorage.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {Subscription} from "./storage/Subscription.sol";

/**
 * @title Management of Subscriptions to Cannon Registry
 */
contract CannonSubscription {
  using Subscription for Subscription.Data;

  function getPlan(uint16 _planId) external view returns (Subscription.Plan memory) {
    return Subscription.load().getPlan(_planId);
  }

  function getDefaultPlan() external view returns (Subscription.Plan memory) {
    return Subscription.load().getDefaultPlan();
  }

  function registerDefaultPlan(uint32 _termDuration, uint32 _price, uint32 _publishQuota) external returns (uint16) {
    OwnableStorage.onlyOwner();
    return Subscription.load().registerDefaultPlan(_termDuration, _price, _publishQuota);
  }

  function getMembership(address _user) external view returns (Subscription.Membership memory) {
    return Subscription.load().getMembership(_user);
  }

  function purchaseMembership(address _user, uint32 _numberOfTerms) external {
    address sender = ERC2771Context.msgSender();

    // TODO: check that the user has enough USDC to purchase the membership

    Subscription.load().purchaseMembership(_user, _numberOfTerms);

    // TODO: give back the USDC to the user that was not used
  }

  function cancelMembership(uint32 _numberOfTerms) external {
    address sender = ERC2771Context.msgSender();

    // TODO: check that the user has enough terms left to cancel
    // TODO: give back the USDC from the not started terms
  }
}
