import React from 'react';

type DetailBadgeProps = {
  label?: string;
  value: string;
  className?: string;
};

const DetailBadge = React.forwardRef<HTMLDivElement, DetailBadgeProps>(
  ({ label, value, className = '' }, ref) => {
    return (
      <span
        className={`inline-block text-center justify-center itens-center px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md ${className}`}
        ref={ref}
      >
        {label && <span className="text-gray-400 mr-1">{label}</span>}
        <span>{value}</span>
      </span>
    );
  }
);

export default DetailBadge;
