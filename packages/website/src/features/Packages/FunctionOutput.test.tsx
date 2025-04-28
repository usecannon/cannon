import { vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

// Add mock before other imports
vi.mock('@/providers/CannonProvidersProvider', () => ({
  useCannonChains: () => ({
    getChainName: () => '',
  }),
}));

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FunctionOutput } from './FunctionOutput';

describe('FunctionOutput', () => {
  it('renders single parameter correctly', () => {
    const singleParameter = [
      {
        name: 'testParam',
        type: 'uint256',
      },
    ];

    render(
      <TooltipProvider>
        <FunctionOutput
          chainId={1}
          abiParameters={singleParameter}
          methodResult="123"
        />
      </TooltipProvider>
    );

    expect(screen.getByText('testParam')).toBeInTheDocument();
    expect(screen.getByText('uint256')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();
  });

  it('renders multiple parameters correctly', () => {
    const arrayParameters = [
      { name: 'param1', type: 'uint256' },
      { name: 'param2', type: 'string' },
    ];

    const methodResults = ['123', 'test'];

    render(
      <TooltipProvider>
        <FunctionOutput
          chainId={1}
          abiParameters={arrayParameters}
          methodResult={methodResults}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('param1')).toBeInTheDocument();
    expect(screen.getByText('uint256')).toBeInTheDocument();
    expect(screen.getByDisplayValue('123')).toBeInTheDocument();

    expect(screen.getByText('param2')).toBeInTheDocument();
    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });

  it('renders with undefined methodResult', () => {
    const singleParameter = [
      {
        // Wrap in array
        name: 'testParam',
        type: 'uint256',
      },
    ];

    render(
      <TooltipProvider>
        <FunctionOutput
          chainId={1}
          abiParameters={singleParameter}
          methodResult={undefined}
        />
      </TooltipProvider>
    );

    expect(screen.getByText('testParam')).toBeInTheDocument();
    expect(screen.getByText('uint256')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });
});
