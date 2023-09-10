//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";

contract ClonedGreeter {
  string public greeting;

  constructor(string memory _greeting) {
    console.log("Deploying a ClonedGreeter with greeting:", _greeting);
    greeting = _greeting;
  }

  function greet() public view returns (string memory) {
    return greeting;
  }

  function changeGreeting(string memory _greeting) public {
    greeting = _greeting;
  }
}
