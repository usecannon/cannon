//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnedUpgradable} from "./OwnedUpgradable.sol";
import {EfficientStorage} from "./EfficientStorage.sol";
import {Storage} from "./Storage.sol";

contract CannonRegistry is Storage, EfficientStorage, OwnedUpgradable {
  using SetUtil for SetUtil.Bytes32Set;

  error Unauthorized();
  error InvalidUrl(string url);
  error InvalidName(bytes32 name);
  error InvalidTags();
  error PackageNotFound();

  event PackagePublish(
    bytes32 indexed name,
    bytes32 indexed tag,
    bytes32 indexed variant,
    string deployUrl,
    string metaUrl,
    address owner
  );
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
    string memory _packageDeployUrl,
    string memory _packageMetaUrl
  ) external {
    if (_packageTags.length == 0 || _packageTags.length > 5) {
      revert InvalidTags();
    }

    if (bytes(_packageDeployUrl).length == 0) {
      revert InvalidUrl(_packageDeployUrl);
    }

    Package storage _p = _store().packages[_packageName];

    address owner = _p.owner != address(0) ? _p.owner : _oldStore().packages[_packageName].owner;

    if (owner != address(0) && owner != msg.sender) {
      revert Unauthorized();
    }

    if (owner == address(0)) {
      if (!validatePackageName(_packageName)) {
        revert InvalidName(_packageName);
      }

      _p.owner = msg.sender;
    }

    bytes16 packageDeployString = bytes16(_writeString(_packageDeployUrl));
    bytes16 packageMetaString = bytes16(_writeString(_packageMetaUrl));

    bytes32 _firstTag = _packageTags[0];
    _p.deployments[_firstTag][_variant] = CannonDeployInfo({deploy: packageDeployString, meta: packageMetaString});
    CannonDeployInfo storage _deployInfo = _p.deployments[_firstTag][_variant];
    emit PackagePublish(_packageName, _firstTag, _variant, _packageDeployUrl, _packageMetaUrl, msg.sender);

    if (_packageTags.length > 1) {
      for (uint i = 1; i < _packageTags.length; i++) {
        bytes32 _tag = _packageTags[i];
        _p.deployments[_tag][_variant] = _deployInfo;

        emit PackagePublish(_packageName, _tag, _variant, _packageDeployUrl, _packageMetaUrl, msg.sender);
      }
    }
  }

  function nominatePackageOwner(bytes32 _packageName, address _newPackageOwner) external {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner != address(0) ? _p.owner : _oldStore().packages[_packageName].owner;

    if (owner != msg.sender) {
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
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner != address(0) ? _p.owner : _oldStore().packages[_packageName].owner;
    return owner;
  }

  function getPackageNominatedOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].nominatedOwner;
  }

  function getPackageUrl(
    bytes32 _packageName,
    bytes32 _packageVersionName,
    bytes32 _packageVariant
  ) external view returns (string memory) {
    string memory v = _store().strings[
      _store().packages[_packageName].deployments[_packageVersionName][_packageVariant].deploy
    ];

    if (bytes(v).length == 0) {
      v = _oldStore().packages[_packageName].deployments[_packageVersionName][_packageVariant].deploy;
    }

    return v;
  }

  function getPackageMeta(
    bytes32 _packageName,
    bytes32 _packageVersionName,
    bytes32 _packageVariant
  ) external view returns (string memory) {
    string memory v = _store().strings[
      _store().packages[_packageName].deployments[_packageVersionName][_packageVariant].meta
    ];

    if (bytes(v).length == 0) {
      v = _oldStore().packages[_packageName].deployments[_packageVersionName][_packageVariant].meta;
    }

    return v;
  }

  function _writeString(string memory str) internal returns (bytes32) {
    bytes16 k = bytes16(keccak256(bytes(str)));

    if (bytes(_store().strings[k]).length == 0) {
      _store().strings[k] = str;
    }

    return k;
  }

  // @title Function that enables calling multiple methods of the system in a single transaction.
  // @dev Implementation adapted from https://github.com/Uniswap/v3-periphery/blob/main/contracts/base/Multicall.sol
  function multicall(bytes[] calldata data) public payable returns (bytes[] memory results) {
    results = new bytes[](data.length);

    for (uint256 i = 0; i < data.length; i++) {
      (bool success, bytes memory result) = address(this).delegatecall(data[i]);

      if (!success) {
        // Next 6 lines from https://ethereum.stackexchange.com/a/83577
        // solhint-disable-next-line reason-string
        if (result.length < 68) revert();

        assembly {
          result := add(result, 0x04)
        }

        revert(abi.decode(result, (string)));
      }

      results[i] = result;
    }
  }
}
