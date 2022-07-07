//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {Storage} from "./Storage.sol";
import {Ownable} from "@synthetixio/core-contracts/contracts/ownership/Ownable.sol";
import {UUPSImplementation} from "@synthetixio/core-contracts/contracts/proxy/UUPSImplementation.sol";

contract CannonRegistry is Storage, Ownable, UUPSImplementation {
  error Unauthorized();
  error InvalidUrl(string url);
  error InvalidName(bytes32 name);
  error TooManyTags();

  event PackagePublish(bytes32 indexed name, bytes32 indexed version, bytes32[] indexed tags, string url, address owner);

  uint public constant MIN_PACKAGE_NAME_LENGTH = 3;

  function upgradeTo(address _newImplementation) public override onlyOwner {
    _upgradeTo(_newImplementation);
  }

  function validatePackageName(bytes32 _name) public pure returns (bool) {
    // each character must be in the supported charset

    for (uint i = 0; i < 32; i++) {
      if (_name[i] == bytes1(0)) {
        // must be long enough
        if (i < MIN_PACKAGE_NAME_LENGTH) {
          return false;
        }

        // last character cannot be `-`
        if (_name[i - 1] == "-") {
          return false;
        }

        break;
      }

      // must be in valid character set
      if (
        (_name[i] < "0" || _name[i] > "9") &&
        (_name[i] < "a" || _name[i] > "z") &&
        // first character cannot be `-`
        (i == 0 || _name[i] != "-")
      ) {
        return false;
      }
    }

    return true;
  }

  function publish(
    bytes32 _packageName,
    bytes32 _packageVersionName,
    bytes32[] memory _packageTags,
    string memory _packageVersionUrl
  ) external {
    if (_packageTags.length > 5) {
      revert TooManyTags();
    }

    if (bytes(_packageVersionUrl).length == 0) {
      revert InvalidUrl(_packageVersionUrl);
    }

    Package storage _p = _store().packages[_packageName];

    if (_p.owner != address(0) && _p.owner != msg.sender) {
      revert Unauthorized();
    }

    if (_p.owner == address(0)) {
      if (!validatePackageName(_packageName)) {
        revert InvalidName(_packageName);
      }

      _p.owner = msg.sender;
    }

    if (bytes(_p.versionUrls[_packageVersionName]).length == 0) {
      _p.versions.push(_packageVersionName);
    }

    _p.versionUrls[_packageVersionName] = _packageVersionUrl;

    for (uint i = 0; i < _packageTags.length; i++) {
      bytes32 _tag = _packageTags[i];

      if (bytes(_p.versionUrls[_tag]).length == 0) {
        _p.versions.push(_tag);
      }

      _p.versionUrls[_tag] = _packageVersionUrl;
    }

    emit PackagePublish(_packageName, _packageVersionName, _packageTags, _packageVersionUrl, msg.sender);
  }

  function nominatePackageOwner(bytes32 _packageName, address _newPackageOwner) external {
    Package storage _p = _store().packages[_packageName];

    if (_p.owner != msg.sender) {
      revert Unauthorized();
    }

    _p.nominatedOwner = _newPackageOwner;
  }

  function acceptPackageOwnership(bytes32 _packageName) external {
    Package storage _p = _store().packages[_packageName];

    address newOwner = _p.nominatedOwner;

    if (msg.sender != newOwner) {
      revert Unauthorized();
    }

    _p.owner = newOwner;
    _p.nominatedOwner = address(0);
  }

  function getPackageNominatedOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].nominatedOwner;
  }

  function getPackageVersions(bytes32 _packageName) external view returns (bytes32[] memory) {
    return _store().packages[_packageName].versions;
  }

  function getPackageUrl(bytes32 _packageName, bytes32 _packageVersionName) external view returns (string memory) {
    return _store().packages[_packageName].versionUrls[_packageVersionName];
  }
}
