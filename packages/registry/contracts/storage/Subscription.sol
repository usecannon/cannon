//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Subscription
 */
library Subscription {
  bytes32 private constant _SLOT =
        keccak256(abi.encode("usecannon.cannon.registry.subscription"));

  struct Plan {
    /**
     * @notice The duration of a subscription period in seconds
     */
    uint32 duration;
    /**
     * @notice The amount of USDC required to subscribe to the registry for one period
     */
    uint32 feeUSDC;
    /**
     * @notice The amount of publishes allowed per subscription period
     */
    uint32 publishQuota;
  }

  struct Membership {
    /**
     * @notice The ID of the plan the user is subscribed to
     */
    uint16 planId;
    /**
     * @notice The start time of the last started subscription period
     */
    uint32 periodStart;
    /**
     * @notice The number of publishes the user has made in the current period
     */
    uint32 publishCount;
  }

  struct Data {
    /**
     * @notice The default amount of ETH required to publish a package when the
     *         user does not have an active subscription
     */
    uint256 defaultPublishFee;
    /**
     * @notice The default amount of ETH required to register a new package when
     *         the user does not have an active subscription
     */
    uint256 defaultRegisterFee;
    /**
     * @notice The default plan ID for new users
     */
    uint16 defaultPlanId;
    /**
     * @notice The plans available to users
     */
    mapping(uint16 planId => Plan plan) plans;
    /**
     * @notice The memberships of users
     */
    mapping(address => Membership) memberships;
  }

  function load() internal pure returns (Data storage store) {
      bytes32 s = _SLOT;
      assembly {
          store.slot := s
      }
  }
}
