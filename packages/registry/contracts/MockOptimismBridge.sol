//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {IOptimismL1Sender} from "./IOptimismL1Sender.sol";
import {IOptimismL2Receiver} from "./IOptimismL2Receiver.sol";

contract MockOptimismBridge is IOptimismL1Sender, IOptimismL2Receiver {
  bytes public lastCrossChainMessage;

  address public xDomainMessageSender;

  function sendMessage(address, bytes memory _message, uint32) external {
    lastCrossChainMessage = _message;
  }

  function setXDomainMessageSender(address _sender) external returns (address) {
    xDomainMessageSender = _sender;
    return _sender;
  }

  function doCall(address to, bytes memory data) external returns (bytes memory) {
    (bool success, bytes memory result) = to.call(data);

    if (!success) {
      uint256 len = result.length;
      assembly {
        revert(add(result, 0x20), len)
      }
    }

    return result;
  }
}
