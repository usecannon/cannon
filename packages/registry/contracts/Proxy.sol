//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {UUPSProxyWithOwner} from "@synthetixio/core-contracts/contracts/proxy/UUPSProxyWithOwner.sol";

/**
 * 
 * This proxy is intended to be initialized by Arachnid CREATE2 (https://github.com/Arachnid/deterministic-deployment-proxy)
 */
contract Proxy is UUPSProxyWithOwner {
  // solhint-disable-next-line no-empty-blocks
  
  /**
   * @notice Creates the proxy, and initializes it to the given implementation and owner address. The arguments of this function were specially crafted to
   * ensure that even if anyone creates a registry or "frontruns" us, they will be not be able to assume ownership of the proxy.
   * @param firstImplementation the implementation contract
   * @param initialOwner The address that will assume ownership of the registry from the very beginning.
   */
  constructor(address firstImplementation, address initialOwner) UUPSProxyWithOwner(firstImplementation, initialOwner) {}
}
