// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Greeter {
  string public greeting;
  int256 public greetingIndex;

  event NewGreeting(string newGreeting, int256 newGreetingIndex);

  function greet() public view returns (string memory) {
    return greeting;
  }

  function setGreeting(string memory _greeting) public {
    greeting = _greeting;
    greetingIndex++;
    emit NewGreeting(_greeting, greetingIndex);
  }
}
