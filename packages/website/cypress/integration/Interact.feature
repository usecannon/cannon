Feature: Interact page

  Scenario: Navigating to the interact page 
    Given User opens the "/packages/synthetix/latest/5-main" page
    * Wallet is connected
    * View renders a "h1" displaying the text "synthetix"
    * User clicks on the "a" element with text "Interact"

  Scenario: Selecting Modules on the interact page 
    Given User opens the "/packages/synthetix/latest/1-main/interact" page
    * Wallet is connected
    * View renders a "button" displaying the text "InitialCoreProxy"
    * User clicks on the "button" element with text "AccountProxy"
    Then URL includes "/synthetix/AccountProxy/0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac"
    
  Scenario: Executing read functions
    Given User opens the "/packages/synthetix/latest/1-main/interact" page
    * Wallet is connected
    * User clicks on the "button" element with text "InitialCoreProxy"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the "a" element with text "owner()"
    * User clicks on the "h2" element with text "owner()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0xEb3107117FEAd7de89Cd14D463D340A2E6917769"
    # Read function with string output
    Given User opens the "/packages/synthetix/latest/1-main/interact" page
    * Wallet is connected
    * User clicks on the "button" element with text "InitialCoreProxy"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the "a" element with text "owner()"
    * User clicks on the "h2" element with text "owner()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0xEb3107117FEAd7de89Cd14D463D340A2E6917769"

    # Read function with int output
    Given User opens the "/packages/multicall/latest/11155111-main/interact" page
    Then URL includes "/multicall/Multicall/0xcA11bde05977b3631167028862bE2a173976CA11"
    * User clicks on the "a" element with text "getChainId()"
    * User clicks on the "h2" element with text "getChainId()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "11155111"

    # Read function with bytes32 output
    Given User opens the "/packages/registry/2.15.1/1-main/interact" page
    Then URL includes "/registry/Proxy/0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba"
    * User clicks on the "a" element with text "getPackageOwner(bytes32 _packageName)"
    * User clicks on the "h2" element with text "getPackageOwner(bytes32)"
    * User types "registry" for "_packageName" function param
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0x493E75825b862c355a4263C9C1CB6F650539B328"

    # Read function with contract output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the "a" element with text "ADDRESSES_PROVIDER()"
    * User clicks on the "h2" element with text "ADDRESSES_PROVIDER()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"

    # Read function with struct output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the "a" element with text "getConfiguration(address asset)"
    * User clicks on the "h2" element with text "getConfiguration(address)"
    * User types "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5" for "asset" function param
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "5708990770823839524233143914701057466751846718296"