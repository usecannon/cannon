// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MintableERC721 is ERC721 {
  constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

  function mint(
    address to,
    uint id,
    bytes memory data
  ) external returns (bool) {
    _safeMint(to, id, data);

    return true;
  }
}
