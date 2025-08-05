import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiParameter } from 'abitype';
import { AbiContractMethodInputType } from '@/features/Packages/AbiMethod/AbiContractMethodInputType';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('AbiContractMethodInputType - Bytes', () => {
  // Mock AbiParameter for different bytes types
  const mockBytes32Input: AbiParameter = {
    name: 'hash',
    type: 'bytes32',
    internalType: 'bytes32',
  };

  const mockBytesInput: AbiParameter = {
    name: 'data',
    type: 'bytes',
    internalType: 'bytes',
  };

  const mockBytes1Input: AbiParameter = {
    name: 'flag',
    type: 'bytes1',
    internalType: 'bytes1',
  };

  const validBytes32 =
    '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const validBytes = '0x1234567890abcdef';
  const validBytes1 = '0x12';
  const invalidBytes = '0x123'; // Invalid length for bytes1

  describe('Fixed-size bytes (bytes32)', () => {
    it('renders bytes32 input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value={validBytes32}
          />
        </TooltipProvider>
      );

      // Check if the byte input is rendered
      const inputElement = screen.getByTestId('byte32-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(validBytes32);
    });

    it('handles valid bytes32 input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');

      // Type a valid bytes32 value
      fireEvent.change(inputElement, { target: { value: validBytes32 } });

      // Check if handleUpdate was called with the valid bytes32 (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith(validBytes32);
    });

    it('handles string conversion to hex for bytes32', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');

      // Type a string that should be converted to hex
      fireEvent.change(inputElement, { target: { value: 'Hello World' } });

      // Check if handleUpdate was called with the hex conversion (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith(
        '0x48656c6c6f20576f726c64000000000000000000000000000000000000000000'
      );
    });

    it('handles empty input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value={validBytes32}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');

      // Clear the input
      fireEvent.change(inputElement, { target: { value: '' } });

      // Check if handleUpdate was called with undefined
      expect(handleUpdate).toHaveBeenCalledWith(undefined);
    });

    it('handles undefined value', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue('');
    });

    it('displays error state correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value={invalidBytes}
            error="Invalid bytes format"
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');
      expect(inputElement).toHaveClass('border-destructive');
    });
  });

  describe('Dynamic bytes (bytes)', () => {
    it('renders dynamic bytes input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value={validBytes}
          />
        </TooltipProvider>
      );

      // Check if the byte input is rendered
      const inputElement = screen.getByTestId('bytedynamic-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(validBytes);
    });

    it('handles valid dynamic bytes input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');

      // Type a valid bytes value
      fireEvent.change(inputElement, { target: { value: validBytes } });

      // Check if handleUpdate was called with the valid bytes (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith(validBytes);
    });

    it('handles string conversion to hex for dynamic bytes', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');

      // Type a string that should be converted to hex
      fireEvent.change(inputElement, { target: { value: 'Test' } });

      // Check if handleUpdate was called with the hex conversion (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith('0x54657374');
    });

    it('handles partial hex input for dynamic bytes', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');

      // Type a partial hex string with odd length (invalid)
      fireEvent.change(inputElement, { target: { value: '0x123' } });

      // Check if handleUpdate was called with undefined and error for odd length
      expect(handleUpdate).toHaveBeenCalledWith(
        undefined,
        'Hex string must have even number of characters after 0x prefix'
      );
    });

    it('shows error for invalid hex format in dynamic bytes', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');

      // Type an invalid hex string (non-hex characters)
      fireEvent.change(inputElement, { target: { value: '0x12g' } });

      // Check if handleUpdate was called with undefined (no valid value)
      expect(handleUpdate).toHaveBeenCalledWith(undefined);
    });

    it('shows error state for invalid hex input in dynamic bytes', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value="0x123"
            error="Hex string must have even number of characters after 0x prefix"
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');
      expect(inputElement).toHaveClass('border-destructive');
    });
  });

  describe('Small fixed-size bytes (bytes1)', () => {
    it('renders bytes1 input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes1Input}
            handleUpdate={handleUpdate}
            value={validBytes1}
          />
        </TooltipProvider>
      );

      // Check if the byte input is rendered
      const inputElement = screen.getByTestId('byte1-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(validBytes1);
    });

    it('handles valid bytes1 input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes1Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte1-input');

      // Type a valid bytes1 value
      fireEvent.change(inputElement, { target: { value: validBytes1 } });

      // Check if handleUpdate was called with the valid bytes1 (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith(validBytes1);
    });

    it('handles string conversion to hex for bytes1', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes1Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte1-input');

      // Type a single character that should be converted to hex
      fireEvent.change(inputElement, { target: { value: 'A' } });

      // Check if handleUpdate was called with the hex conversion (no error parameter)
      expect(handleUpdate).toHaveBeenCalledWith('0x41');
    });

    it('handles length validation for bytes1', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes1Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte1-input');

      // Type a hex string that's too long for bytes1
      fireEvent.change(inputElement, { target: { value: '0x1234' } });

      // Check if handleUpdate was called with undefined and length error
      expect(handleUpdate).toHaveBeenCalledWith(
        undefined,
        'Input is 2 too long. It must be 4 characters.'
      );
    });
  });

  describe('Error handling', () => {
    it('throws error for invalid bytes value type', () => {
      const handleUpdate = vi.fn();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => vi.fn());

      expect(() =>
        render(
          <TooltipProvider>
            <AbiContractMethodInputType
              input={mockBytes32Input}
              handleUpdate={handleUpdate}
              value={123} // Invalid type: number instead of string
            />
          </TooltipProvider>
        )
      ).toThrow('Expected string or undefined for bytes type, got number');

      consoleSpy.mockRestore();
    });

    it('throws error for array value type', () => {
      const handleUpdate = vi.fn();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => vi.fn());

      expect(() =>
        render(
          <TooltipProvider>
            <AbiContractMethodInputType
              input={mockBytes32Input}
              handleUpdate={handleUpdate}
              value={['0x123', '0x456']} // Invalid type: array instead of string
            />
          </TooltipProvider>
        )
      ).toThrow('Expected string or undefined for bytes type, got object');

      consoleSpy.mockRestore();
    });
  });

  describe('Placeholder and UI', () => {
    it('shows correct placeholder for bytes32', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes32Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte32-input');
      expect(inputElement).toHaveAttribute(
        'placeholder',
        '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
    });

    it('shows correct placeholder for dynamic bytes', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytesInput}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('bytedynamic-input');
      expect(inputElement).toHaveAttribute('placeholder', '0x...');
    });

    it('shows correct placeholder for bytes1', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockBytes1Input}
            handleUpdate={handleUpdate}
            value=""
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('byte1-input');
      expect(inputElement).toHaveAttribute('placeholder', '0x00');
    });
  });
});
