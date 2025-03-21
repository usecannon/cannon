Feature: Stage Transactions

  Scenario: navigating to the ipfs page
    Given User opens the "/packages/registry/2.15.1/1-main" page
    When User clicks on the 1st element with id "ipfs-deployment-link"
    Then View renders a "h3" displaying the text "Download from IPFS"
    * "download-button" value on "data-testid" attribute should exist
    When User clicks on the 1st element with id "download-button"
    * User waits for 2 seconds while loading
    Then The file "QmQzQqEsXkkDni23Yw1FgRZXyahEvPsWMDe3Vq4wV3eutm.json" was downloaded
    When User types "1" into the 1st input with id "cid-input"
    Then View renders a "p" displaying the text "This could take a minute."