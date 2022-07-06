//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {Storage} from "./Storage.sol";
import {Ownable} from "@synthetixio/core-contracts/contracts/ownership/Ownable.sol";
import {UUPSImplementation} from "@synthetixio/core-contracts/contracts/proxy/UUPSImplementation.sol";

contract CannonRegistry is Storage, Ownable, UUPSImplementation {
  error Unauthorized();
  error InvalidUrl(string url);
  error InvalidName(bytes32 name);

  event ProtocolPublish(bytes32 indexed name, bytes32 indexed version, bytes32[] indexed tags, string url, address owner);

  uint public constant MIN_PACKAGE_NAME_LENGTH = 3;

  function upgradeTo(address newImplementation) public override onlyOwner {
    _upgradeTo(newImplementation);
  }

  function validateProtocolName(bytes32 name) public pure returns (bool) {
    // each character must be in the supported charset

    for (uint i = 0; i < 32; i++) {
      if (name[i] == bytes1(0)) {
        // must be long enough
        if (i < MIN_PACKAGE_NAME_LENGTH) {
          return false;
        }

        // last character cannot be `-`
        if (name[i - 1] == "-") {
          return false;
        }

        break;
      }

      // must be in valid character set
      if (
        (name[i] < "0" || name[i] > "9") &&
        (name[i] < "a" || name[i] > "z") &&
        // first character cannot be `-`
        (i == 0 || name[i] != "-")
      ) {
        return false;
      }
    }

    return true;
  }

  function publish(
    bytes32 _name,
    bytes32 _version,
    bytes32[] memory _tags,
    string memory _url
  ) external {
    Store storage s = _store();

    if (bytes(_url).length == 0) {
      revert InvalidUrl(_url);
    }

    if (s.owners[_name] != address(0) && s.owners[_name] != msg.sender) {
      revert Unauthorized();
    }

    if (s.owners[_name] == address(0)) {
      if (!validateProtocolName(_name)) {
        revert InvalidName(_name);
      }

      s.owners[_name] = msg.sender;
      s.protocols.push(_name);
    }

    if (bytes(s.urls[_name][_version]).length == 0) {
      s.versions[_name].push(_version);
    }

    s.urls[_name][_version] = _url;

    for (uint i = 0; i < _tags.length; i++) {
      s.urls[_name][_tags[i]] = _url;
    }

    emit ProtocolPublish(_name, _version, _tags, _url, msg.sender);
  }

  function nominatePackageOwner(bytes32 _name, address _newOwner) external {
    Store storage s = _store();

    if (s.owners[_name] != msg.sender) {
      revert Unauthorized();
    }

    s.nominatedOwner[_name] = _newOwner;
  }

  function acceptPackageOwnership(bytes32 _name) external {
    Store storage s = _store();

    address newOwner = s.nominatedOwner[_name];

    if (msg.sender != newOwner) {
      revert Unauthorized();
    }

    s.owners[_name] = newOwner;
    s.nominatedOwner[_name] = address(0);
  }

  function getPackageNominatedOwner(bytes32 _protocolName) external view returns (address) {
    return _store().nominatedOwner[_protocolName];
  }

  function getPackages() external view returns (bytes32[] memory) {
    return _store().protocols;
  }

  function getPackageVersions(bytes32 _protocolName) external view returns (bytes32[] memory) {
    return _store().versions[_protocolName];
  }

  function getPackageUrl(bytes32 _protocolName, bytes32 _protocolVersion) external view returns (string memory) {
    return _store().urls[_protocolName][_protocolVersion];
  }
}
