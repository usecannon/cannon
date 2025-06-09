import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AbiParameter } from 'abitype';
import { AbiContractMethodInputType } from '@/features/Packages/AbiMethod/AbiContractMethodInputType';

describe('AbiContractMethodInputType - Boolean', () => {
  // Mock AbiParameter for boolean type
  const mockBooleanInput: AbiParameter = {
    name: 'isActive',
    type: 'bool',
    internalType: 'bool',
  };

  it('renders boolean input correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockBooleanInput}
        handleUpdate={handleUpdate}
        value={false}
      />
    );

    // Check if the switch component is rendered
    const switchElement = screen.getByTestId('bool-input');
    expect(switchElement).toBeInTheDocument();

    // Check if the label shows "False" initially
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('handles value updates correctly', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockBooleanInput}
        handleUpdate={handleUpdate}
        value={false}
      />
    );

    const switchElement = screen.getByTestId('bool-input');

    // Click the switch to change value
    fireEvent.click(switchElement);

    // Check if handleUpdate was called with true
    expect(handleUpdate).toHaveBeenCalledWith(true);

    // Check if label updated to "True"
    expect(screen.getByText('True')).toBeInTheDocument();
  });

  it('handles undefined value as false and allows updates', () => {
    const handleUpdate = vi.fn();
    render(
      <AbiContractMethodInputType
        input={mockBooleanInput}
        handleUpdate={handleUpdate}
        value={undefined}
      />
    );

    // Check if the switch component is rendered
    const switchElement = screen.getByTestId('bool-input');
    expect(switchElement).toBeInTheDocument();

    // Check if the label shows "False" initially (undefined should be treated as false)
    expect(screen.getByText('False')).toBeInTheDocument();

    // Click the switch to change value
    fireEvent.click(switchElement);

    // Check if handleUpdate was called with true
    expect(handleUpdate).toHaveBeenCalledWith(true);

    // Check if label updated to "True"
    expect(screen.getByText('True')).toBeInTheDocument();
  });

  it('throws error for invalid boolean value', () => {
    const handleUpdate = vi.fn();
    const consoleSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => vi.fn());

    expect(() =>
      render(
        <AbiContractMethodInputType
          input={mockBooleanInput}
          handleUpdate={handleUpdate}
          value="not-a-boolean"
        />
      )
    ).toThrow('Expected boolean for bool type, got string');

    consoleSpy.mockRestore();
  });
});
