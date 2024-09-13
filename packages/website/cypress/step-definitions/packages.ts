import { When } from '@badeball/cypress-cucumber-preprocessor';

When('User clicks on the element with version {string} and chain {string}', (version: string, chain: string) => {
  cy.get('tr').each(($row) => {
    const $columns = $row.find('td');
    const rowVersion = $columns.eq(0).text().trim(); // Assuming version is in the first column
    const rowChain = $columns.eq(2).text().trim(); // Assuming chain is in the third column
    if (rowVersion === version && rowChain.includes(chain)) {
      const clickableTd: any = $columns[0].children[0];
      cy.visit(clickableTd.href);
    }
  });
});

When('User types {string} for {string} function param', (inputValue: string, functionName: string) => {
  const selector = `//p[contains(text(), '${functionName}')]//ancestor::div[@role='group']//input`;
  cy.xpath(selector).clear();
  cy.xpath(selector).type(inputValue);
});
