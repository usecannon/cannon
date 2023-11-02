import { ChainArtifacts, ContractData, ContractMap } from '@usecannon/builder';
import { FC, useMemo } from 'react';
import { Box } from '@chakra-ui/react';
import { Contract } from '@/features/Packages/Contract';
import { Abi } from 'viem';

export const ContractStep: FC<{
  contracts?: ContractMap;
  cannonOutputs: ChainArtifacts;
  chainId: number;
}> = ({ contracts = {}, cannonOutputs, chainId }) => {
  const output: ({ title: string } & Pick<
    ContractData,
    'address' | 'abi' | 'highlight'
  >)[] = useMemo(() => {
    return Object.entries(contracts)
      .map(([k, v]) => ({
        title: k,
        address: v.address,
        abi: v.abi,
        highlight: v.highlight,
      }))
      .sort(
        (a, b) =>
          Number(b.highlight ?? false) - Number(a.highlight ?? false) ||
          a.title.localeCompare(b.title)
      );
  }, [contracts]);
  return (
    <Box mb="8">
      {output.map((o) => (
        <Contract
          key={JSON.stringify(o)}
          title={o.title}
          address={o.address}
          abi={o.abi as Abi}
          cannonOutputs={cannonOutputs}
          chainId={chainId}
        />
      ))}
    </Box>
  );
};
