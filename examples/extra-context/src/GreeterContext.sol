// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract GreeterContext {
  string public greeting;
  int256 public greetingIndex;

  function saveGreeting(string memory _greeting, int256 _greetingIndex) public {
    greeting = _greeting;
    greetingIndex = _greetingIndex;
  }

  function getContext() public view returns (string memory, int256) {
    return (greeting, greetingIndex);
  }
}
