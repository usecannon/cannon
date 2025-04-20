Feature: Home page

  Scenario: Navigating to the home page
    Given User opens the "/" page
    * Wallet is connected
    Then View renders a "h1" displaying the text "Cannon manages protocol deployments on blockchains"

  Scenario: Navigating to the Select Chain daialog
    Given User opens the "/" page
    * User clicks on the 1st element with id "custom-button"
    Then View renders a "h1" displaying the text "Connect a Wallet"
