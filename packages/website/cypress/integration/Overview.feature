Feature: Overview page

  Scenario: Display text with Cannon Chain ID
    Given User opens the "/packages/synthetix/3.10.4/13370-main" page
    Then View renders a "p" displaying the text "deploy your own instance of this package."
