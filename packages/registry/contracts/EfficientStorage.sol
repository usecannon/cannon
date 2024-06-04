//SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title Revision of storage for CannonRegistry
 */
contract EfficientStorage {
  bytes32 private constant _SLOT_CANNON_REGISTRY_STORAGE = keccak256(abi.encode("usecannon.cannon.registry.efficient"));

  struct Store {
    /**
     * @notice Stores as a replacement for `string` types to save storage on duplicated values
     */
    mapping(bytes16 => string) strings;
    /**
     * @notice Associates a package name (encoded as a 0 byte terminated string) to its data
     */
    mapping(bytes32 => Package) packages;
    /**
     * Unused from previous iteration of the registry
     */
    mapping(address => bool) _unused;
    /**
     * @notice The amount of ETH required to publish a package
     */
    uint256 publishFee;
    /**
     * @notice The amount of ETh required to register a new package
     */
    uint256 registerFee;
  }

  /**
   * @title Data associated with a single package name
   */
  struct Package {
    /**
     * @notice Associates a version or tag (the first bytes32) and variant (the second bytes32) with an individual package deployment
     */
    mapping(bytes32 => mapping(bytes32 => CannonDeployInfo)) deployments;
    /**
     * @notice Address who has the ability to change the `additionalPublishers`
     */
    address owner;
    /**
     * @notice Address who can become owner
     */
    address nominatedOwner;
    /**
     * @notice The number of additional publishers (see additionalPublishers)
     */
    uint256 additionalPublishersLength;
    /**
     * @notice A list of addresses permitted to deploy packages. Only addresses in the range 0 to `additionalPublishersLength` are valid.
     */
    mapping(uint256 => address) additionalPublishers;
  }

  /**
   * @title Data associated with an individual package deployment instance
   */
  struct CannonDeployInfo {
    /**
     * @notice The URL of the deployment. The actual URL is stored in `strings`
     */
    bytes16 deploy;
    /**
     * @notice The URL of the additional package information metadata. The actual URL is stored in `strings`
     */
    bytes16 meta;
  }

  /**
   * @notice Retrieves the `Store` instance
   */
  function _store() internal pure returns (Store storage store) {
    bytes32 s = _SLOT_CANNON_REGISTRY_STORAGE;

    assembly {
      store.slot := s
    }
  }
}
