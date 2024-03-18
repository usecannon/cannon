//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnedUpgradable} from "./OwnedUpgradable.sol";
import {EfficientStorage} from "./EfficientStorage.sol";
import {ERC2771Context} from "./ERC2771Context.sol";

import { IOptimismL1Sender } from "./IOptimismL1Sender.sol";
import { IOptimismL2Receiver } from "./IOptimismL2Receiver.sol";

contract CannonRegistry is EfficientStorage, OwnedUpgradable {
  IOptimismL1Sender private constant OPTIMISM_MESSENGER = IOptimismL1Sender(0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1);
  IOptimismL2Receiver private constant OPTIMISM_RECEIVER = IOptimismL2Receiver(0x4200000000000000000000000000000000000007);


  using SetUtil for SetUtil.Bytes32Set;

  error Unauthorized();
  error InvalidUrl(string url);
  error InvalidName(bytes32 name);
  error InvalidTags();
  error PackageNotFound();
  error FeeRequired(uint256 amount);
  error WrongChain();

  event PackageRegistered(
    bytes32 indexed name,
    address registrant
  );
  event PackageOwnerNominated(
    bytes32 indexed name,
    address currentOwner,
    address nominatedOwner
  );
  event PackageOwnerChanged(
    bytes32 indexed name,
    address owner
  );
  event PackagePublish(
    bytes32 indexed name,
    bytes32 indexed tag,
    bytes32 indexed variant,
    string deployUrl,
    string metaUrl,
    address owner
  );
  event PackageUnpublish(
    bytes32 indexed name,
    bytes32 indexed tag,
    bytes32 indexed variant,
    address owner
  );
  event PackageVerify(bytes32 indexed name, address indexed verifier);
  event PackageUnverify(bytes32 indexed name, address indexed verifier);

  uint256 public constant MIN_PACKAGE_NAME_LENGTH = 3;
  uint256 public publishFee = 0 wei;
  uint256 public registerFee = 0 wei;

  function validatePackageName(bytes32 _name) public pure returns (bool) {
    // each character must be in the supported charset

    for (uint256 i = 0; i < 32; i++) {
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

  function setFees(uint256 _publishFee, uint256 _registerFee) external onlyOwner {
    publishFee = _publishFee;
    registerFee = _registerFee;
  }

  function publish(
    bytes32 _packageName,
    bytes32 _variant,
    bytes32[] memory _packageTags,
    string memory _packageDeployUrl,
    string memory _packageMetaUrl
  ) external payable {
    if (msg.value != publishFee) {
      revert FeeRequired(publishFee);
    }

    if (_packageTags.length == 0 || _packageTags.length > 5) {
      revert InvalidTags();
    }

    if (bytes(_packageDeployUrl).length == 0) {
      revert InvalidUrl(_packageDeployUrl);
    }

    Package storage _p = _store().packages[_packageName];

    address owner = _p.owner;

    if (owner != ERC2771Context._msgSender()) {
      uint256 additionalDeployersLength = _p.additionalDeployersLength;
      bool foundAdditionalDeployer = false;
      for (uint256 i = 0; i < additionalDeployersLength; i++) {
        foundAdditionalDeployer = foundAdditionalDeployer || _p.additionalDeployers[i] == ERC2771Context._msgSender();
      }

      if (!foundAdditionalDeployer) {
        revert Unauthorized();
      }
    }

    bytes16 packageDeployString = bytes16(_writeString(_packageDeployUrl));
    bytes16 packageMetaString = bytes16(_writeString(_packageMetaUrl));

    bytes32 _firstTag = _packageTags[0];
    _p.deployments[_firstTag][_variant] = CannonDeployInfo({deploy: packageDeployString, meta: packageMetaString});
    CannonDeployInfo storage _deployInfo = _p.deployments[_firstTag][_variant];
    emit PackagePublish(_packageName, _firstTag, _variant, _packageDeployUrl, _packageMetaUrl, ERC2771Context._msgSender());

    if (_packageTags.length > 1) {
      for (uint256 i = 1; i < _packageTags.length; i++) {
        bytes32 _tag = _packageTags[i];
        _p.deployments[_tag][_variant] = _deployInfo;

        emit PackagePublish(_packageName, _tag, _variant, _packageDeployUrl, _packageMetaUrl, ERC2771Context._msgSender());
      }
    }
  }

  function unpublish(
    bytes32 _packageName,
    bytes32 _variant,
    bytes32[] memory _packageTags
  ) external {
    Package storage _p = _store().packages[_packageName];

    address owner = _p.owner;

    if (owner != ERC2771Context._msgSender()) {
      uint256 additionalDeployersLength = _p.additionalDeployersLength;
      bool foundAdditionalDeployer = false;
      for (uint256 i = 0; i < additionalDeployersLength; i++) {
        foundAdditionalDeployer = foundAdditionalDeployer || _p.additionalDeployers[i] == ERC2771Context._msgSender();
      }

      if (!foundAdditionalDeployer) {
        revert Unauthorized();
      }
    }

    for (uint256 i = 0; i < _packageTags.length; i++) {
      bytes32 _tag = _packageTags[i];
      _p.deployments[_tag][_variant] = CannonDeployInfo({deploy: "", meta: ""});

      emit PackageUnpublish(_packageName, _tag, _variant, ERC2771Context._msgSender());
    }
  }
  
  function setPackageOwnership(bytes32 _packageName, address _owner) external payable {
    Package storage _p = _store().packages[_packageName];

    if (ERC2771Context._msgSender() == address(OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    } else if (block.chainid == 1) {
      address owner = _p.owner;
      // we cannot change owner if its already owned and the nominated owner is incorrect
      if (owner != address(0) && (ERC2771Context._msgSender() != _owner || _owner != _p.nominatedOwner)) {
        revert Unauthorized();
      }

      // package new or old check
      if (owner == address(0) && msg.value != registerFee) {
        revert FeeRequired(registerFee);
      } else if (owner == address(0)) {
        emit PackageRegistered(_packageName, ERC2771Context._msgSender());
      }

      // name must be valid in order to register package
      if (owner == address(0) && !validatePackageName(_packageName)) {
        revert InvalidName(_packageName);
      }

      OPTIMISM_MESSENGER.sendMessage(
        address(this),
        abi.encodeWithSelector(this.setPackageOwnership.selector, _packageName, _owner),
        200000
      );
    } else {
      revert Unauthorized();
    }

    _p.owner = _owner;
    _p.additionalDeployersLength = 0;
    emit PackageOwnerChanged(_packageName, _owner);
  }

  function setAdditionalPublishers(bytes32 _packageName, address[] memory _additionalDeployers) external {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner;

    if (ERC2771Context._msgSender() == address(OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    }
    else if (block.chainid == 1) {
      if (owner != ERC2771Context._msgSender()) {
        revert Unauthorized();
      }

      OPTIMISM_MESSENGER.sendMessage(
        address(this),
        abi.encodeWithSelector(this.setAdditionalPublishers.selector, _packageName, _additionalDeployers),
        uint32(30000 * _additionalDeployers.length + 200000)
      );
    } else {
      revert Unauthorized();
    }

    for (uint256 i = 0; i < _additionalDeployers.length; i++) {
      _p.additionalDeployers[i] = _additionalDeployers[i];
    }

    _p.additionalDeployersLength = _additionalDeployers.length;
  }

  
  function getAdditionalPublishers(bytes32 _packageName) external view returns (address[] memory additionalDeployers) {
    Package storage _p = _store().packages[_packageName];
    additionalDeployers = new address[](_p.additionalDeployersLength);

    for (uint256 i = 0; i < additionalDeployers.length; i++) {
      additionalDeployers[i] = _p.additionalDeployers[i];
    }
  }

  function nominatePackageOwner(bytes32 _packageName, address _newPackageOwner) external {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner;

    if (owner != ERC2771Context._msgSender()) {
      revert Unauthorized();
    }

    _p.nominatedOwner = _newPackageOwner;
    emit PackageOwnerNominated(_packageName, ERC2771Context._msgSender(), _newPackageOwner);
  }

  function verifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageVerify(_packageName, ERC2771Context._msgSender());
  }

  function unverifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageUnverify(_packageName, ERC2771Context._msgSender());
  }

  function getPackageOwner(bytes32 _packageName) external view returns (address) {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner;
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

    return v;
  }

  function _checkCrossDomainSender() internal {
    // we can only receive change ownership requests from our counterpart on mainnnet
    if (OPTIMISM_RECEIVER.xDomainMessageSender() != address(this)) {
      revert Unauthorized();
    }
  }

  function _propogatePackageOwner(bytes32 _packageName, address _owner, address[] memory _additionalDeployers) internal {
    if (block.chainid != 1) {
      return;
    }

  }

  function _writeString(string memory str) internal returns (bytes32) {
    bytes16 k = bytes16(keccak256(bytes(str)));

    if (bytes(_store().strings[k]).length == 0) {
      _store().strings[k] = str;
    }

    return k;
  }
}
