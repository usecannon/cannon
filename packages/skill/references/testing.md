# Testing Patterns

## Setup

Cannon integrates with Foundry for testing. Use `cannon-std` library to access deployed contracts in tests.

```solidity
import {Test} from "forge-std/Test.sol";
import {Cannon} from "cannon-std/Cannon.sol";

contract MyContractTest is Test, Cannon {
    address myContract;
    
    function setUp() public {
        // Load deployed contract from cannon build
        myContract = getAddress("MyContract");
    }
}
```

## cannon-std Helpers

### getAddress
```solidity
address contract = getAddress("ContractName");
```

### getAbi
```solidity
bytes memory abi = getAbi("ContractName");
```

### getBytecode
```solidity
bytes memory bytecode = getBytecode("ContractName");
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
contract TokenTest is Test, Cannon {
    address token;
    
    function setUp() public {
        token = getAddress("Token");
    }
    
    function test_InitialState() public {
        assertEq(Token(token).name(), "My Token");
        assertEq(Token(token).symbol(), "MTK");
        assertEq(Token(token).totalSupply(), 1000000 * 10**18);
    }
}
```

### Testing Cross-Contract Interactions

```solidity
contract RouterTest is Test, Cannon {
    address router;
    address token;
    
    function setUp() public {
        router = getAddress("Router");
        token = getAddress("Token");
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
    address owner = getAddress("Owner");
    address contract = getAddress("MyContract");
    
    vm.prank(owner);
    MyContract(contract).ownerOnlyFunction();
}
```

### Testing Upgrades

```solidity
function test_Upgrade() public {
    address proxy = getAddress("Proxy");
    address newImpl = getAddress("NewImplementation");
    
    vm.prank(owner);
    Proxy(proxy).upgradeTo(newImpl);
}
```

## Best Practices

1. **Use setUp()** to load deployed contracts
2. **Test deployment state** first, then interactions
3. **Use vm.prank** to test access control
4. **Test edge cases** with different settings values
5. **Run cannon build** before tests to ensure fresh deployment
