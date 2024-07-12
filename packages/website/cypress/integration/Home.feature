Feature: Home page

  Scenario: Navigating to the home page
    Given User opens the "/" page
    * Wallet is connected
    Then View renders a "h1" displaying the text "Cannon manages protocol deployments on blockchains"