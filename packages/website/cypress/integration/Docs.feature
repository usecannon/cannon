Feature: Cannon Docs

  Scenario: Navigating to the docs page
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    # * User clicks on the "Copy command" button
    # * User clicks on the "button" element with text "Copy command"
    # * User waits for "5" seconds while loading

  Scenario: Press Copy Command Button
    Given User opens the "/learn/cannonfile#utilities" page
    * User clicks on test button with id "clipbpard-preview-button"
    * User clicks on test button with id "clipbpard-snipet-button"
    Given User opens the "/packages/synthetix/3.3.4/1-main/interact" page
    * User clicks on the "button" element with text "InitialCoreProxy"
    * User clicks on the "button" element with text "owner()"
    * User clicks on the "button" element with text "Call function"
    * User clicks on copy button on "owner()" tab

  Scenario: Navigating to Code Preview
    Given User opens the "/packages/synthetix/3.3.4/1-main/cannonfile" page
    * User clicks on the "button" element with text "Raw Cannonfile"
