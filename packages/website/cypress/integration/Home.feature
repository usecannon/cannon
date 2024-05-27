Feature: Home page

  Scenario: Navigating to the home page
    Given I open the "/" page
    Then I see "Cannon manages protocol deployments on blockchains" in the "h1"
