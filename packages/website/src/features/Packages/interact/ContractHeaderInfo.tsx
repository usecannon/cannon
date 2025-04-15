import { FC } from 'react';
import { Code, FileText } from 'lucide-react';
import { ClipboardButton } from '@/components/ClipboardButton';
import { ContractData } from '@usecannon/builder';
interface ContractHeaderInfoProps {
  contract: ContractData | undefined;
  contractAddress: string | undefined;
  name: string;
  tag: string;
  variant: string;
  explorerUrl: string | null;
  deployUrl: string;
}

export const ContractHeaderInfo: FC<ContractHeaderInfoProps> = ({
  contract,
  contractAddress,
  name,
  tag,
  variant,
  explorerUrl,
  deployUrl,
}) => {
  return (
    <div className="flex flex-col md:flex-row bg-background px-2 py-1 border-b border-border items-start md:items-center">
      <div className="p-1">
        <h4 className="inline-block font-medium tracking-[0.1px]">
          {contract?.contractName}
        </h4>
      </div>

      <div className="p-1 md:ml-auto">
        <div className="flex flex-col items-start md:flex-row md:items-center gap-3 md:gap-6 text-gray-300 text-xs font-mono text-muted-foreground">
          <a
            className="no-underline hover:no-underline flex items-center"
            href={`/packages/${name}/${tag}/${variant}/code/${contract?.sourceName}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Code className="h-[14px] w-[14px] mr-1.5" />
            <span className="border-b border-dotted border-gray-300">
              {contract?.sourceName}
            </span>
          </a>

          <div className="flex items-center relative">
            {explorerUrl ? (
              <>
                <a
                  className="no-underline hover:no-underline flex items-center"
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-[14px] w-[14px] mr-1.5" />
                  <span className="border-b border-dotted border-gray-300">
                    {contractAddress
                      ? `${contractAddress.substring(
                          0,
                          6
                        )}...${contractAddress.slice(-4)}`
                      : 'Loading...'}
                  </span>
                </a>
                <div className="absolute right-0 top-0 p-1">
                  {contractAddress && (
                    <ClipboardButton
                      text={contractAddress}
                      className="static ml-1 scale-75"
                    />
                  )}
                </div>
              </>
            ) : null}{' '}
            {contract?.sourceName !== name ? (
              <>
                <span className="mx-1">from</span>
                <a
                  className="no-underline hover:no-underline"
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="border-b border-dotted border-gray-300">
                    {`[clone.${contract?.sourceName}]`}
                  </span>
                </a>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
