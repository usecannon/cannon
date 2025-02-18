// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

// import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";

contract Greeter {
  // AccessManager public accessManager;

  // constructor(address _accessManager) {
  //   accessManager = AccessManager(_accessManager);
  // }

  function greet() public pure returns (string memory) {
    return "Hello, world!";
  }
}
