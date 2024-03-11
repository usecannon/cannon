//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./IOptimismL1Sender.sol";
import "./IOptimismL2Receiver.sol";

contract MockOptimismBridge is IOptimismL1Sender, IOptimismL2Receiver {
  function sendMessage(
      address _target,
      bytes memory _message,
      uint32 _minGasLimit
  ) external {
    
  }
  
  function xDomainMessageSender() external returns (address) {
    return address(0x1234123412341234123412341234123412341234);
  }
}
