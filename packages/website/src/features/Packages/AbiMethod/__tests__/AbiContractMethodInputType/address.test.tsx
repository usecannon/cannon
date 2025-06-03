import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiContractMethodInputType } from '../../AbiContractMethodInputType';
import { AbiParameter } from 'abitype';

describe('AbiContractMethodInputType - Address', () => {
  // Mock AbiParameter for address type
  const mockAddressInput: AbiParameter = {
    name: 'recipient',
    type: 'address',
    internalType: 'address',
  };

  const validAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
  const invalidAddress = '0x123';

  it('renders address input correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value={validAddress}
      />
    );

    // Check if the input component is rendered
    const inputElement = screen.getByTestId('address-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue(validAddress);
  });

  it('handles valid address input', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value=""
      />
    );

    const inputElement = screen.getByTestId('address-input');

    // Type a valid address
    fireEvent.change(inputElement, { target: { value: validAddress } });

    // Check if handleUpdate was called with the valid address
    expect(handleUpdate).toHaveBeenCalledWith(validAddress);
  });

  it('handles invalid address input', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value=""
      />
    );

    const inputElement = screen.getByTestId('address-input');

    // Type an invalid address
    fireEvent.change(inputElement, { target: { value: invalidAddress } });

    // Check if handleUpdate was called with undefined and error
    expect(handleUpdate).toHaveBeenCalledWith(undefined, 'Invalid address');
  });

  it('handles empty input', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value={validAddress}
      />
    );

    const inputElement = screen.getByTestId('address-input');

    // Clear the input
    fireEvent.change(inputElement, { target: { value: '' } });

    // Check if handleUpdate was called with undefined
    expect(handleUpdate).toHaveBeenCalledWith(undefined);
  });

  it('handles undefined value', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value={undefined}
      />
    );

    const inputElement = screen.getByTestId('address-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue('');
  });

  it('displays error state correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockAddressInput}
        handleUpdate={handleUpdate}
        value={invalidAddress}
        error="Invalid address"
      />
    );

    const inputElement = screen.getByTestId('address-input');
    expect(inputElement).toHaveClass('border-destructive');
  });

  it('throws error for invalid value type', () => {
    const handleUpdate = vi.fn();
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => vi.fn());

    expect(() =>
      render(
        <AbiContractMethodInputType
          input={mockAddressInput}
          handleUpdate={handleUpdate}
          value={123} // Invalid type: number instead of string
        />
      )
    ).toThrow(
      'Expected string, string array or undefined for address type, got number'
    );

    consoleSpy.mockRestore();
  });
});
