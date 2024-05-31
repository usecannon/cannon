Feature: Packages Page - Explore Tab

  Scenario: Navigating to the explore page from the home page
    Given User opens the "/" page
    When User clicks on the "packages" link
    Then URL includes "packages"

  Scenario: User stages transactions from the interact page
    Given User opens the "/packages" page
    When User types "owned-greeter" in the "search" input
    * User clicks on the button with id "owned-greeter-expandable-button"
    * User clicks on the element with version "latest" and chain "Sepolia"
    Then URL includes "/packages/owned-greeter/latest"
    * View renders a "h1" displaying the text "owned-greeter"
    * View renders a "h2" displaying the text "Contract Deployments"
    When User clicks on the "/packages/owned-greeter/latest/11155111-main/interact" link
    * User clicks on the "div" element with text "setGreeting(string)"
    * User types "Hello World!" for "_greeting" function param
    * User clicks on the button with id "setGreeting-stage-to-safe"
    # Drawer and Toast error should be displayed
    Then View renders a "header" displaying the text "Stage Transactions to a Safe"
    * View renders a "div" displaying the text "Please select a Safe first"
    When User types and select the safe "11155111:0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97"
    * User closes the queue txns drawer
    * User clicks on the button with id "setGreeting-stage-to-safe"
    Then  View renders a "div" displaying the text "Total transactions queued: 1"
    When User types "Hello World Again!" for "_greeting" function param
    * User clicks on the button with id "setGreeting-stage-to-safe"
    Then  View renders a "div" displaying the text "Total transactions queued: 2"
    # Check drawer is rendering the total transactions queued
    When User clicks on the button with "aria-label" "queue-txs"
    Then Drawer has exactly 2 queued transactions
