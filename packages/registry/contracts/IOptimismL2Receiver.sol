//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IOptimismL2Receiver {
  function xDomainMessageSender() external returns (address);
}
