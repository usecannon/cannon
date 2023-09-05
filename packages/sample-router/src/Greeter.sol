// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Greeter {
  event NewGreeting(string newGreeting);

  string public greeting;

  function greet() public view returns (string memory) {
    return greeting;
  }

  function setGreeting(string memory _greeting) public {
    greeting = _greeting;
    emit NewGreeting(_greeting);
  }
}
