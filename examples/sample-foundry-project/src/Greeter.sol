//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";

import {Library} from "./Library.sol";
import {ClonedGreeter} from "./ClonedGreeter.sol";

contract Greeter {
  string public greeting;

  error BadGreeting(string);

  constructor(string memory _greeting) {
    //console.log("Deploying a Greeter with greeting:", _greeting);
    greeting = _greeting;
  }

  function greet() public view returns (string memory) {
    Library.testLibraryFunction();
    return greeting;
  }

  function setGreeting(string memory _greeting, bool print) public {
    if (print) {
      console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
    }
    if (keccak256(abi.encodePacked(_greeting)) == keccak256(abi.encodePacked("whoops"))) {
      revert BadGreeting(_greeting);
    }
    greeting = _greeting;
  }

  function doCloning() public {
    //console.log("CALLED THE CLONE");
    ClonedGreeter g = new ClonedGreeter(greeting);

    emit NewClonedGreeter(address(g));
  }

  function doCloningIteratively(uint256 clones) public {
    for (uint256 i = 0; i < clones; i++) {
      ClonedGreeter g = new ClonedGreeter(greeting);
      emit NewClonedGreeter(address(g));
    }
  }

  function changeCloneGreeting(address a, string memory _greeting) public {
    ClonedGreeter(a).changeGreeting(_greeting);

    emit OldGreetingRemoved(ClonedGreeter(a).greeting());

    emit NewGreetingAdded(_greeting);
  }

  event NewClonedGreeter(address cloned);
  event OldGreetingRemoved(string oldGreeting);
  event NewGreetingAdded(string newGreeting);
}
