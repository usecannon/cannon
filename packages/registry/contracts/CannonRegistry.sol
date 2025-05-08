//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SetUtil} from "@synthetixio/core-contracts/contracts/utils/SetUtil.sol";
import {OwnedUpgradableUpdated} from "./OwnedUpgradableUpdated.sol";
import {EfficientStorage} from "./EfficientStorage.sol";
import {ERC2771Context} from "./ERC2771Context.sol";
import {IOptimismL1Sender} from "./IOptimismL1Sender.sol";
import {IOptimismL2Receiver} from "./IOptimismL2Receiver.sol";
import {CannonSubscription} from "./CannonSubscription.sol";

/**
 * @title An on-chain record of contract deployments with Cannon
 * See https://usecannon.com
 */
contract CannonRegistry is EfficientStorage, OwnedUpgradableUpdated {
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
  uint256 public constant MAX_PACKAGE_PUBLISH_TAGS = 5;
  uint256 public unused = 0 wei;
  uint256 public unused2 = 0 wei;

  IOptimismL1Sender private immutable _OPTIMISM_MESSENGER;
  IOptimismL2Receiver private immutable _OPTIMISM_RECEIVER;
  uint256 private immutable _L1_CHAIN_ID;
  CannonSubscription private immutable _CANNON_SUBSCRIPTION;

  /**
   * @notice Initializes the immutable fields for this contract implementation
   * @param _optimismMessenger the address of the bridge contract from L1 to L2
   * @param _optimismReceiver the address of the bridge contract which receives message on L2
   * @param _l1ChainId the L1 deployment of the registry. For example, sepolia would have argument `11155111` here.
   */
  constructor(address _optimismMessenger, address _optimismReceiver, uint256 _l1ChainId, address _cannonSubscription) {
    _OPTIMISM_MESSENGER = IOptimismL1Sender(_optimismMessenger); // IOptimismL1Sender(0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1)
    _OPTIMISM_RECEIVER = IOptimismL2Receiver(_optimismReceiver); // IOptimismL2Receiver(0x4200000000000000000000000000000000000007)
    _L1_CHAIN_ID = _l1ChainId; // 1
    _CANNON_SUBSCRIPTION = CannonSubscription(_cannonSubscription);
  }

  function getCannonSubscription() external view returns (address) {
    return address(_CANNON_SUBSCRIPTION);
  }

  /**
   * @notice Allows for owner to withdraw all collected fees.
   */
  function withdraw() external onlyOwner {
    uint256 amount = address(this).balance;

    // we check that the send amount is not 0 just in case, the contract is unexpectedly empty, would save the owner some gas.
    if (amount == 0) {
      revert WithdrawFail(0);
    }

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

    // has the required fee been supplied
    if (msg.value < store.publishFee) {
      revert FeeRequired(store.publishFee);
    }

    _publish(_packageName, _variant, _packageTags, _packageDeployUrl, _packageMetaUrl);
  }

  function publishWithSubscription(
    bytes32 _packageName,
    bytes32 _variant,
    bytes32[] memory _packageTags,
    string memory _packageDeployUrl,
    string memory _packageMetaUrl
  ) external {
    _CANNON_SUBSCRIPTION.useMembershipCredits(ERC2771Context.msgSender(), 1);
    _publish(_packageName, _variant, _packageTags, _packageDeployUrl, _packageMetaUrl);
  }

  function _publish(
    bytes32 _packageName,
    bytes32 _variant,
    bytes32[] memory _packageTags,
    string memory _packageDeployUrl,
    string memory _packageMetaUrl
  ) internal {
    Store storage store = _store();

    // do we have tags for the package, and not an excessive number
    if (_packageTags.length == 0 || _packageTags.length > MAX_PACKAGE_PUBLISH_TAGS) {
      revert InvalidTags();
    }

    // the deploy url must not be unset (its ok if meta is empty)
    if (bytes(_packageDeployUrl).length == 0) {
      revert InvalidUrl(_packageDeployUrl);
    }

    // load data related to the package
    Package storage _p = store.packages[_packageName];
    address sender = ERC2771Context.msgSender();

    // must have permission for this package
    if (!_canPublishPackage(_p, sender)) {
      revert Unauthorized();
    }

    // write the deploy and meta urls to the strings storage--we will reference indirectly with their bytes16 accessor
    bytes16 packageDeployString = bytes16(_writeString(_packageDeployUrl));
    bytes16 packageMetaString = bytes16(_writeString(_packageMetaUrl));

    // set the first package deploy version info (always the first tag)
    bytes32 _firstTag = _packageTags[0];
    _p.deployments[_firstTag][_variant] = CannonDeployInfo({deploy: packageDeployString, meta: packageMetaString});
    CannonDeployInfo storage _deployInfo = _p.deployments[_firstTag][_variant];
    emit PackagePublishWithFee(_packageName, _firstTag, _variant, _packageDeployUrl, _packageMetaUrl, sender, msg.value);

    if (_packageTags.length > 1) {
      // all the tags should get the same deploy info, but the event will be different
      for (uint256 i = 1; i < _packageTags.length; i++) {
        bytes32 _tag = _packageTags[i];
        _p.deployments[_tag][_variant] = _deployInfo;

        emit TagPublish(_packageName, _variant, _tag, _firstTag);
      }
    }
  }

  /**
   * @notice Removes a package from the registry. This can be useful if a package on ethereum or optimism is taking undesired precedence, or
   * if the owner simply wants to clean up the display of their protocol on the website
   * @param _packageName The namespace to remove the package from
   * @param _variant The variant to remove (see publish)
   * @param _packageTags A list of tags to deregister
   */
  function unpublish(bytes32 _packageName, bytes32 _variant, bytes32[] memory _packageTags) external {
    // load data related to the package
    Package storage _p = _store().packages[_packageName];
    address sender = ERC2771Context.msgSender();

    // must have permission
    if (!_canPublishPackage(_p, sender)) {
      revert Unauthorized();
    }

    for (uint256 i = 0; i < _packageTags.length; i++) {
      bytes32 _tag = _packageTags[i];

      // zero out package data (basically empty strings)
      _p.deployments[_tag][_variant] = CannonDeployInfo({deploy: "", meta: ""});

      emit PackageUnpublish(_packageName, _tag, _variant, sender);
    }
  }

  /**
   * @notice Changes the ownership of a package, or registers it if the package does not exist. This function can only be generally accessed on the L1
   * (on L2, only the brideg may call this function)
   * @param _packageName The namespace to change ownership or register
   * @param _owner The new owner of this package.
   */
  function setPackageOwnership(bytes32 _packageName, address _owner) external payable {
    Store storage store = _store();
    Package storage _p = store.packages[_packageName];
    address sender = ERC2771Context.msgSender();

    // this function can only be called by the bridge on L2, so separate that right off the bat
    // all the other checks are not needed on L2
    // the condition is built the way it is to make testing much easier
    if (sender == address(_OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    } else if (block.chainid == _L1_CHAIN_ID) {
      // load the package owner
      address owner = _p.owner;

      // is package already registered or not? what we do depends on that
      if (owner == address(0)) {
        // new packages may need to pay a fee
        if (msg.value < store.registerFee) {
          revert FeeRequired(store.registerFee);
        }

        // name must be valid in order to register package
        if (!validatePackageName(_packageName)) {
          revert InvalidName(_packageName);
        }

        // emit the proper event here (yes not standard check-write-event pattern)
        emit PackageRegistered(_packageName, sender);
      } else {
        if (sender != _owner || _owner != _p.nominatedOwner) {
          revert Unauthorized();
        }
      }

      // once everything is confirmed, we need to send a message to L2 to ensure it gets the same setting
      _OPTIMISM_MESSENGER.sendMessage(
        address(this),
        abi.encodeWithSelector(this.setPackageOwnership.selector, _packageName, _owner),
        200000
      );
    } else {
      revert WrongChain(_L1_CHAIN_ID);
    }

    // set the data
    _p.owner = _owner;

    // we also want to clear out any data that may remain from the previous owner
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

    // this function can only be called by the bridge on L2, so separate that right off the bat
    // all the other checks are not needed on L2
    // the condition is built the way it is to make testing much easier
    if (ERC2771Context.msgSender() == address(_OPTIMISM_RECEIVER)) {
      _checkCrossDomainSender();
    } else if (block.chainid == _L1_CHAIN_ID) {
      // only owner can set additonal publishers
      if (owner != ERC2771Context.msgSender()) {
        revert Unauthorized();
      }

      // sync with optimism
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
      revert WrongChain(_L1_CHAIN_ID);
    }

    // which additonal publishers list we use depends on the chain
    address[] memory additionalPublishers = block.chainid == _L1_CHAIN_ID
      ? _additionalPublishersEthereum
      : _additionalPublishersOptimism;

    // replace each additional publisher one at a time
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

    // only the package owner can nominate a new owner
    if (owner != sender) {
      revert Unauthorized();
    }

    // set the requested data
    _p.nominatedOwner = _newPackageOwner;
    emit PackageOwnerNominated(_packageName, sender, _newPackageOwner);
  }

  /**
   * @notice Allows an address to endorse a published package for legitimacy by recording an event on-chain
   * @param _packageName The package to endorse
   */
  function verifyPackage(bytes32 _packageName) external {
    // only registered packages can be verified
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
    // only registered packages can be verified (and correspondingly, unverified)
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
    // to ensure that the same string is always stored in the same slot, we hash it and concat to a bytes16 so it can be fit into a storage slot easier
    bytes16 k = bytes16(keccak256(bytes(str)));

    // save some gas by not rewriting all the slots. also prevents some future url which is intentionally
    // gennerated to match a previously set hash (unlikely and expensive, but not impossible) from rewriting the data
    if (bytes(_store().strings[k]).length == 0) {
      _store().strings[k] = str;
    }

    return k;
  }
}
