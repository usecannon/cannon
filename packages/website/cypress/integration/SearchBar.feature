Feature: SearchBar function

  Scenario: Checking the searchbar dialog
    Given User opens the "/learn" page
    When User clicks on the 1st element with id "searchbar-button"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "sidebar-search-input"
    Then View renders a "div" displaying the text "No results found."
    When User clicks on the 1st element with id "dialog-close-button"
    Then "dialog-close-button" value on "data-testid" attribute should not exist

  Scenario: Searching for the namespace
    Given User opens the "/learn" page
    When User clicks on the 1st element with id "searchbar-button"
    * User types "test-deploy" into the 1st input with id "sidebar-search-input"
    Then View renders a "span" displaying the text "test-deploy"
    When User clicks on the 1st element with id "search-namespace-section"
    Then URL includes "packages/test-deploy"

  Scenario: Searching for the function
    Given User opens the "/learn" page
    When User clicks on the 1st element with id "searchbar-button"
    * User types "synthetix" into the 1st input with id "sidebar-search-input"
    Then View renders a "span" displaying the text "AccountUtilsModule"
    When User clicks on the 1st element with id "search-function-section"
    Then URL includes "AccountUtilsModule"

  Scenario: Searching for the package
    Given User opens the "/learn" page
    When User clicks on the 1st element with id "searchbar-button"
    * User types "syn" into the 1st input with id "sidebar-search-input"
    Then View renders a "span" displaying the text "synthetix-omnibus"
    When User clicks on the 1st element with id "search-package-section"
    Then URL includes "synthetix"

