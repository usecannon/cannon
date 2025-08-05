import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiParameter } from 'abitype';
import { AbiContractMethodInputType } from '@/features/Packages/AbiMethod/AbiContractMethodInputType';
import { NumberInput } from '@/features/Packages/AbiMethod/NumberInput';
import { parseEther } from 'viem';

describe('AbiContractMethodInputType - Number', () => {
  // Mock AbiParameter for number types
  const mockUintInput: AbiParameter = {
    name: 'amount',
    type: 'uint256',
    internalType: 'uint256',
  };

  it('renders uint input correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockUintInput}
        handleUpdate={handleUpdate}
        value={BigInt(100)}
      />
    );

    // Check if the number input is rendered
    const inputElement = screen.getByTestId('number-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue(100);
    expect(screen.getByText('100 wei')).toBeInTheDocument();
  });

  it('handles value updates correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockUintInput}
        handleUpdate={handleUpdate}
        value={BigInt(100)}
      />
    );

    const inputElement = screen.getByTestId('number-input');

    // Change the input value
    fireEvent.change(inputElement, { target: { value: '200' } });

    // Check if handleUpdate was called with the new value
    expect(handleUpdate).toHaveBeenCalledWith('200');
    // Check if wei value is updated
    expect(screen.getByText('200 wei')).toBeInTheDocument();
  });

  it('handles empty input correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockUintInput}
        handleUpdate={handleUpdate}
        value={BigInt(100)}
      />
    );

    const inputElement = screen.getByTestId('number-input');

    // Clear the input
    fireEvent.change(inputElement, { target: { value: '' } });

    // Check if handleUpdate was called with undefined
    expect(handleUpdate).toHaveBeenCalledWith(undefined);
    // Check that wei value is not displayed
    expect(screen.queryByText(/wei/)).not.toBeInTheDocument();
  });

  it('handles decimal numbers correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockUintInput}
        handleUpdate={handleUpdate}
        value={BigInt(100)}
      />
    );

    const inputElement = screen.getByTestId('number-input');
    fireEvent.change(inputElement, { target: { value: '100.5' } });

    expect(handleUpdate).toHaveBeenCalledWith(
      undefined,
      'Invalid number format'
    );
  });

  it('throws error for invalid number value type', () => {
    const handleUpdate = vi.fn();
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => vi.fn());

    expect(() =>
      render(
        <AbiContractMethodInputType
          input={mockUintInput}
          handleUpdate={handleUpdate}
          value="not-a-number"
        />
      )
    ).toThrow('Expected bigint or undefined for number type, got string');

    consoleSpy.mockRestore();
  });
});

describe('NumberInput', () => {
  describe('Wei mode (no fixedDecimals)', () => {
    it('renders with wei value', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={BigInt(100)}
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(100);
      expect(screen.getByText('100 wei')).toBeInTheDocument();
    });

    it('handles wei value updates', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={BigInt(100)}
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      fireEvent.change(inputElement, { target: { value: '200' } });

      expect(handleUpdate).toHaveBeenCalledWith('200');
      expect(screen.getByText('200 wei')).toBeInTheDocument();
    });

    it('rejects decimal values in wei mode', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={BigInt(100)}
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      fireEvent.change(inputElement, { target: { value: '100.5' } });

      expect(handleUpdate).toHaveBeenCalledWith(
        undefined,
        'Invalid number format'
      );
    });
  });

  describe('ETH mode (with fixedDecimals)', () => {
    it('renders with ETH value', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={parseEther('1.5')}
          fixedDecimals={18}
          suffix="ETH"
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(1.5);
      expect(screen.getByText('1500000000000000000 wei')).toBeInTheDocument();
    });

    it('handles ETH value updates', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={parseEther('1.5')}
          fixedDecimals={18}
          suffix="ETH"
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      fireEvent.change(inputElement, { target: { value: '2.5' } });

      expect(handleUpdate).toHaveBeenCalledWith('2.5');
      expect(screen.getByText('2500000000000000000 wei')).toBeInTheDocument();
    });

    it('accepts decimal values in ETH mode', () => {
      const handleUpdate = vi.fn();
      render(
        <NumberInput
          handleUpdate={handleUpdate}
          value={parseEther('1.5')}
          fixedDecimals={18}
          suffix="ETH"
          showWeiValue={true}
        />
      );

      const inputElement = screen.getByTestId('number-input');
      fireEvent.change(inputElement, { target: { value: '1.234567' } });

      expect(handleUpdate).toHaveBeenCalledWith('1.234567');
    });
  });
});
