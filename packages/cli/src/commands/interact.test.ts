import { renderArgs } from './interact';

describe('renderArgs()', () => {
  const defaultOffset = ' ';

  it('should correctly render uint256 argument', () => {
    const input = { type: 'uint256', name: 'amount' };
    const value = '1000';
    const expectedOutput = ' 1000';

    const output = renderArgs(input, value);

    expect(output).toEqual(expectedOutput);
  });

  it('should correctly render int256 argument', () => {
    const input = { type: 'int256', name: 'amount' };
    const value = '-1000';
    const expectedOutput = ' -1000';
    const output = renderArgs(input, value);
    expect(output).toEqual(expectedOutput);
  });

  it('should correctly render uint256[] argument', () => {
    const input = { type: 'uint256[]', name: 'values' };
    const value = ['1000', '2000', '3000'];
    const expectedOutput = `
    [
      "1000",
      "2000",
      "3000"
    ]`;

    const output = renderArgs(input, value);
    expect(output).toEqual(expectedOutput);
  });

  it('should correctly render address argument', () => {
    const input = { type: 'address', name: 'wallet' };
    const value = '0x000000000000000000000000000000000000dead';
    const expectedOutput = `${defaultOffset}${value}`;

    const output = renderArgs(input, value);

    expect(output).toEqual(expectedOutput);
  });

  it('should correctly render tuple argument', () => {
    const input = {
      type: 'tuple',
      name: 'user',
      components: [
        { type: 'address', name: 'addy' },
        { type: 'uint256', name: 'balance' },
      ],
    };
    const value = { addy: '0x000000000000000000000000000000000000dead', balance: '1000' };
    const expectedOutput = `
    {
      "addy": "0x000000000000000000000000000000000000dead",
      "balance": "1000"
    }`;
    const output = renderArgs(input, value, '');
    expect(output).toEqual(expectedOutput);
  });

  it('should correctly render tuple[] argument', () => {
    const input = {
      type: 'tuple[]',
      name: 'users',
      components: [
        { type: 'address', name: 'addy' },
        { type: 'uint256', name: 'balance' },
      ],
    };
    const value = [
      { addy: '0x000000000000000000000000000000000000dead', balance: '1000' },
      { addy: '0x000000000000000000000000000000000000dead', balance: '2000' },
    ];
    const expectedOutput = `
    [
      {
        "addy": "0x000000000000000000000000000000000000dead",
        "balance": "1000"
      },
      {
        "addy": "0x000000000000000000000000000000000000dead",
        "balance": "2000"
      }
    ]`;
    const output = renderArgs(input, value, '');
    expect(output).toEqual(expectedOutput);
  });
});
