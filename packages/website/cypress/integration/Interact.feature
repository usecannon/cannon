Feature: Interact page

  Scenario: Navigating to the interact page
    Given User opens the "/packages/synthetix/3.3.4/5-main" page
    * Wallet is connected
    * View renders a "h1" displaying the text "synthetix"
    * User clicks on the 1st button or link with id "interact-link"

  Scenario: Selecting Modules on the interact page
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * View renders a "button" displaying the text "InitialCoreProxy"
    Then URL includes "/synthetix/3.3.4/1-main/interact/synthetix/AccountProxy/0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac"

  Scenario: Executing read functions
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * User clicks on the 1st button or link with id "InitialCoreProxy-button"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the 1st button or link with id "owner-button"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "owner()" tag contains "0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"

    # Read function with string output
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * User clicks on the 1st button or link with id "InitialCoreProxy-button"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the 1st button or link with id "owner-button"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "owner()" tag contains "0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"

    # Read function with int output
    Given User opens the "/packages/multicall/latest/11155111-main/interact" page
    Then URL includes "/multicall/Multicall/0xcA11bde05977b3631167028862bE2a173976CA11"
    * User clicks on the 1st button or link with id "getChainId-button"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "getChainId()" tag contains "11155111"

    # Read function with bytes32 output
    Given User opens the "/packages/registry/2.15.1/1-main/interact" page
    Then URL includes "/registry/Proxy/0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba"
    * User clicks on the 1st button or link with id "getPackageOwner-button"
    * User types "registry" into the 1st input with id "byte32-input"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "getPackageOwner(bytes32)" tag contains "0x493E75825b862c355a4263C9C1CB6F650539B328"

    # Read function with contract output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the 1st button or link with id "ADDRESSES_PROVIDER-button"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "ADDRESSES_PROVIDER()" tag contains "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"

    # Read function with struct output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the 1st button or link with id "getConfiguration-button"
    * User types "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5" into the 1st input with id "address-input"
    * User clicks on the 1st button or link with id "call-function-button"
    Then Output on "getConfiguration(address)" tag contains "5708990770823839524233143914701057466751846718296"

  Scenario: Decoding failed functions
    Given User opens the "/packages/synthetix-omnibus/7/1-main/interact" page
    * Wallet is connected
    * User clicks on the 1st button or link with id "CoreProxy-button"
    Then URL includes "/CoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the 1st button or link with id "addApprovedPool-button"
    * User types "1" into the 1st input with id "number-input"
    * User clicks on the 1st button or link with id "simulate-txs-button"
    Then View renders a "div" displaying the text "Error: Unauthorized(address addr)"

    Given User opens the "/packages/usdc/2.1/1-main/interact" page
    * Wallet is connected
    Then URL includes "/FiatTokenProxy/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    * User clicks on the 1st button or link with id "mint-button"
    * User types "0x0000000000000000000000000000000000000000" into the 1st input with id "address-input"
    * User types "1" into the 1st input with id "number-input"
    * User clicks on the 1st button or link with id "simulate-txs-button"
    Then View renders a "div" displaying the text "FiatToken: caller is not a minter"

    # Simulating a failed EIP7412 contract call
    Given User opens the "/packages/pyth-erc7412-wrapper/latest/11155111-main/interact" page
    * Wallet is connected
    Then URL includes "/pyth-erc7412-wrapper/PythERC7412Wrapper/0x08C1F629Ec5935F95Ef3e614dF5B94086528C25c"
    * User clicks on the 1st button or link with id "getLatestPrice-button"
    * User types "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" into the 1st input with id "byte32-input"    
    * User types "1" into the 1st input with id "number-input"
    * User clicks on the 1st button or link with id "call-function-button"
    Then View renders a "div" displaying the text "Error: OracleDataRequired(address oracleContract, bytes oracleQuery)"