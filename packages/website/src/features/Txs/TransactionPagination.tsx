import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { maxPageSize } from '@/lib/address';

type TransactionPagenationProp = {
  address: string;
  chainId: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  blockNumber: string;
  pages: string[];
};

const TransactionPagenation: React.FC<TransactionPagenationProp> = ({
  address,
  chainId,
  isFirstPage,
  isLastPage,
  blockNumber,
  pages,
}) => {
  return (
    <div className="flex gap-1 items-center">
      {/* First */}
      <Link
        href={`/txs?a=${address}&c=${chainId}`}
        className={`items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded ${
          isFirstPage ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <span className="">First</span>
      </Link>

      {/* Prev */}
      <Link
        href={`/txs?a=${address}&p=${
          isLastPage ? pages.length : pages.indexOf(blockNumber)
        }&c=${chainId}`}
        className={`items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded ${
          isFirstPage ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <span className="">
          <ChevronLeft className="h-4 w-4" />
        </span>
      </Link>

      {/* Page Info */}
      <span className="items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded pointer-events-none opacity-50">
        Page
        {isLastPage ? pages.length + 1 : pages.indexOf(blockNumber) + 1}/
        {maxPageSize == pages.length ? maxPageSize : pages.length + 1}
      </span>

      {/* Next */}
      <Link
        href={`/txs?a=${address}&p=${
          pages.indexOf(blockNumber) + 2
        }&c=${chainId}`}
        className={`items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded ${
          isLastPage || maxPageSize == pages.indexOf(blockNumber) + 1
            ? 'pointer-events-none opacity-50'
            : ''
        }`}
      >
        <span className="">
          <ChevronRight className="h-4 w-4" />
        </span>
      </Link>
      {/* Last */}
      <Link
        href={`/txs?a=${address}&p=${
          maxPageSize === pages.length ? maxPageSize : pages.length + 1
        }&c=${chainId}`}
        className={`items-center px-3 py-1 text-xs border border-gray-500 text-gray-300 rounded ${
          isLastPage || maxPageSize == pages.indexOf(blockNumber) + 1
            ? 'pointer-events-none opacity-50'
            : ''
        }`}
      >
        <span className="">Last</span>
      </Link>
    </div>
  );
};

export default TransactionPagenation;
