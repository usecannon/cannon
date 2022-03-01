//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";

library Library {
    function testLibraryFunction() public view {
        console.log("The library is logging");
    }
}