//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Subscription
 */
library Subscription {
  error PlanNotFound(uint16 _planId);

  bytes32 private constant _SLOT =
        keccak256(abi.encode("usecannon.cannon.registry.subscription"));

  struct Plan {
    /**
     * @notice The duration of a subscription term in seconds
     */
    uint32 termDuration;
    /**
     * @notice The amount of USDC required to subscribe to the registry for one term
     */
    uint32 feeUSDC;
    /**
     * @notice The amount of publishes allowed per subscription term
     */
    uint32 publishQuota;
  }

  struct Membership {
    /**
     * @notice The ID of the plan the user has purchased
     */
    uint16 planId;
    /**
     * @notice The start time of the last active term
     */
    uint32 activatedAt;
    /**
     * @notice The number of publishes the user has made in the current term
     */
    uint32 publishCount;
    /**
     * @notice The amount of terms the user has left to use
     */
    uint32 termsLeft;
  }

  struct Data {
    /**
     * @notice The default amount of ETH required to publish a package when the
     *         user does not have an active membership
     */
    uint256 defaultPublishFee;
    /**
     * @notice The default amount of ETH required to register a new package when
     *         the user does not have an active membership
     */
    uint256 defaultRegisterFee;
    /**
     * @notice The default plan for new user memberships. This is the only plan
     *         that can be purchased, if the user already has an active
     *         membership they need to finish all the terms or cancel the
     *         membership first
     */
    uint16 defaultPlanId;
    /**
     * @notice All the plans ever created
     */
    mapping(uint16 planId => Plan plan) plans;
    /**
     * @notice All the user memberships
     */
    mapping(address => Membership) memberships;
  }

  function load() internal pure returns (Data storage store) {
      bytes32 s = _SLOT;
      assembly {
          store.slot := s
      }
  }

  function getPlan(Data storage self, uint16 _planId) internal view returns (Plan memory) {
    Plan memory plan = self.plans[_planId];
    if (plan.termDuration == 0) revert PlanNotFound(_planId);
    return plan;
  }

  function getDefaultPlan(Data storage self) internal view returns (Plan memory) {
    return getPlan(self, self.defaultPlanId);
  }

  function registerDefaultPlan(Data storage self, uint32 _termDuration, uint32 _feeUSDC, uint32 _publishQuota) external {
    self.defaultPlanId++;
    self.plans[self.defaultPlanId] = Subscription.Plan({
      termDuration: _termDuration,
      feeUSDC: _feeUSDC,
      publishQuota: _publishQuota
    });
  }

  function getMembership(Data storage self, address _user) internal view returns (Membership memory) {
    return self.memberships[_user];
  }
}
