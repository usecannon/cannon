import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiParameter } from 'abitype';
import { AbiContractMethodInputType } from '@/features/Packages/AbiMethod/AbiContractMethodInputType';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('AbiContractMethodInputType - Nested Arrays', () => {
  // Mock AbiParameter for different nested array types
  const mockUint256Array2D: AbiParameter = {
    name: 'numbers',
    type: 'uint256[][]',
    internalType: 'uint256[][]',
  };

  const mockStringArray2D: AbiParameter = {
    name: 'strings',
    type: 'string[][]',
    internalType: 'string[][]',
  };

  const mockTupleArray2D: AbiParameter = {
    name: 'matrix',
    type: 'tuple[][]',
    internalType: 'struct Point[][]',
    components: [
      { name: 'x', type: 'uint256', internalType: 'uint256' },
      { name: 'y', type: 'uint256', internalType: 'uint256' },
    ],
  };

  const validUint256Array2D = [
    ['1', '2', '3'],
    ['4', '5', '6'],
  ];

  const validStringArray2D = [
    ['hello', 'world'],
    ['test', 'array'],
  ];

  const validTupleArray2D = [
    [
      { x: '1', y: '2' },
      { x: '3', y: '4' },
    ],
    [
      { x: '5', y: '6' },
      { x: '7', y: '8' },
    ],
  ];

  describe('Uint256 Nested Arrays', () => {
    it('renders uint256 nested array input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockUint256Array2D}
            handleUpdate={handleUpdate}
            value={validUint256Array2D}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(JSON.stringify(validUint256Array2D));
    });

    it('handles valid uint256 nested array input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockUint256Array2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      const newValue = JSON.stringify(validUint256Array2D);

      fireEvent.change(inputElement, { target: { value: newValue } });

      expect(handleUpdate).toHaveBeenCalledWith(validUint256Array2D);
    });

    it('shows correct placeholder for uint256 nested array', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockUint256Array2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toHaveAttribute(
        'placeholder',
        '[[v1, v2], [v3, v4]]'
      );
    });
  });

  describe('String Nested Arrays', () => {
    it('renders string nested array input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockStringArray2D}
            handleUpdate={handleUpdate}
            value={validStringArray2D}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(JSON.stringify(validStringArray2D));
    });

    it('handles valid string nested array input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockStringArray2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      const newValue = JSON.stringify(validStringArray2D);

      fireEvent.change(inputElement, { target: { value: newValue } });

      expect(handleUpdate).toHaveBeenCalledWith(validStringArray2D);
    });

    it('shows correct placeholder for string nested array', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockStringArray2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toHaveAttribute(
        'placeholder',
        '[[v1, v2], [v3, v4]]'
      );
    });
  });

  describe('Tuple Nested Arrays', () => {
    it('renders tuple nested array input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArray2D}
            handleUpdate={handleUpdate}
            value={validTupleArray2D}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(JSON.stringify(validTupleArray2D));
    });

    it('handles valid tuple nested array input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArray2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      const newValue = JSON.stringify(validTupleArray2D);

      fireEvent.change(inputElement, { target: { value: newValue } });

      expect(handleUpdate).toHaveBeenCalledWith(validTupleArray2D);
    });

    it('shows correct placeholder for tuple nested array', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArray2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toHaveAttribute(
        'placeholder',
        '[[v1, v2], [v3, v4]]'
      );
    });
  });

  describe('Error Handling', () => {
    it('throws error for non-array nested array value', () => {
      const handleUpdate = vi.fn();

      // Silence React error messages for this test
      // eslint-disable-next-line no-console
      const originalError = console.error;
      // eslint-disable-next-line no-console
      console.error = vi.fn();

      expect(() => {
        render(
          <TooltipProvider>
            <AbiContractMethodInputType
              input={mockUint256Array2D}
              handleUpdate={handleUpdate}
              value="not an array"
            />
          </TooltipProvider>
        );
      }).toThrow(
        'Expected object or array for tuple or nested arrays, got string'
      );

      // Restore console.error
      // eslint-disable-next-line no-console
      console.error = originalError;
    });

    it('handles malformed JSON gracefully', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockUint256Array2D}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

      const malformedInputs = [
        '[[1, 2], [3,', // Incomplete array
        '[[1, 2], [3, 4,', // Trailing comma
        '[[1, 2], [3, 4]]', // Missing closing bracket
      ];

      malformedInputs.forEach((malformed) => {
        fireEvent.change(inputElement, { target: { value: malformed } });
        expect(handleUpdate).toHaveBeenCalledWith(
          undefined,
          'Invalid JSON format'
        );
      });
    });
  });
});
