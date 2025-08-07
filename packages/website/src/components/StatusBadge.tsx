import React from 'react';
import { CircleCheck, CircleX } from 'lucide-react';

type StatusBadgeProps = {
  status: string;
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
        status === 'success'
          ? 'text-green-600 border border-green-600 '
          : 'text-red-600 border border-red-600'
      }`}
    >
      {status === 'success' ? (
        <CircleCheck className="w-3 h-3" />
      ) : (
        <CircleX className="w-3 h-3" />
      )}
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
