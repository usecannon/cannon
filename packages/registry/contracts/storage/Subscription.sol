//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Subscription
 */
library Subscription {
  error PlanNotFound(uint16 planId);
  error PlanExpired(uint16 planId);
  error InvalidNumberOfTerms(uint32 numberOfTerms);

  bytes32 private constant _SLOT =
        keccak256(abi.encode("usecannon.cannon.registry.subscription"));

  struct Plan {
    /**
     * @notice The ID of the plan
     */
    uint16 id;
    /**
     * @notice The duration of a subscription term in seconds
     */
    uint32 duration;
    /**
     * @notice The amount of publishes allowed per subscription term
     */
    uint32 publishQuota;
    /**
     * @notice The amount of the configured ERC20 token required to subscribe to
     * the registry for a single term.
     */
    uint256 price;
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
     * @notice The amount of terms the user has left to use, including the current term
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

  function getPlan(Data storage _self, uint16 _planId) internal view returns (Plan storage) {
    Plan storage plan = _self.plans[_planId];
    if (plan.id == 0) revert PlanNotFound(_planId);
    return plan;
  }

  function getDefaultPlan(Data storage _self) internal view returns (Plan storage) {
    return getPlan(_self, _self.defaultPlanId);
  }

  function registerDefaultPlan(Data storage _self, uint32 _termDuration, uint32 _price, uint32 _publishQuota) internal returns (uint16) {
    _self.defaultPlanId++;
    _self.plans[_self.defaultPlanId] = Plan({
      id: _self.defaultPlanId,
      duration: _termDuration,
      price: _price,
      publishQuota: _publishQuota
    });
  }

  function getMembership(Data storage _self, address _user) internal view returns (Membership storage) {
    return _self.memberships[_user];
  }

  function isMembershipActive(Plan storage _plan, Membership storage _membership) internal view returns (bool) {
    // membership never created
    if (_membership.activatedAt == 0) return false;
    // is active and on the current term
    if ((_membership.activatedAt + _plan.duration) > block.timestamp) return true;
    // is expired and has no terms left
    if (_membership.termsLeft == 0) return false;
    // membership is active for the coming term
    return (_membership.activatedAt + (_plan.duration * _membership.termsLeft)) > block.timestamp;
  }

  function resetMembership(Data storage _self, Membership storage _membership, uint32 _numberOfTerms) internal {
    _membership.planId = _self.defaultPlanId;
    _membership.activatedAt = uint32(block.timestamp);
    _membership.publishCount = 0;
    _membership.termsLeft = _numberOfTerms;
  }

  function purchaseMembership(Data storage _self, address _user, uint32 _numberOfTerms) internal {
    if (_numberOfTerms == 0) {
      revert InvalidNumberOfTerms(_numberOfTerms);
    }

    Membership storage _membership = getMembership(_self, _user);

    // first time getting a membership
    if (_membership.activatedAt == 0) {
      resetMembership(_self, _membership, _numberOfTerms);
    } else {
      Plan storage _plan = getPlan(_self, _membership.planId);

      // check if the current membership is active
      if (isMembershipActive(_plan, _membership)) {
        // The user is not allowed to upgrade to a different running plan, they
        // should cancel the current membership first
        if (_membership.planId != _self.defaultPlanId) {
          revert PlanExpired(_membership.planId);
        }

        // add the new terms to the membership
        _membership.termsLeft += _numberOfTerms;
      } else {
        resetMembership(_self, _membership, _numberOfTerms);
      }
    }
  }
}
