import { FC } from 'react';
import { ContractsTable } from '../ContractsTable';
import SearchInput from '@/components/SearchInput';
import { useState } from 'react';
import isEmpty from 'lodash/isEmpty';
import { ContractOption } from '@/lib/interact';

export const ContractsTab: FC<{
  contractState: ContractOption[];
  chainId: number;
}> = ({ contractState, chainId }) => {
  const [contractSearchTerm, setContractSearchTerm] = useState<string>('');

  const filteredContractStateData = Object.fromEntries(
    Object.entries(contractState).filter(([, val]) =>
      Object.values(val as Record<string, unknown>).some(
        (v) =>
          typeof v === 'string' &&
          v.toLowerCase().includes(contractSearchTerm.toLowerCase())
      )
    )
  );

  if (isEmpty(filteredContractStateData)) {
    return (
      <>
        <div className="pt-4 px-4">
          <div className="flex flex-col md:flex-row justify-start items-center">
            <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
              <p className="text-muted-foreground text-lg">
                No contracts were deployed when building this package or a
                package it upgraded from.
              </p>
            </div>
            <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
              <SearchInput onSearchChange={setContractSearchTerm} />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pt-4 px-4">
        <div className="flex flex-col md:flex-row justify-start items-center">
          <div className="w-full md:w-auto flex justify-between items-center mb-2 md:mb-0 min-h-[40px]">
            <p className="text-muted-foreground text-lg">
              These contracts were deployed when building this package or a
              package it upgraded from.
            </p>
          </div>
          <div className="pl-0 md:pl-6 w-full md:w-auto md:ml-auto mt-2 md:mt-0">
            <SearchInput onSearchChange={setContractSearchTerm} />
          </div>
        </div>
      </div>
      {!isEmpty(filteredContractStateData) && (
        <div className="max-w-full m-4">
          <ContractsTable
            contractState={filteredContractStateData}
            chainId={chainId}
          />
        </div>
      )}
    </>
  );
};

export default ContractsTab;
