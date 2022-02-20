//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract CannonRegistry {
  error Unauthorized();
  error InvalidUrl();

  event ProtocolPublish(bytes32 indexed name, bytes32 indexed version, bytes32[] indexed tags, string url, address owner);

  mapping(bytes32 => mapping(bytes32 => string)) public urls;
  mapping(bytes32 => address) public owners;

  bytes32[] public protocols;
  mapping(bytes32 => bytes32[]) versions;

  mapping(bytes32 => address) public nominatedOwner;

  function publish(bytes32 _name, bytes32 _version, bytes32[] memory _tags, string memory _url) external {
    if (bytes(_url).length == 0) {
      revert InvalidUrl();
    }

    if (owners[_name] != address(0) && owners[_name] != msg.sender) {
      revert Unauthorized();
    }

    if (owners[_name] == address(0)) {
      owners[_name] = msg.sender;
      protocols.push(_name);
    }

    if (bytes(urls[_name][_version]).length == 0) {
      versions[_name].push(_version);
    }

    urls[_name][_version] = _url;

    for (uint i = 0;i < _tags.length;i++) {
      urls[_name][_tags[i]] = _url;
    }

    emit ProtocolPublish(_name, _version, _tags, _url, msg.sender);
  }

  function nominateNewOwner(bytes32 _name, address _newOwner) external {
    if (owners[_name] != msg.sender) {
      revert Unauthorized();
    }

    nominatedOwner[_name] = _newOwner;
  }

  function acceptOwnership(bytes32 _name) external {
    address newOwner = nominatedOwner[_name];

    if (msg.sender != newOwner) {
      revert Unauthorized();
    }

    owners[_name] = newOwner;
    nominatedOwner[_name] = address(0);
  }

  function getProtocols() view external returns (bytes32[] memory) {
    return protocols;
  }

  function getVersions(bytes32 _protocolName) view external returns (bytes32[] memory) {
    return versions[_protocolName];
  }

  function getUrl(bytes32 _protocolName, bytes32 _protocolVersion) view external returns (string memory) {
    return urls[_protocolName][_protocolVersion];
  }
}
