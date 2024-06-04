Feature: Interact page

  Scenario: Navigating to the interact page 
    Given User opens the "/packages/synthetix/latest/5-main" page
    * Wallet is connected
    * View renders a "h1" displaying the text "synthetix"
    * User clicks on the "a" element with text "Interact"

  Scenario: Selecting Modules on the interact page 
    Given User opens the "/packages/synthetix/latest/5-main/interact" page
    * Wallet is connected
    * View renders a "button" displaying the text "InitialCoreProxy"
    * User clicks on the "button" element with text "AccountProxy"
    * User clicks on the "button" element with text "InitialProxy"

  Scenario: Executing read functions on the interact page
    Given User opens the "/packages/synthetix/latest/1-main/interact" page
    * Wallet is connected
    * User clicks on the "button" element with text "InitialCoreProxy"
    * User clicks on the "a" element with text "owner()"
    * User clicks on the "h2" element with text "owner()"
    * User clicks on the "button" element with text "Call view function"
    * View renders a "div" displaying the text "0xEb3107117FEAd7de89Cd14D463D340A2E6917769"