import { FC, useMemo } from 'react';
import { BundledOutput, ChainArtifacts } from '@usecannon/builder';
import { Box, Flex, Heading, Code } from '@chakra-ui/react';
import { BundledChainBuilderOutputs } from '@usecannon/builder';
import { Copy } from 'react-feather';
import { useCopy } from '@/lib/copy';
import { ContractStep } from '@/features/Packages/ContractStep';

export const ProvisionStep: FC<{
  cannonOutputs: ChainArtifacts;
  imports: BundledChainBuilderOutputs;
  chainId: number;
}> = ({ cannonOutputs, imports, chainId }) => {
  const output: {
    title: string;
    url: BundledOutput['url'];
    contracts: BundledOutput['contracts'];
    imports: BundledOutput['imports'];
  }[] = useMemo(() => {
    return (
      Object.entries(imports).map(([k, v]) => {
        return {
          title: k,
          url: v.url,
          contracts: v.contracts,
          imports: v.imports,
        };
      }) || []
    );
  }, [imports]);

  const copy = useCopy();

  return (
    <Box mb="8">
      {output.map((o) => {
        return (
          <Box key={JSON.stringify(o)}>
            <Flex mb="2">
              {o.title && (
                <Heading mb="1" size="md" display="inline-block">
                  {o.title}
                </Heading>
              )}
              {o.url && (
                <Flex ml="auto" alignItems="center">
                  <Code bg="transparent" color="gray.200" cursor="pointer">
                    {o.url.replace('ipfs://', '@ipfs:')}
                  </Code>
                  <Box
                    ml={1}
                    onClick={async () => {
                      await copy(o.url.replace('ipfs://', '@ipfs:'));
                    }}
                    className="copy-button"
                  >
                    <Copy size={16} />
                  </Box>
                </Flex>
              )}
            </Flex>
            <ContractStep
              contracts={o.contracts}
              cannonOutputs={cannonOutputs}
              chainId={chainId}
            />

            {o.imports && (
              <ProvisionStep
                imports={o.imports}
                cannonOutputs={cannonOutputs}
                chainId={chainId}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};
