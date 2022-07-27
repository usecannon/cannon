//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";

import "./Library.sol";
import "./ClonedGreeter.sol";

contract Greeter {
  string public greeting;

  constructor(string memory _greeting) {
    console.log("Deploying a Greeter with greeting:", _greeting);
    greeting = _greeting;
  }

  function greet() public view returns (string memory) {
    Library.testLibraryFunction();
    return greeting;
  }

  function setGreeting(string memory _greeting) public {
    console.log("Changing greeting from '%s' to '%s'", greeting, _greeting);
    greeting = _greeting;
  }

  function doCloning() public {
    console.log("CALLED THE CLONE");
    ClonedGreeter g = new ClonedGreeter(greeting);

    emit NewClonedGreeter(address(g));
  }

  event NewClonedGreeter(address cloned);
}
