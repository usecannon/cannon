Feature: Stage Transactions

  Scenario: User navigates to the deploy page without connecting a wallet
    Given User opens the "/deploy" page
    Then View renders a "p" displaying the text "Queue, sign, and execute deployments"
    * View renders a "button" displaying the text "Select Safe"

  Scenario: User navigates to the deploy page with a connected wallet
    Given User opens the "/deploy" page
    * Wallet is connected
    Then View renders a "p" displaying the text "Queue, sign, and execute deployments"

  Scenario: User stages transactions from the interact page
    Given User opens the "/packages" page
    When User types "owned-greeter" into the 1st input with id "search-input"
    Then The value with id "search-input" should be empty
    * The 1st element with id "owned-greeter-section" should have "owned-greeter"
    * User clicks on the 1st element with id "owned-greeter-filter-button"
    * User clicks on the element with version "0.0.5" and chain "11155111"
    Then URL includes "/packages/owned-greeter/0.0.5"
    * View renders a "h1" displaying the text "owned-greeter"
    * View renders a "a" displaying the text "Deployment"
    When User clicks on the 1st element with id "interact-link"
    * User clicks on the 1st element with id "setGreeting-button"
    When User types "Hello World!" into the 1st input with id "default-input"
    * User clicks on the 1st element with id "stage-safe-button"
    # Drawer and Toast error should be displayed
    Then View renders a "h2" displaying the text "Stage Transactions to a Safe"
    * View renders a "button" displaying the text "Select Safe"
    When User clicks on the 1st element with id "safe-select-button"
    * User types "11155111" into the 1st input with id "safe-chain-input"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "safe-address-input"
    * User clicks on the 1st element with id "safe-add-button"
    * "safe-add-button" value on "data-testid" attribute should not exist
    * User clicks on the 1st element with id "sheet-close-button"
    When User types "Hello World!" into the 1st input with id "default-input"
    * User clicks on the 1st element with id "stage-safe-button"
    * User clicks on the 1st element with id "queue-button"
    Then The 2nd input with id "default-input" should have "Hello World!"
    * User clicks on the 1st element with id "sheet-close-button"
    When User types "Hello World Again!" into the 1st input with id "default-input"
    * User clicks on the 1st element with id "stage-safe-button"
    * User clicks on the 1st element with id "queue-button"
    Then View renders a "h2" displaying the text "Stage Transactions to a Safe"
    * The element with id "txs-alert" has 2 queued transactions

  Scenario: User stages transactions from the queue transactions drawer
    Given User opens the "/packages/owned-greeter/0.0.5/11155111-main/interact/owned-greeter/Greeter/0xa4605Ef2fB94211815F14AF6153915928C9E6407" page
    When User clicks on the 1st element with id "queue-button"
    Then View renders a "h2" displaying the text "Stage Transactions to a Safe"
    * User clicks on the 1st element with id "safe-select-button"
    * User types "11155111" into the 1st input with id "safe-chain-input"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "safe-address-input"
    * User clicks on the 1st element with id "safe-add-button"
    When View contains the "target-input" input
    When User types "owned-greeter" into the 1st input with id "target-input"
    * User clicks on the 1st element with id "add-txs-button"
    # Element 1
    * User clicks on the 1st element with id "select-contract-button"
    * User clicks on the 1st element with id "Greeter-select"
    # Element 2
    * User clicks on the 1st element with id "select-function-button"
    * User clicks on the 1st element with id "setGreeting-select"
    # Element 3
    * User types "Hello World!" into the 1st input with id "default-input"
    When User types "owned-greeter" into the 1st input with id "target-input"
    * User clicks on the 1st element with id "add-txs-button"
    # Element 1
    * User clicks on the 2nd element with id "select-contract-button"
    * User clicks on the 1st element with id "Greeter-select"
    # Element 2
    * User clicks on the 2nd element with id "select-function-button"
    * User clicks on the 1st element with id "setGreeting-select"
    # Element 3
    * User types "Hello World Again!" into the 2nd input with id "default-input"
    Then View renders a "h5" displaying the text "All Transactions Simulated Successfully"
    * The element with id "txs-alert" has 2 queued transactions

  Scenario: User stages transactions from the deploy page
    Given User opens the "/deploy" page
    * View renders a "button" displaying the text "Select Safe"
    * User clicks on the 1st element with id "safe-select-button"
    * User types "11155111" into the 1st input with id "safe-chain-input"
    * User types "0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97" into the 1st input with id "safe-address-input"
    * User clicks on the 1st element with id "safe-add-button"
    When User clicks on the "/deploy/queue" link
    When User types "owned-greeter" into the 1st input with id "target-input"
    * User clicks on the 1st element with id "add-txs-button"
    # Element 1
    * User clicks on the 1st element with id "select-contract-button"
    * User clicks on the 1st element with id "Greeter-select"
    # Element 2
    * User clicks on the 1st element with id "select-function-button"
    * User clicks on the 1st element with id "setGreeting-select"
    # Element 3
    * User types "Hello World!" into the 1st input with id "default-input"
    When User types "owned-greeter" into the 1st input with id "target-input"
    * User clicks on the 1st element with id "add-txs-button"
    # Element 1
    * User clicks on the 2nd element with id "select-contract-button"
    * User clicks on the 1st element with id "Greeter-select"
    # Element 2
    * User clicks on the 2nd element with id "select-function-button"
    * User clicks on the 1st element with id "setGreeting-select"
    # Element 3
    * User types "Hello World Again!" into the 2nd input with id "default-input"
    Then View renders a "h5" displaying the text "All Transactions Simulated Successfully"
    * The element with id "txs-alert" has 2 queued transactions
