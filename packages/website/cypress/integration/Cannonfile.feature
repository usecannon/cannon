Feature: Cannonfile page

  Scenario: Navigating to the cannon graph
    Given User opens the "/packages/synthetix/3.3.4/1-main/cannonfile" page
    Then "cannon-graph-svg" value on "data-testid" attribute should exist
    * The "line" element should be visible
    * User waits for 5 seconds while loading

  Scenario: Navigating to the code preview
    Given User opens the "/packages/synthetix/3.3.4/1-main/cannonfile" page
    * User clicks on the 1st element with id "raw-cannonfile-button"
    Then "code" value on "role" attribute should exist
