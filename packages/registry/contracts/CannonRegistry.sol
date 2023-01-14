//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {Storage} from "./Storage.sol";

import "./misc/SetUtil.sol";

import "./OwnedUpgradable.sol";

contract CannonRegistry is Storage, OwnedUpgradable {
  using SetUtil for SetUtil.Bytes32Set;

  error Unauthorized();
  error InvalidUrl(string url);
  error InvalidName(bytes32 name);
  error TooManyTags();
  error PackageNotFound();

  event PackagePublish(bytes32 indexed name, bytes32[] indexed tags, bytes32 variant, string deployUrl, string metaUrl, address owner);
  event PackageVerify(bytes32 indexed name, address indexed verifier);
  event PackageUnverify(bytes32 indexed name, address indexed verifier);

  uint public constant MIN_PACKAGE_NAME_LENGTH = 3;

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
    bytes32 _variant,
    bytes32[] memory _packageTags,
    string memory _packageVersionUrl,
    string memory _packageMetaUrl
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

    for (uint i = 0; i < _packageTags.length; i++) {
      bytes32 _tag = _packageTags[i];
      _p.deployments[_tag][_variant] = CannonDeployInfo({
        deploy: _packageVersionUrl,
        meta: _packageMetaUrl
      });

      _p.versions.add(_tag);
    }

    emit PackagePublish(_packageName, _packageTags, _variant, _packageVersionUrl, _packageMetaUrl, msg.sender);
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

  function verifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageVerify(_packageName, msg.sender);
  }

  function unverifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageUnverify(_packageName, msg.sender);
  }

  function getPackageOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].owner;
  }

  function getPackageNominatedOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].nominatedOwner;
  }

  function getPackageVersions(bytes32 _packageName) external view returns (bytes32[] memory) {
    return _store().packages[_packageName].versions.values();
  }

  function getPackageUrl(
    bytes32 _packageName,
    bytes32 _packageVersionName,
    bytes32 _packageVariant
  ) external view returns (string memory) {
    return _store().packages[_packageName].deployments[_packageVersionName][_packageVariant].deploy;
  }

  function getPackageMeta(

    bytes32 _packageName,
    bytes32 _packageVersionName,
    bytes32 _packageVariant
  ) external view returns (string memory) {
    return _store().packages[_packageName].deployments[_packageVersionName][_packageVariant].meta;
  }
}
