import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { MAX_PAGE_SIZE } from '@/constants/pagination';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type TransactionPaginationProp = {
  address: string;
  chainId: number;
  currentPageIndex: number; // 1-indexed page number
  isFirstPage: boolean;
  isLastPage: boolean;
  totalPages: number | null; // null means we don't know yet
};

const TransactionsPagination: React.FC<TransactionPaginationProp> = ({
  address,
  chainId,
  currentPageIndex,
  isFirstPage,
  isLastPage,
  totalPages,
}) => {
  const pageClass = (disabled: boolean) =>
    `items-center px-3 py-1 text-xs border border-gray-500 text-gray-200 rounded ${
      disabled ? 'pointer-events-none opacity-50' : ''
    }`;

  const getPageHref = (page: number) =>
    page === 1
      ? `/txs?a=${address}&c=${chainId}`
      : `/txs?a=${address}&c=${chainId}&p=${page}`;

  const displayTotal = totalPages ?? '?';
  const isMaxPage = currentPageIndex >= MAX_PAGE_SIZE;

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
              href={getPageHref(currentPageIndex - 1)}
              className={pageClass(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Go to Previous</TooltipContent>
        </Tooltip>
      ) : (
        <Link href="#" className={pageClass(true)} onClick={(e) => e.preventDefault()}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
      )}

      {/* Page Info */}
      <span className={pageClass(true)}>
        Page {currentPageIndex}/{displayTotal}
      </span>

      {/* Next */}
      {isLastPage || isMaxPage ? (
        <Link href="#" className={pageClass(true)} onClick={(e) => e.preventDefault()}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={getPageHref(currentPageIndex + 1)}
              className={pageClass(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Go to Next</TooltipContent>
        </Tooltip>
      )}

      {/* Last - only show if we know the total */}
      {totalPages !== null ? (
        <Link
          href={getPageHref(totalPages)}
          className={pageClass(isLastPage || isMaxPage)}
        >
          Last
        </Link>
      ) : (
        <Link href="#" className={pageClass(true)} onClick={(e) => e.preventDefault()}>
          Last
        </Link>
      )}
    </div>
  );
};

export default TransactionsPagination;
