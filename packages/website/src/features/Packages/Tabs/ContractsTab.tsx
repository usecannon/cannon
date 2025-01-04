import { FC } from 'react';
import { ContractsTable } from '../ContractsTable';
import SearchInput from '@/components/SearchInput';
import { useState } from 'react';
import isEmpty from 'lodash/isEmpty';

export const ContractsTab: FC<{
  contractState: any;
  addressesAbis: any;
  chainId: number;
}> = ({ contractState, addressesAbis, chainId }) => {
  const [contractSearchTerm, setContractSearchTerm] = useState<string>('');

  const filteredContractState = Object.fromEntries(
    Object.entries(contractState).filter(([, val]) =>
      Object.values(val as Record<string, unknown>).some(
        (v) =>
          typeof v === 'string' &&
          v.toLowerCase().includes(contractSearchTerm.toLowerCase())
      )
    )
  );

  if (isEmpty(contractState) || isEmpty(addressesAbis)) {
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
      {!isEmpty(filteredContractState) && (
        <div className="max-w-full m-4">
          <ContractsTable
            contractState={filteredContractState as any}
            chainId={chainId}
          />
        </div>
      )}
    </>
  );
};

export default ContractsTab;
