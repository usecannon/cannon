# Testing Patterns

## Setup

Cannon integrates with Foundry for testing. Use `cannon-std` library to access deployed contracts in tests.

**Important:** Foundry needs filesystem access to read Cannon state files. Add to your `foundry.toml`:

```toml
[profile.default]
fs_permissions = [{ access = "read", path = "./"}]
```

## Basic Test Structure

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "cannon-std/Cannon.sol";

contract MyContractTest is Test {
    using Cannon for Vm;

    address myContract;
    
    function setUp() public {
        // Load deployed contract from cannon build
        myContract = vm.getAddress("MyContract");
    }
}
```

## cannon-std Helpers

All helpers are called on `vm`:

```solidity
address contractAddr = vm.getAddress("ContractName");
bytes memory abi = vm.getAbi("ContractName");
bytes memory bytecode = vm.getBytecode("ContractName");
```

## Running Tests

```bash
# Run all tests
cannon test

# Run specific test file
cannon test --match-path "test/MyContract.t.sol"

# Run specific test function
cannon test --match-test "testTransfer"

# Verbose output
cannon test -vvvv
```

## Test Patterns

### Testing Deployed State

```solidity
contract TokenTest is Test {
    using Cannon for Vm;

    address token;
    
    function setUp() public {
        token = vm.getAddress("Token");
    }
    
    function test_InitialState() public view {
        assertEq(Token(token).name(), "My Token");
        assertEq(Token(token).symbol(), "MTK");
        assertEq(Token(token).totalSupply(), 1000000 * 10**18);
    }
}
```

### Testing Cross-Contract Interactions

```solidity
contract RouterTest is Test {
    using Cannon for Vm;

    address router;
    address token;
    
    function setUp() public {
        router = vm.getAddress("Router");
        token = vm.getAddress("Token");
    }
    
    function test_Route() public {
        vm.prank(owner);
        Router(router).route(token, 1000);
    }
}
```

### Testing with Impersonation

```solidity
function test_OwnerAction() public {
    address owner = vm.getAddress("Owner");
    address myContract = vm.getAddress("MyContract");
    
    vm.prank(owner);
    MyContract(myContract).ownerOnlyFunction();
}
```

### Testing Upgrades

```solidity
function test_Upgrade() public {
    address proxy = vm.getAddress("Proxy");
    address newImpl = vm.getAddress("NewImplementation");
    
    vm.prank(owner);
    Proxy(proxy).upgradeTo(newImpl);
}
```

## Best Practices

1. **Use `using Cannon for Vm`** — Enables `vm.getAddress()` and other helpers
2. **Configure fs_permissions** — Foundry needs read access to load Cannon state
3. **Use setUp()** — Load deployed contracts once at the start
4. **Test deployment state first** — Verify initial conditions before interactions
5. **Use vm.prank** — Test access control by impersonating different addresses
6. **Run cannon build before tests** — Ensure fresh deployment state
