//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

interface IOptimismL2Receiver {
  function xDomainMessageSender() external returns (address);
}
