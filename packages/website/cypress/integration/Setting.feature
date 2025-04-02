Feature: Setting page

  Scenario: Navigating to the custom provider
    Given User opens the "/settings" page
    Then View renders a "h3" displaying the text "Custom Providers"
    When User types "https://base-mainnet.infura.io/v3/4791c1745a1f44ce831e94be7f9e8bd7" into the 1st input with id "custom-provider-input"
    * User clicks on the 1st element with id "add-provider-button"
    Then "custom-provider-section" value on "data-testid" attribute should exist
    * View renders a "div" displaying the text "8453"
    When User clicks on the 1st element with id "delete-provider-button"
    Then "custom-provider-section" value on "data-testid" attribute should not exist

  Scenario: Navigating to the custom safe transaction service
    Given User opens the "/settings" page
    Then View renders a "h3" displaying the text "Custom Safe Transaction Services"
    When User types "11155111" into the 1st input with id "custom-safe-chain-input"
    * User types "https://test" into the 1st input with id "custom-safe-url-input"
    * User clicks on the 1st element with id "add-custom-safe-button"
    Then "custom-safe-section" value on "data-testid" attribute should exist
    When User clicks on the 1st element with id "delete-custom-safe-button"
    Then "custom-safe-section" value on "data-testid" attribute should not exist

  Scenario: Confirming other functions
    Given User opens the "/settings" page
    When User types "https://safe.usecannon.com" into the 1st input with id "safe-txs-url-input"
    * User types "https://hermes.pyth.network" into the 1st input with id "pyth-url-input"
    * User types "https://repo.usecannon.com/" into the 1st input with id "ipfs-url-input"
    * User clicks on the 1st element with id "reset-settings-button"
    Then User waits for 2 seconds while loading
