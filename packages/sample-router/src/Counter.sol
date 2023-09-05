// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
  event CounterUpdate(uint256 number);

  uint256 public number;

  function setNumber(uint256 newNumber) public {
    number = newNumber;
    emit CounterUpdate(number);
  }

  function increment() public {
    number++;
    emit CounterUpdate(number);
  }
}
