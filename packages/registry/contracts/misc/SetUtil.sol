//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library SetUtil {
  // ----------------------------------------
  // Core bytes32 support
  // ----------------------------------------

  error PositionOutOfBounds();
  error ValueNotInSet();
  error ValueAlreadyInSet();

  struct Bytes32Set {
    bytes32[] _values;
    mapping(bytes32 => uint) _positions; // Position zero is never used.
  }

  function add(Bytes32Set storage set, bytes32 value) internal {
    if (contains(set, value)) {
      revert ValueAlreadyInSet();
    }

    set._values.push(value);
    set._positions[value] = set._values.length;
  }

  function remove(Bytes32Set storage set, bytes32 value) internal {
    uint position = set._positions[value];
    if (position == 0) {
      revert ValueNotInSet();
    }

    uint index = position - 1;
    uint lastIndex = set._values.length - 1;

    // If the element being deleted is not the last in the values,
    // move the last element to its position.
    if (index != lastIndex) {
      bytes32 lastValue = set._values[lastIndex];

      set._values[index] = lastValue;
      set._positions[lastValue] = position;
    }

    // Remove the last element in the values.
    set._values.pop();
    delete set._positions[value];
  }

  function replace(
    Bytes32Set storage set,
    bytes32 value,
    bytes32 newValue
  ) internal {
    if (!contains(set, value)) {
      revert ValueNotInSet();
    }

    if (contains(set, newValue)) {
      revert ValueAlreadyInSet();
    }

    uint position = set._positions[value];
    delete set._positions[value];

    uint index = position - 1;

    set._values[index] = newValue;
    set._positions[newValue] = position;
  }

  function contains(Bytes32Set storage set, bytes32 value) internal view returns (bool) {
    return set._positions[value] != 0;
  }

  function length(Bytes32Set storage set) internal view returns (uint) {
    return set._values.length;
  }

  function valueAt(Bytes32Set storage set, uint position) internal view returns (bytes32) {
    if (position == 0 || position > set._values.length) {
      revert PositionOutOfBounds();
    }

    uint index = position - 1;

    return set._values[index];
  }

  function positionOf(Bytes32Set storage set, bytes32 value) internal view returns (uint) {
    if (!contains(set, value)) {
      revert ValueNotInSet();
    }

    return set._positions[value];
  }

  function values(Bytes32Set storage set) internal view returns (bytes32[] memory) {
    return set._values;
  }
}
