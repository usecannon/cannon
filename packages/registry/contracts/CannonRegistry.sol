//SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract CannonRegistry {
  error Unauthorized();
  error InvalidUrl();

  event ProtocolPublish(bytes32 name, bytes32 version, string url, address owner);

  mapping(bytes32 => mapping(bytes32 => string)) urls;
  mapping(bytes32 => address) owners;

  bytes32[] protocols;
  mapping(bytes32 => bytes32[]) versions;

  function publish(bytes32 _name, bytes32 _version, string memory _url) external {
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

    emit ProtocolPublish(_name, _version, _url, msg.sender);
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
