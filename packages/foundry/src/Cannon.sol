import "forge-std/Vm.sol";

library Cannon {
    function getAddress(Vm vm, string memory name) external returns (address) {    
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployments/test/", name, ".json");
        bytes memory addr = vm.parseJson(vm.readFile(path), ".address");
        return abi.decode(addr, (address));
    }
}