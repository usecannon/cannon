//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnedUpgradable} from "./OwnedUpgradable.sol";
import {EfficientStorage} from "./EfficientStorage.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {IOptimismL1Sender} from "./IOptimismL1Sender.sol";
import {IOptimismL2Receiver} from "./IOptimismL2Receiver.sol";

contract CannonRegistry is EfficientStorage, OwnedUpgradable {
  using SetUtil for SetUtil.Bytes32Set;

  /**
   * @notice Thrown when the address interacting with the contract is not permitted to do the specified operation
   */
  error Unauthorized();

  /**
   * @notice Thrown when the URL doesn't match expected format
   */
  error InvalidUrl(string url);

  /**
   * @notice Thrown when the name of a package does not meet cannon package name requirements (see validatePackageName)
   */
  error InvalidName(bytes32 name);

  /**
   * @notice Thrown when the number of tags to register for a package is too small or too large
   */
  error InvalidTags();
  
  /**
   * @notice Thrown when the specified package has not been registered or has not been published
   */
  error PackageNotFound();

  /**
   * @notice See ERC7412. Thrown when the supplied payable amount is insufficient for the current operation. Can be used to discover the required fee/payment
   */
  error FeeRequired(uint256 amount);
  
  /**
   * @notice Thrown when the operation cannot be performed on the current chain
   */
  error WrongChain(uint256 expectedChainId);
  
  /**
   * @notice Thrown when there was a problem withdrawing collected fees from the contract
   */
  error WithdrawFail(uint256 withdrawAmount);

  /**
   * @notice Emitted when `setPackageOwnership` is called and a package is registered for the first time
   */
  event PackageRegistered(bytes32 indexed name, address registrant);

  /**
   * @notice Emitted when `nominatePackageOwner` is called and a new nominated package owner has been set
   */
  event PackageOwnerNominated(bytes32 indexed name, address currentOwner, address nominatedOwner);

  /**
   * @notice Emitted when `setPackageOwnership` is called and a existing package has changed its ownership address
   */
  event PackageOwnerChanged(bytes32 indexed name, address owner);

  /**
   * @notice Emitted when the current chain's list of approved publishers for a package has been changed
   */
  event PackagePublishersChanged(bytes32 indexed name, address[] publisher);

  /**
   * @notice Emitted when a package is published. NOTE: a legacy version of this event, `PackagePublish` was similar, but did not include
   * the `feePaid` argument. NOTE: this event is only emitted once for a publish, not for every tag incuded in the publish.
   * To get the tags, see `TagPublish`
   */
  event PackagePublishWithFee(
    bytes32 indexed name,
    bytes32 indexed tag,
    bytes32 indexed variant,
    string deployUrl,
    string metaUrl,
    address owner,
    uint256 feePaid
  );

  /**
   * @notice Emitted when a package is published, and an additional tag has been set. This event is emitted once for each additonal tag.
   */
  event TagPublish(bytes32 indexed name, bytes32 indexed variant, bytes32 indexed tag, bytes32 versionOfTag);

  /**
   * @notice Emitted when a package is "unpublished" and the owner would no longer like it to be listed/resolved on this network
   */
  event PackageUnpublish(bytes32 indexed name, bytes32 indexed tag, bytes32 indexed variant, address owner);

  /**
   * @notice Emitted when a package is endorsed by the given address.
   */
  event PackageVerify(bytes32 indexed name, address indexed verifier);

  /**
   * @notice Emitted when a package endorsement is withdrawn for a given address
   */
  event PackageUnverify(bytes32 indexed name, address indexed verifier);

  uint256 public constant MIN_PACKAGE_NAME_LENGTH = 3;
  uint256 public unused = 0 wei;
  uint256 public unused2 = 0 wei;

  IOptimismL1Sender private immutable _OPTIMISM_MESSENGER;
  IOptimismL2Receiver private immutable _OPTIMISM_RECEIVER;
  uint256 private immutable _L1_CHAIN_ID;

  /**
   * @notice Initializes the immutable fields for this contract implementation
   * @param _optimismMessenger the address of the bridge contract from L1 to L2
   * @param _optimismReceiver the address of the bridge contract which receives message on L2
   * @param _l1ChainId the L1 deployment of the registry. For example, sepolia would have argument `11155111` here.
   */
  constructor(address _optimismMessenger, address _optimismReceiver, uint256 _l1ChainId) {
    _OPTIMISM_MESSENGER = IOptimismL1Sender(_optimismMessenger); // IOptimismL1Sender(0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1)
    _OPTIMISM_RECEIVER = IOptimismL2Receiver(_optimismReceiver); // IOptimismL2Receiver(0x4200000000000000000000000000000000000007)
    _L1_CHAIN_ID = _l1ChainId; // 1
  }

  /**
   * @notice Allows for owner to withdraw collected fees.
   */
  function withdraw() external onlyOwner {
    uint256 amount = address(this).balance;
    (bool success, ) = msg.sender.call{value: amount}("");
    if (!success) revert WithdrawFail(amount);
  }

  /**
   * @notice Allows for the owner to change the current fees
   * @param _publishFee The new fee for publishing a package
   * @param _registerFee The new fee for registering a new package
   */
  function setFees(uint256 _publishFee, uint256 _registerFee) external onlyOwner {
    Store storage store = _store();
    store.publishFee = _publishFee;
    store.registerFee = _registerFee;
  }

  /**
   * @notice Publish a new Cannon package to the registry. In order to publish, the address must be listed as a publisher for the given package name.
   * @param _packageName The name where the package will be published. Must be valid per cannon package naming standards (see validatePackageName).
   * @param _variant This is typically in the format `${chainId}-${preset}`, where chainId is the actual network of the deployment, and preset is the human readable name given to different instances of the same package on that network
   * @param _packageTags A list of tags to assign to the package. The first tag is considered the "version" and will be used for the `PackagePublishWithFee` event, whereas the rest will be pointers through `TagPublish` event
   * @param _packageDeployUrl The URL which the cannon package data can be downloaded. Must not be empty.
   * @param _packageMetaUrl The URL which contains a freeform JSON KV store document, which can be used to store additional optional fields related to the deployment. Can be empty.
   */
  function publish(
    bytes32 _packageName,
    bytes32 _variant,
    bytes32[] memory _packageTags,
    string memory _packageDeployUrl,
    string memory _packageMetaUrl
  ) external payable {
    Store storage store = _store();

    if (msg.value < store.publishFee) {
      revert FeeRequired(store.publishFee);
    }

    if (_packageTags.length == 0 || _packageTags.length > 5) {
      revert InvalidTags();
    }

    if (bytes(_packageDeployUrl).length == 0) {
      revert InvalidUrl(_packageDeployUrl);
    }

    Package storage _p = store.packages[_packageName];
    address sender = ERC2771Context.msgSender();

    if (!_canPublishPackage(_p, sender)) {
      revert Unauthorized();
    }

    bytes16 packageDeployString = bytes16(_writeString(_packageDeployUrl));
    bytes16 packageMetaString = bytes16(_writeString(_packageMetaUrl));

    bytes32 _firstTag = _packageTags[0];
    _p.deployments[_firstTag][_variant] = CannonDeployInfo({deploy: packageDeployString, meta: packageMetaString});
    CannonDeployInfo storage _deployInfo = _p.deployments[_firstTag][_variant];
    emit PackagePublishWithFee(_packageName, _firstTag, _variant, _packageDeployUrl, _packageMetaUrl, sender, msg.value);

    if (_packageTags.length > 1) {
      for (uint256 i = 1; i < _packageTags.length; i++) {
        bytes32 _tag = _packageTags[i];
        _p.deployments[_tag][_variant] = _deployInfo;

        emit TagPublish(_packageName, _variant, _tag, _firstTag);
      }
    }
  }

  /**
   * @notice Removes a package from the registry
   * @param _packageName The namespace to remove the package from
   * @param _variant The variant to remove (see publish)
   * @param _packageTags A list of tags to deregister
   */
  function unpublish(bytes32 _packageName, bytes32 _variant, bytes32[] memory _packageTags) external {
    Package storage _p = _store().packages[_packageName];
    address sender = ERC2771Context.msgSender();

    if (!_canPublishPackage(_p, sender)) {
      revert Unauthorized();
    }

    for (uint256 i = 0; i < _packageTags.length; i++) {
      bytes32 _tag = _packageTags[i];
      _p.deployments[_tag][_variant] = CannonDeployInfo({deploy: "", meta: ""});

      emit PackageUnpublish(_packageName, _tag, _variant, sender);
    }
  }

  /**
   * @notice Changes the ownership of a package, or registers it if the package does not exist.
   * @param _packageName The namespace to change ownership or register
   * @param _owner The new owner of this package.
   */
  function setPackageOwnership(bytes32 _packageName, address _owner) external payable {
    Store storage store = _store();
    Package storage _p = store.packages[_packageName];
    address sender = ERC2771Context.msgSender();

    if (sender == address(_OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    } else if (block.chainid == _L1_CHAIN_ID) {
      address owner = _p.owner;
      // we cannot change owner if its already owned and the nominated owner is incorrect
      if (owner != address(0) && (sender != _owner || _owner != _p.nominatedOwner)) {
        revert Unauthorized();
      }

      // package new or old check
      if (owner == address(0) && msg.value < store.registerFee) {
        revert FeeRequired(store.registerFee);
      } else if (owner == address(0)) {
        emit PackageRegistered(_packageName, sender);
      }

      // name must be valid in order to register package
      if (owner == address(0) && !validatePackageName(_packageName)) {
        revert InvalidName(_packageName);
      }

      _OPTIMISM_MESSENGER.sendMessage(
        address(this),
        abi.encodeWithSelector(this.setPackageOwnership.selector, _packageName, _owner),
        200000
      );
    } else {
      revert Unauthorized();
    }

    _p.owner = _owner;
    _p.additionalPublishersLength = 0;
    _p.nominatedOwner = address(0);

    emit PackageOwnerChanged(_packageName, _owner);
  }

  /**
   * @notice Changes the authorized publishers of a package. Each network on the registry gets specified separately in case the same addreses can't be used on both networks. The previous list of authorized publishers will be deleted.
   * @param _packageName The namespace to change
   * @param _additionalPublishersEthereum The addresses who should be allowed to publish on mainnet
   * @param _additionalPublishersOptimism The addresses who should be allowed to publish on optimism
   */
  function setAdditionalPublishers(
    bytes32 _packageName,
    address[] memory _additionalPublishersEthereum,
    address[] memory _additionalPublishersOptimism
  ) external {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner;

    if (ERC2771Context.msgSender() == address(_OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    } else if (block.chainid == _L1_CHAIN_ID) {
      if (owner != ERC2771Context.msgSender()) {
        revert Unauthorized();
      }

      _OPTIMISM_MESSENGER.sendMessage(
        address(this),
        abi.encodeWithSelector(
          this.setAdditionalPublishers.selector,
          _packageName,
          new address[](0),
          _additionalPublishersOptimism
        ),
        uint32(30000 * _additionalPublishersOptimism.length + 200000)
      );
    } else {
      revert Unauthorized();
    }

    address[] memory additionalPublishers = block.chainid == _L1_CHAIN_ID
      ? _additionalPublishersEthereum
      : _additionalPublishersOptimism;

    for (uint256 i = 0; i < additionalPublishers.length; i++) {
      _p.additionalPublishers[i] = additionalPublishers[i];
    }

    _p.additionalPublishersLength = additionalPublishers.length;

    emit PackagePublishersChanged(_packageName, additionalPublishers);
  }

  /**
   * @notice Allows a package owner to signal the consent of package ownership transfer to a new address. Does not actually change the package owner. To do that, see `setPackageOwnership`.
   * @param _packageName The package to change ownership
   * @param _newPackageOwner The address of the new owner.
   */
  function nominatePackageOwner(bytes32 _packageName, address _newPackageOwner) external {
    Package storage _p = _store().packages[_packageName];
    address owner = _p.owner;
    address sender = ERC2771Context.msgSender();

    if (owner != sender) {
      revert Unauthorized();
    }

    _p.nominatedOwner = _newPackageOwner;
    emit PackageOwnerNominated(_packageName, sender, _newPackageOwner);
  }

  /**
   * @notice Allows an address to endorse a published package for legitimacy by recording an event on-chain
   * @param _packageName The package to endorse
   */
  function verifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageVerify(_packageName, ERC2771Context.msgSender());
  }

  /**
   * @notice Allows an address to revoke an endorsement of a published package for legitimacy by recording an event on-chain
   * @param _packageName The package to revoke endorsement
   */
  function unverifyPackage(bytes32 _packageName) external {
    if (_store().packages[_packageName].owner == address(0)) {
      revert PackageNotFound();
    }

    emit PackageUnverify(_packageName, ERC2771Context.msgSender());
  }

  /**
   * @notice Determines if the given _name can be used to register a package
   * @param _name the string to check if its a valid package name for registration
   */
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

  /**
   * @notice Returns the current fee to publish a package
   */
  function publishFee() public view returns (uint256) {
    return _store().publishFee;
  }

  /**
   * @notice Returns the current fee to register a new package
   */
  function registerFee() public view returns (uint256) {
    return _store().registerFee;
  }

  /**
   * @notice Returns the list of authorized publishers for the given package on this network
   * @param _packageName The package namespace to check
   */
  function getAdditionalPublishers(bytes32 _packageName) external view returns (address[] memory additionalPublishers) {
    Package storage _p = _store().packages[_packageName];
    additionalPublishers = new address[](_p.additionalPublishersLength);

    for (uint256 i = 0; i < additionalPublishers.length; i++) {
      additionalPublishers[i] = _p.additionalPublishers[i];
    }
  }

  /**
   * @notice Returns the current owner of the given _packageName
   * @param _packageName The package namespace to check
   */
  function getPackageOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].owner;
  }

  /**
   * @notice Returns the new owner address nominated by the current owner
   * @param _packageName The package namespace to check
   */
  function getPackageNominatedOwner(bytes32 _packageName) external view returns (address) {
    return _store().packages[_packageName].nominatedOwner;
  }

  /**
   * @notice Returns the recorded URL of a previously published package
   * @param _packageName The package namespace to check
   * @param _packageVersionName The tag or version of the package to check
   @ @param _variant The variant of the package to check (see publish)
   */
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

  /**
   * @notice Returns the recorded meta URL of a previously published package
   * @param _packageName The package namespace to check
   * @param _packageVersionName The tag or version of the package to check
   @ @param _variant The variant of the package to check (see publish)
   */
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

  /**
   * @notice Determines if the given _publisher is allowed to publish for the given _package
   * @param _package The package namespace to check
   * @param _publisher The address to check
   */
  function _canPublishPackage(Package storage _package, address _publisher) internal view returns (bool) {
    if (block.chainid == _L1_CHAIN_ID && _package.owner == _publisher) return true;

    uint256 additionalPublishersLength = _package.additionalPublishersLength;
    for (uint256 i = 0; i < additionalPublishersLength; i++) {
      if (_package.additionalPublishers[i] == _publisher) return true;
    }

    return false;
  }

  /**
   * @notice In case a message is expected to come from mainnet only, verifies that the sender is correct and the L1 sender matches. Only used on Optimism
   */
  function _checkCrossDomainSender() internal {
    // we can only receive change ownership requests from our counterpart on mainnnet
    if (_OPTIMISM_RECEIVER.xDomainMessageSender() != address(this)) {
      revert WrongChain(_L1_CHAIN_ID);
    }
  }

  /**
   * @notice Used to more efficiently store longer strings by generating a pointer to them
   */
  function _writeString(string memory str) internal returns (bytes32) {
    bytes16 k = bytes16(keccak256(bytes(str)));

    if (bytes(_store().strings[k]).length == 0) {
      _store().strings[k] = str;
    }

    return k;
  }
}
