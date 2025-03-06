Feature: AbiParameter Preview

  Scenario: Confirming the empty output of tuple
    Given User opens the "packages/synthetix/3.10.3/1-main/interact" page
    When User clicks on the 1st element with id "other-option-section"
    * User clicks on the 1st element with id "CoreRouter-button"
    When User clicks on the 1st element with id "getApprovedPools-button"
    * User clicks on the 1st element with id "call-function-button"
    Then Output contains "[]"

  Scenario: Confirming the output of bool
    Given User opens the "packages/synthetix/3.10.3/1-main/interact" page
    When User clicks on the 1st element with id "AccountProxy-button"
    * User clicks on the 1st element with id "isInitialized-button"
    * User clicks on the 1st element with id "call-function-button"
    Then Output contains "true"
