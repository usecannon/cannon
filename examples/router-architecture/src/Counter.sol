// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {GlobalState} from "./GlobalState.sol";

contract Counter {
  event CounterUpdate(uint256 count);

  function count() public view returns (uint256) {
    return GlobalState.load().count;
  }

  function increment() public {
    GlobalState.Data storage store = GlobalState.load();
    store.count++;
    emit CounterUpdate(store.count);
  }

  function setCount(uint256 newCount) public {
    GlobalState.Data storage store = GlobalState.load();
    store.count = newCount;
    emit CounterUpdate(newCount);
  }
}
