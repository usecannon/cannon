import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { MAX_PAGE_SIZE } from '@/constants/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TransactionPagenationProp = {
  address: string;
  chainId: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  blockNumber: string;
  pages: string[];
};

const TransactionsPagination: React.FC<TransactionPagenationProp> = ({
  address,
  chainId,
  isFirstPage,
  isLastPage,
  blockNumber,
  pages,
}) => {
  const currentPageIndex =
    pages.indexOf(blockNumber) < 0 ? 0 : pages.indexOf(blockNumber);
  const totalPages =
    MAX_PAGE_SIZE === pages.length ? MAX_PAGE_SIZE : pages.length + 1;

  const pageClass = (disabled: boolean) =>
    `items-center px-3 py-1 text-xs border border-gray-500 text-gray-200 rounded ${
      disabled ? 'pointer-events-none opacity-50' : ''
    }`;

  const getPageHref = (page: number) =>
    page === 1
      ? `/txs?a=${address}&c=${chainId}`
      : `/txs?a=${address}&c=${chainId}&p=${page}`;

  return (
    <div className="flex gap-1 items-center">
      {/* First */}
      <Link href={getPageHref(1)} className={pageClass(isFirstPage)}>
        First
      </Link>

      {/* Prev */}
      {!isFirstPage ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={getPageHref(
                isFirstPage ? 1 : isLastPage ? totalPages - 1 : currentPageIndex
              )}
              className={pageClass(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Go to Previous</TooltipContent>
        </Tooltip>
      ) : (
        <Link
          href={getPageHref(isFirstPage ? 1 : currentPageIndex)}
          className={pageClass(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {/* Page Info */}
      <span className={pageClass(true)}>
        Page {isLastPage ? pages.length + 1 : currentPageIndex + 1}/{totalPages}
      </span>

      {/* Next */}
      {isLastPage || currentPageIndex + 1 === MAX_PAGE_SIZE ? (
        <Link
          href={getPageHref(currentPageIndex + 2)}
          className={pageClass(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={getPageHref(currentPageIndex + 2)}
              className={pageClass(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Go to Next</TooltipContent>
        </Tooltip>
      )}

      {/* Last */}
      <Link
        href={getPageHref(totalPages)}
        className={pageClass(
          isLastPage || currentPageIndex + 1 === MAX_PAGE_SIZE
        )}
      >
        Last
      </Link>
    </div>
  );
};

export default TransactionsPagination;
