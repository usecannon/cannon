// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.10;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title Mintable Token
 * @author Breakthrough Labs Inc.
 * @notice Token, ERC20, Mintable
 * @custom:version 1.0.7
 * @custom:address 5
 * @custom:default-precision 18
 * @custom:simple-description Token that allows the owner to mint as many tokens as desired.
 * @dev ERC20 token with the following features:
 *
 *  - Premint your initial supply.
 *  - Mint as many tokens as you want with no cap.
 *  - Only the contract owner can mint new tokens.
 *
 */

contract MintableToken is ERC20, Ownable {
  /**
   * @param name Token Name
   * @param symbol Token Symbol
   * @param initialSupply Initial Supply
   */
  constructor(
    string memory name,
    string memory symbol,
    uint256 initialSupply
  ) payable ERC20(name, symbol) {
    _mint(msg.sender, initialSupply);
  }

  /**
   * @dev Creates `amount` tokens and assigns them to `to`, increasing
   * the total supply. Only accessible by the contract owner.
   */
  function mint(uint256 amount, address to) external onlyOwner {
    _mint(to, amount);
  }
}
