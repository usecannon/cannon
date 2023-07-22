// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "cannon-std/Cannon.sol";

import "../src/Greeter.sol";

contract ContractTest is Test {
  using Cannon for Vm;

  Greeter greeter;

  function setUp() public {
    greeter = Greeter(vm.getAddress("greeter"));
  }

  function testExample() public {
    string memory newGreeting = "Namaste";
    bytes32 expectedHash = keccak256(abi.encodePacked(newGreeting));
    greeter.setGreeting(newGreeting);
    assertTrue(keccak256(abi.encodePacked(greeter.greet())) == expectedHash);
  }
}
