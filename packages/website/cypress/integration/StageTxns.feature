Feature: Stage Transactions
  Scenario: User navigates to the deploy page without connecting a wallet
    Given User opens the "/deploy" page
    Then View renders a "p" displaying the text "Queue, sign, and execute deployments using a"
    * View renders a "p" displaying the text "Connect a wallet and select a Safe from the dropdown above."

  Scenario: User navigates to the deploy page with a connected wallet
    Given User opens the "/deploy" page
    * Wallet is connected
    Then View renders a "p" displaying the text "Queue, sign, and execute deployments using a"
    * View renders a "p" displaying the text "Select a Safe from the dropdown above."

  Scenario: User stages transactions from the interact page
    Given User opens the "/packages" page
    When User types "owned-greeter" in the "search" input
    * User clicks on the button with id "owned-greeter-expandable-button"
    * User clicks on the element with version "0.0.5" and chain "Sepolia"
    Then URL includes "/packages/owned-greeter/0.0.5"
    * View renders a "h1" displaying the text "owned-greeter"
    * View renders a "h2" displaying the text "Contract Deployments"
    When User clicks on the "/packages/owned-greeter/0.0.5/11155111-main/interact" link
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

  Scenario: User stages transactions from the queue transactions drawer
    Given User opens the "/packages/owned-greeter/0.0.5/11155111-main/interact/owned-greeter/Greeter/0xa4605Ef2fB94211815F14AF6153915928C9E6407" page
    When User clicks on the button with "aria-label" "queue-txs"
    Then View renders a "header" displaying the text "Stage Transactions to a Safe"
    When User types and select the safe "11155111:0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97"
    When User types "owned-greeter" in the "target-input" input
    When User clicks on the button with "aria-label" "Add Transaction"
    * User selects and clicks on the contract with name "Greeter" of the element # 1
    * User selects and clicks on the function with name "setGreeting" of the element # 1
    * User sets the value of parameter "_greeting" to "Hello World!" in the element # 1
    When User clicks on the button with "aria-label" "Add Transaction"
    * User selects and clicks on the contract with name "Greeter" of the element # 2
    * User selects and clicks on the function with name "setGreeting" of the element # 2
    * User sets the value of parameter "_greeting" to "Hello World Again!" in the element # 2
    Then Drawer has exactly 2 queued transactions

  Scenario: User stages transactions from the deploy page
    Given User opens the "/deploy" page
    * Wallet is connected
    * User types and select the safe "11155111:0xfD050037C9039cE7b4A3213E3645BC1ba6eA0c97"
    When User clicks on the "/deploy/queue" link
    Then View renders a "h2" displaying the text "Stage Transactions"
    When User types "owned-greeter" in the "target-input" input
    When User clicks on the button with "aria-label" "Add Transaction"
    * User selects and clicks on the contract with name "Greeter" of the element # 1
    * User selects and clicks on the function with name "setGreeting" of the element # 1
    * User sets the value of parameter "_greeting" to "Hello World!" in the element # 1
    When User clicks on the button with "aria-label" "Add Transaction"
    * User selects and clicks on the contract with name "Greeter" of the element # 2
    * User selects and clicks on the function with name "setGreeting" of the element # 2
    * User sets the value of parameter "_greeting" to "Hello World Again!" in the element # 2
    Then Drawer has exactly 2 queued transactions
