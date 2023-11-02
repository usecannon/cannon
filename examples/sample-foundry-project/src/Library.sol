//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";

library Library {
  function testLibraryFunction() public view {
    console.log("The library is logging");
  }
}
