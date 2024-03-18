//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IOptimismL1Sender {
  function sendMessage(address _target, bytes memory _message, uint32 _minGasLimit) external;
}
