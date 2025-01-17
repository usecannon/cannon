//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnableStorage} from "@synthetixio/core-contracts/contracts/ownership/OwnableStorage.sol";
import {Subscription} from "./storage/Subscription.sol";

/**
 * @title Management of Subscriptions to Cannon Registry
 */
contract CannonSubscription {
  using Subscription for Subscription.Data;

  function getPlan(uint16 _planId) external view returns (Subscription.Plan memory) {
    Subscription.Data storage subscription = Subscription.load();
    return subscription.getPlan(_planId);
  }

  function getDefaultPlan() external view returns (Subscription.Plan memory) {
    return Subscription.load().getDefaultPlan();
  }

  function registerSubscriptionPlan(uint32 _termDuration, uint32 _feeUSDC, uint32 _publishQuota) external {
    OwnableStorage.onlyOwner();
    Subscription.Data storage subscription = Subscription.load();
    subscription.registerDefaultPlan(_termDuration, _feeUSDC, _publishQuota);
  }

  function getMembership(address _user) external view returns (Subscription.Membership memory) {
    return Subscription.load().getMembership(_user);
  }
}
