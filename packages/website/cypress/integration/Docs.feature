Feature: Cannon Docs page

  Scenario: Copying the command
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    * User clicks on the 1st element with id "clipboard-copy-button"
    Then "copied-icon" value on "data-testid" attribute should exist
    * User waits for 3 seconds while loading

  Scenario: Navigating to the file tree for the doc
    Given User opens the "/learn" page
    * User clicks on the "Guides" tab
    Then View renders a "li" displaying the text "Create a Project"
    * User clicks on the "/learn/guides/get-started/create-a-project" link
    Then View renders a "h3" displaying the text "Initialize a Foundry project"
    * User clicks on the 1st element with id "tree-5-button"
    * User clicks on the 1st element with id "tree-5-button"
    * User clicks on the 1st element with id "tree-1-button"

  Scenario: Navigating to the cli page
    Given User opens the "/learn" page
    When User clicks on the "CLI" tab
    Then View renders a "h1" displaying the text "Command-Line Interface Documentation"
    When User clicks on the "Installation" button
    * User clicks on the "run" button
    Then View renders a "code" displaying the text "run"
    * User clicks on the "diff" button
    Then View renders a "code" displaying the text "diff"

  Scenario: Navigating to the debug page
    Given User opens the "/learn/guides/debug" page
    Then View renders a "h2" displaying the text "Debugging Tips"

  Scenario: Navigating to the router page
    Given User opens the "/learn/guides/router" page
    Then View renders a "h3" displaying the text "Create a Router"

