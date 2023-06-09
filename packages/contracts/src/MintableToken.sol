// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.10;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract MintableToken is ERC20 {
  /**
   * @param name Token Name
   * @param symbol Token Symbol
   * @param initialSupply Initial Supply
   */
  constructor(string memory name, string memory symbol, uint256 initialSupply) payable ERC20(name, symbol) {
    _mint(msg.sender, initialSupply);
  }

  /**
   * @dev Creates `amount` tokens and assigns them to `to`, increasing
   * the total supply. Only accessible by the contract owner.
   */
  function mint(uint256 amount, address to) external {
    _mint(to, amount);
  }
}
