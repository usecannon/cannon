// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {GlobalState} from "./GlobalState.sol";

contract Greeter {
  event NewGreeting(string newGreeting);

  function greet() public view returns (string memory) {
    return GlobalState.load().greeting;
  }

  function setGreeting(string memory _greeting) public {
    GlobalState.Data storage store = GlobalState.load();
    store.greeting = _greeting;
    emit NewGreeting(_greeting);
  }
}
