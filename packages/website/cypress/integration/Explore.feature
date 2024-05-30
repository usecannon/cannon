Feature: Packages Page Explore

  Scenario: Navigating to the explore page from the home page
    Given User opens the "/" page
    When User clicks on the "packages" link
    Then URL includes "packages"

  Scenario: User searches for a package and queues a transaction but it fails due to there is no safe selected
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