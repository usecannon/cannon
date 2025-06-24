import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiContractMethodInputType } from '../../AbiContractMethodInputType';
import { AbiParameter } from 'abitype';

describe('AbiContractMethodInputType - Default', () => {
  // Mock AbiParameter for string type (falls to default case)
  const mockStringInput: AbiParameter = {
    name: 'message',
    type: 'string',
    internalType: 'string',
  };

  // Mock AbiParameter for function type (falls to default case)
  const mockFunctionInput: AbiParameter = {
    name: 'callback',
    type: 'function',
    internalType: 'function',
  };

  it('renders default input for string type correctly', () => {
    const handleUpdate = vi.fn();
    const testValue = 'Hello World';

    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value={testValue}
      />
    );

    // Check if the default input component is rendered
    const inputElement = screen.getByTestId('default-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue(testValue);
  });

  it('handles string input changes', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value=""
      />
    );

    const inputElement = screen.getByTestId('default-input');
    const newValue = 'New string value';

    // Type a new value
    fireEvent.change(inputElement, { target: { value: newValue } });

    // Check if handleUpdate was called with the new value
    expect(handleUpdate).toHaveBeenCalledWith(newValue);
  });

  it('handles function input changes', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockFunctionInput}
        handleUpdate={handleUpdate}
        value=""
      />
    );

    const inputElement = screen.getByTestId('default-input');
    const newValue = '0xabcdef1234567890';

    // Type a new value
    fireEvent.change(inputElement, { target: { value: newValue } });

    // Check if handleUpdate was called with the new value
    expect(handleUpdate).toHaveBeenCalledWith(newValue);
  });

  it('handles empty input', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value="initial value"
      />
    );

    const inputElement = screen.getByTestId('default-input');

    // Clear the input
    fireEvent.change(inputElement, { target: { value: '' } });

    // Check if handleUpdate was called with empty string
    expect(handleUpdate).toHaveBeenCalledWith('');
  });

  it('handles undefined value', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value={undefined}
      />
    );

    const inputElement = screen.getByTestId('default-input');
    expect(inputElement).toBeInTheDocument();
    expect(inputElement).toHaveValue('');
  });

  it('displays error state correctly', () => {
    const handleUpdate = vi.fn();
    const errorMessage = 'Invalid input';

    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value="test value"
        error={errorMessage}
      />
    );

    const inputElement = screen.getByTestId('default-input');
    const errorElement = screen.getByText(errorMessage);

    expect(inputElement).toHaveClass('border-red-500');
    expect(errorElement).toBeInTheDocument();
  });

  it('handles string array input changes', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockStringInput}
        handleUpdate={handleUpdate}
        value={['initial', 'values']}
      />
    );

    const inputElement = screen.getByTestId('default-input');
    const newValue = 'new,array,values';

    // Type a new value
    fireEvent.change(inputElement, { target: { value: newValue } });

    // Check if handleUpdate was called with the new value
    expect(handleUpdate).toHaveBeenCalledWith(newValue);
  });
});
