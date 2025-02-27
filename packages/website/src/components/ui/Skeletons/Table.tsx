import { Skeleton } from '@/components/ui/skeleton';

const TableSkeleton = ({ rows = 4 }: { rows?: number }) => {
  return (
    <div className="p-4 space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  );
};

export default TableSkeleton;
