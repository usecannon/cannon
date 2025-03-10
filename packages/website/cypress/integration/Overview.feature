Feature: Overview page

  Scenario: Displaying text with Cannon Chain ID
    Given User opens the "/packages/synthetix/3.10.4/13370-main" page
    Then View renders a "p" displaying the text "deploy your own instance of this package."

  Scenario: Downloading JSON file
    Given User opens the "/packages/synthetix/3.10.4/13370-main" page
    When User clicks on the 1st element with id "download-deployments-button"
    Then The file "deployments.json" was downloaded
