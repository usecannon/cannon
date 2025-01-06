import { FC } from 'react';
import { InvokesTable } from '../InvokesTable';
import SearchInput from '@/components/SearchInput';
import { useState } from 'react';
import isEmpty from 'lodash/isEmpty';
import { ChainBuilderContext } from '@usecannon/builder';

export const FunctionCallsTab: FC<{
  invokeState: ChainBuilderContext['txns'];
  chainId: number;
}> = ({ invokeState, chainId }) => {
  const [invokeSearchTerm, setInvokeSearchTerm] = useState<string>('');

  const filteredInvokeState = Object.fromEntries(
    Object.entries(invokeState).filter(([, func]) =>
      Object.values(func).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(invokeSearchTerm.toLowerCase())
      )
    )
  );

  if (isEmpty(invokeState)) {
    return (
      <>
        <div className="pt-4 pb-2 px-4">
          <div className="flex flex-col md:flex-row justify-start items-center">
            <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
              <p className="text-muted-foreground text-lg">
                No functions were invoked when building this package or a
                package it upgraded from.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pt-4 pb-2 px-4">
        <div className="flex flex-col md:flex-row justify-start items-center">
          <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
            <p className="text-muted-foreground text-lg">
              These functions were invoked when building this package or a
              package it upgraded from.
            </p>
          </div>
          <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
            <SearchInput onSearchChange={setInvokeSearchTerm} />
          </div>
        </div>
      </div>

      <div className="max-w-full mx-4 my-2">
        <InvokesTable invokeState={filteredInvokeState} chainId={chainId} />
      </div>
    </>
  );
};

export default FunctionCallsTab;
