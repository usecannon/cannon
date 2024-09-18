Feature: Interact page

  Scenario: Navigating to the interact page
    Given User opens the "/packages/synthetix/3.3.4/5-main" page
    * Wallet is connected
    * View renders a "h1" displaying the text "synthetix"
    * User clicks on the "a" element with text "Interact"

  Scenario: Selecting Modules on the interact page
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * View renders a "button" displaying the text "InitialCoreProxy"
    * User clicks on the "button" element with text "AccountProxy"
    Then URL includes "/synthetix/3.3.4/1-main/interact/synthetix/AccountProxy/0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac"

  Scenario: Executing read functions
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * User clicks on the "button" element with text "InitialCoreProxy"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the "button" element with text "owner()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0xEb3107117FEAd7de89Cd14D463D340A2E6917769"
    # Read function with string output
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * Wallet is connected
    * User clicks on the "button" element with text "InitialCoreProxy"
    Then URL includes "/synthetix/InitialCoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
    * User clicks on the "button" element with text "owner()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0xEb3107117FEAd7de89Cd14D463D340A2E6917769"

    # Read function with int output
    Given User opens the "/packages/multicall/latest/11155111-main/interact" page
    Then URL includes "/multicall/Multicall/0xcA11bde05977b3631167028862bE2a173976CA11"
    * User clicks on the "button" element with text "getChainId()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "11155111"

    # Read function with bytes32 output
    Given User opens the "/packages/registry/2.15.1/1-main/interact" page
    Then URL includes "/registry/Proxy/0x8E5C7EFC9636A6A0408A46BB7F617094B81e5dba"
    * User clicks on the "button" element with text "getPackageOwner(bytes32 _packageName)"
    * User types "registry" for "_packageName" function param
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0x493E75825b862c355a4263C9C1CB6F650539B328"

    # Read function with contract output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the "button" element with text "ADDRESSES_PROVIDER()"
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A"

    # Read function with struct output
    Given User opens the "/packages/aave-v3-pool/latest/11155111-main/interact" page
    Then URL includes "/aave-v3-pool/InitializableImmutableAdminUpgradeabilityProxy/0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"
    * User clicks on the "button" element with text "getConfiguration(address asset)"
    * User types "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5" for "asset" function param
    * User clicks on the "button" element with text "Call view function"
    Then View renders a "div" displaying the text "5708990770823839524233143914701057466751846718296"

Scenario: Decoding failed functions
  Given User opens the "/packages/synthetix-omnibus/7/1-main/interact" page
  * Wallet is connected
  * User clicks on the "button" element with text "CoreProxy"
  Then URL includes "/CoreProxy/0xffffffaEff0B96Ea8e4f94b2253f31abdD875847"
  * User clicks on the "button" element with text "addApprovedPool(uint128 poolId)"
  * User types "1" for "poolId" function param
  * User clicks on the "button" element with text "Simulate transaction"
  Then View renders a "div" displaying the text "Error: Unauthorized(address addr)"

  Given User opens the "/packages/usdc/2.1/1-main/interact" page
  * Wallet is connected
  Then URL includes "/FiatTokenProxy/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
  * User clicks on the "button" element with text "mint(address _to,uint256 _amount)"
  * User types "0x0000000000000000000000000000000000000000" for "_to" function param
  * User types "1" for "_amount" function param
  * User clicks on the "button" element with text "Simulate transaction"
  Then View renders a "div" displaying the text "FiatToken: caller is not a minter"

  # Simulating a failed EIP7412 contract call
  Given User opens the "/packages/pyth-erc7412-wrapper/latest/11155111-main/interact" page
  * Wallet is connected
  Then URL includes "/pyth-erc7412-wrapper/PythERC7412Wrapper/0x08C1F629Ec5935F95Ef3e614dF5B94086528C25c"
  * User clicks on the "button" element with text "getLatestPrice(bytes32 priceId,uint256 stalenessTolerance)"
  * User types "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" for "priceId" function param
  * User types "1" for "stalenessTolerance" function param
  * User clicks on the "button" element with text "Call view function"
  Then View renders a "div" displaying the text "Error: OracleDataRequired(address oracleContract, bytes oracleQuery)"
