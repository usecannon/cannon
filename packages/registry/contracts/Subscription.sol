//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Subscription
 */
library Subscription {
  bytes32 private constant _SLOT =
        keccak256(abi.encode("usecannon.cannon.registry.subscription"));

  struct Data {
    /**
     * @notice The default amount of ETH required to publish a package when the
     *         user does not have an active subscription
     */
    uint256 defaultPublishFee;
    /**
     * @notice The default amount of ETh required to register a new package when
     *         the user does not have an active subscription
     */
    uint256 defaultRegisterFee;
    /**
     * @notice The duration of a subscription period in seconds
     */
    uint256 subscriptionDuration;
    /**
     * @notice The amount of USDC required to subscribe to the registry for one period
     */
    uint256 subscriptionFeeUSDC;
  }

  function load() internal pure returns (Data storage store) {
      bytes32 s = _SLOT;
      assembly {
          store.slot := s
      }
  }
}
