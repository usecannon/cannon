Feature: Code page

  Scenario: Navigating to the file tree
    Given User opens the "/packages/synthetix/3.3.4/1-main" page
    Then View renders a "h3" displaying the text "Run this package on your computer"
    When User clicks on the "Code" tab
    Then "sidebar" value on "data-sidebar" attribute should exist
    * User clicks on the 1st element with id "synthetix-button"
    * User clicks on the 1st element with id "oracle_manager-button"
    * User clicks on the 1st element with id "synthetix-button"

    # Downloading a json file
    When User clicks on the 1st element with id "download-abi-button"
    Then The file "deployments.json" was downloaded
