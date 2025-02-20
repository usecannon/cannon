Feature: Cannon Docs page

  Scenario: Copying the command
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    * User clicks on the 1st button or link with id "clipboard-copy-button"
    Then "copied-icon" value on "data-testid" attribute should exist
    * User waits for 3 seconds while loading

  Scenario: Navigating to Code Preview
    Given User opens the "/packages/synthetix/3.3.4/1-main/cannonfile" page
    * User clicks on the 1st button or link with id "raw-cannonfile-button"
    Then "code" value on "role" attribute should exist

  Scenario: Showing the file tree for the doc
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    Then View renders a "li" displaying the text "Create a Project"
    * User clicks on the "/learn/guides/get-started/create-a-project" link
    Then View renders a "h3" displaying the text "Initialize a Foundry project"
    * User clicks on the 1st button or link with id "tree-5-button"
    * User clicks on the 1st button or link with id "tree-5-button"
    * User clicks on the 1st button or link with id "tree-1-button"

  Scenario: Navigating to the File Tree
    Given User opens the "/packages/synthetix/3.3.4/1-main" page
    * User clicks on the "Code" tab
    Then "sidebar" value on "data-sidebar" attribute should exist    

  Scenario: Navigating to the deploy page for Skeleton
    Given User opens the "/deploy" page
    * User clicks on the 1st button or link with id "safe-select-button"
    * User types "11155111" into the 1st input with id "safe-chain-input"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "safe-address-input"
    * User clicks on the 1st button or link with id "safe-add-button"
    When User opens the "/deploy/txn/11155111/0x7f28058F0b989430C7397782F797e300CDc10042/10/0xe1eb8a722592601d45e04a1a3cf43188ff2cb6f552a43dd6c987f3851fc77234" page
    Then "div" element has "animate-pulse" value on "class" attribute
    * "div" element has "bg-primary/10" value on "class" attribute
