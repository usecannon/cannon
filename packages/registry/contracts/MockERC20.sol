//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@synthetixio/core-contracts/contracts/token/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor() {
        _initialize("ERC20Mock", "E20M", 18);
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}
