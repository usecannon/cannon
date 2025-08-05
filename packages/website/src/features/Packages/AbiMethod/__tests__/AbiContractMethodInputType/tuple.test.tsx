import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiParameter } from 'abitype';
import { AbiContractMethodInputType } from '@/features/Packages/AbiMethod/AbiContractMethodInputType';
import { TooltipProvider } from '@/components/ui/tooltip';

describe('AbiContractMethodInputType - Tuple', () => {
  // Mock AbiParameter for different tuple types
  const mockTupleInput: AbiParameter = {
    name: 'person',
    type: 'tuple',
    internalType: 'struct Person',
    components: [
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'age', type: 'uint256', internalType: 'uint256' },
      { name: 'active', type: 'bool', internalType: 'bool' },
    ],
  };

  const mockTupleArrayInput: AbiParameter = {
    name: 'people',
    type: 'tuple[]',
    internalType: 'struct Person[]',
    components: [
      { name: 'name', type: 'string', internalType: 'string' },
      { name: 'age', type: 'uint256', internalType: 'uint256' },
      { name: 'active', type: 'bool', internalType: 'bool' },
    ],
  };

  const validTuple = {
    name: 'John Doe',
    age: '30',
    active: true,
  };

  const validTupleArray = [
    { name: 'John Doe', age: '30', active: true },
    { name: 'Jane Smith', age: '25', active: false },
  ];

  describe('Simple Tuple', () => {
    it('renders tuple input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={validTuple}
          />
        </TooltipProvider>
      );

      // Check if the json input is rendered
      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(JSON.stringify(validTuple));
    });

    it('handles valid tuple input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      const newValue = JSON.stringify(validTuple);

      // Type a valid tuple value
      fireEvent.change(inputElement, { target: { value: newValue } });

      // Check if handleUpdate was called with the parsed tuple
      expect(handleUpdate).toHaveBeenCalledWith(validTuple);
    });

    it('handles empty input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={validTuple}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

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
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue('');
    });

    it('displays error state for invalid JSON', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

      // Type invalid JSON
      fireEvent.change(inputElement, { target: { value: '{invalid json' } });

      // Check if handleUpdate was called with error
      expect(handleUpdate).toHaveBeenCalledWith(
        undefined,
        'Invalid JSON format'
      );
    });

    it('shows correct placeholder for tuple', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toHaveAttribute('placeholder', '[v1, v2]');
    });
  });

  describe('Tuple Array', () => {
    it('renders tuple array input correctly', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArrayInput}
            handleUpdate={handleUpdate}
            value={validTupleArray}
          />
        </TooltipProvider>
      );

      // Check if the json input is rendered
      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
      expect(inputElement).toHaveValue(JSON.stringify(validTupleArray));
    });

    it('handles valid tuple array input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArrayInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      const newValue = JSON.stringify(validTupleArray);

      // Type a valid tuple array value
      fireEvent.change(inputElement, { target: { value: newValue } });

      // Check if handleUpdate was called with the parsed tuple array
      expect(handleUpdate).toHaveBeenCalledWith(validTupleArray);
    });

    it('handles empty tuple array', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArrayInput}
            handleUpdate={handleUpdate}
            value={validTupleArray}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

      // Clear the input
      fireEvent.change(inputElement, { target: { value: '' } });

      // Check if handleUpdate was called with undefined
      expect(handleUpdate).toHaveBeenCalledWith(undefined);
    });

    it('shows correct placeholder for tuple array', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleArrayInput}
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
    it('handles malformed JSON gracefully', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

      // Test various malformed JSON inputs
      const malformedInputs = [
        '{name: "John"}', // Missing quotes
        '{"name": "John",}', // Trailing comma
        '{"name": "John"', // Missing closing brace
        '[1, 2, 3,', // Incomplete array
      ];

      malformedInputs.forEach((malformed) => {
        fireEvent.change(inputElement, { target: { value: malformed } });
        expect(handleUpdate).toHaveBeenCalledWith(
          undefined,
          'Invalid JSON format'
        );
      });
    });

    it('handles partial JSON input', () => {
      const handleUpdate = vi.fn();
      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={undefined}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');

      // Type partial JSON
      fireEvent.change(inputElement, { target: { value: '{"name":' } });

      // Should show error for incomplete JSON
      expect(handleUpdate).toHaveBeenCalledWith(
        undefined,
        'Invalid JSON format'
      );
    });
  });

  describe('Value Type Validation', () => {
    it('throws error for non-object tuple value', () => {
      const handleUpdate = vi.fn();

      // Silence React error messages for this test
      // eslint-disable-next-line no-console
      const originalError = console.error;
      // eslint-disable-next-line no-console
      console.error = vi.fn();

      // This should throw an error because the component expects an object for tuple type
      expect(() => {
        render(
          <TooltipProvider>
            <AbiContractMethodInputType
              input={mockTupleInput}
              handleUpdate={handleUpdate}
              value="not an object"
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

    it('handles string array values correctly', () => {
      const handleUpdate = vi.fn();
      const stringArrayValue = ['value1', 'value2'];

      render(
        <TooltipProvider>
          <AbiContractMethodInputType
            input={mockTupleInput}
            handleUpdate={handleUpdate}
            value={stringArrayValue}
          />
        </TooltipProvider>
      );

      const inputElement = screen.getByTestId('json-input');
      expect(inputElement).toBeInTheDocument();
    });
  });
});
