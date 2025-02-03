import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunctionOutput } from './FunctionOutput';
import * as utils from '@/components/AbiParameterPreview/utils';

// Mock AbiParameterPreview component
vi.mock('@/components/AbiParameterPreview', () => ({
  AbiParameterPreview: ({ abiParameter, value }: any) => (
    <div data-testid="abi-preview">
      {abiParameter.name}: {value}
    </div>
  ),
}));

describe('FunctionOutput', () => {
  // always call _isArrayAbiParameter
  it('should always call _isArrayAbiParameter', () => {
    const spy = vi.spyOn(utils, 'isAbiParameterArray');
    const params = {
      name: 'testParam',
      type: 'uint256',
    };

    render(<FunctionOutput abiParameters={params} methodResult={'123'} />);

    expect(spy).toHaveBeenCalledWith(params);
    expect(screen.getByTestId('abi-preview')).toBeInTheDocument();
  });

  // non array value
  it('renders single parameter correctly', () => {
    const singleParameter = {
      name: 'testParam',
      type: 'uint256',
    };

    render(
      <FunctionOutput abiParameters={singleParameter} methodResult="123" />
    );

    expect(screen.getByTestId('abi-preview')).toBeInTheDocument();
  });

  // value is array of parameters
  it('renders array of parameters correctly', () => {
    const arrayParameters = [
      { name: 'param1', type: 'uint256' },
      { name: 'param2', type: 'string' },
    ];

    const methodResults = "['123', 'test']";

    render(
      <FunctionOutput
        abiParameters={arrayParameters}
        methodResult={methodResults}
      />
    );

    const previews = screen.getAllByTestId('abi-preview');
    expect(previews).toHaveLength(arrayParameters.length);
  });

  // value is undefined
  it('renders with undefined methodResult', () => {
    const singleParameter = {
      name: 'testParam',
      type: 'uint256',
    };

    render(
      <FunctionOutput
        abiParameters={singleParameter}
        methodResult={undefined}
      />
    );

    expect(screen.getByTestId('abi-preview')).toBeInTheDocument();
  });
});
