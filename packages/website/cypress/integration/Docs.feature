Feature: Cannon Docs

  Scenario: Copying the command
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    * User clicks on the 1st button or link with id "clipboard-copy-button"
    Then "copied-icon" value on "data-testid" attribute should exists
    * User waits for "3" seconds while loading

  Scenario: Navigating to Code Preview
    Given User opens the "/packages/synthetix/3.3.4/1-main/cannonfile" page
    * User clicks on the 1st button or link with id "raw-cannonfile-button"
    * User waits for "3" seconds while loading

  Scenario: Navigating to File Tree
    Given User opens the "/packages/synthetix/3.3.4/1-main" page
    * User clicks on the "Code" tab
    Then "sidebar" value on "data-sidebar" attribute should exists

  Scenario: Showing the file tree for the doc
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    Then View renders a "li" displaying the text "Create a Project"
    * User clicks on the "/learn/guides/get-started/create-a-project" link
    Then View renders a "h3" displaying the text "Initialize a Foundry project"
    When User clicks on the 1st button or link with id "tree-5-button"
    When User clicks on the 1st button or link with id "tree-5-button"
    When User clicks on the 1st button or link with id "tree-1-button"

    
