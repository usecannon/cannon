Feature: Deploy page

  Scenario: Navigating to the deploy page
    Given User opens the "/deploy" page
    * User clicks on the 1st element with id "safe-select-button"
    * User types "11155111" into the 1st input with id "safe-chain-input"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "safe-address-input"
    * User clicks on the 1st element with id "safe-add-button"
    # Display Skeleton
    When User opens the "/deploy/txn/11155111/0x7f28058F0b989430C7397782F797e300CDc10042/10/0xe1eb8a722592601d45e04a1a3cf43188ff2cb6f552a43dd6c987f3851fc77234" page
    * User clicks on the "/deploy/gitops" link
    Then View renders a "h2" displaying the text "Queue Deployment"
    * User clicks on the "/deploy" link
    Then "div" element has "animate-pulse" value on "class" attribute
    * "div" element has "bg-primary/10" value on "class" attribute
    # Display Executed Transactions
    When User opens the "/deploy/txn/11155111/0x7f28058F0b989430C7397782F797e300CDc10042/10/0xe1eb8a722592601d45e04a1a3cf43188ff2cb6f552a43dd6c987f3851fc77234" page
    Then View renders a "h3" displaying the text "Cannonfile Diff"
    * View renders a "h3" displaying the text "Cannon Package"