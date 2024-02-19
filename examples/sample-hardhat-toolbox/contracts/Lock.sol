// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract Lock {
  uint256 public unlockTime;
  address payable public owner;

  event Withdrawal(uint256 amount, uint256 when);

  error Unauthorized(address _invalidSender);
  error InvalidUnlockTime(uint256 _currentTime, uint256 _unlockTime);

  constructor(uint256 _unlockTime) payable {
    unlockTime = block.timestamp + _unlockTime;
    owner = payable(msg.sender);
  }

  function withdraw() public {
    if (msg.sender != owner) {
      revert Unauthorized(msg.sender);
    }

    if (block.timestamp < unlockTime) {
      revert InvalidUnlockTime(block.timestamp, unlockTime);
    }

    emit Withdrawal(address(this).balance, block.timestamp);

    owner.transfer(address(this).balance);
  }
}
