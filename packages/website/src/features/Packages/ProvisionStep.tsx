import { FC, useMemo } from 'react';
import {
  BundledOutput,
  ChainArtifacts,
  BundledChainBuilderOutputs,
} from '@usecannon/builder';
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
    <div className="mb-8">
      {output.map((o) => {
        return (
          <div key={JSON.stringify(o)}>
            <div className="mb-2 flex">
              {o.title && (
                <h3 className="mb-1 inline-block text-xl font-semibold tracking-tight">
                  {o.title}
                </h3>
              )}
              {o.url && (
                <div className="ml-auto flex items-center">
                  <code className="bg-transparent text-gray-200 cursor-pointer">
                    {o.url}
                  </code>
                  <div
                    className="ml-1 cursor-pointer"
                    onClick={async () => {
                      await copy(o.url);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </div>
                </div>
              )}
            </div>
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
          </div>
        );
      })}
    </div>
  );
};
