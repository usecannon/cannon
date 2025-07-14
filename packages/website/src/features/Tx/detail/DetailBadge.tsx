import React from 'react';

type DetailBadgeProps = {
  label?: string;
  value: string;
  className?: string;
};

const DetailBadge: React.FC<DetailBadgeProps> = ({
  label,
  value,
  className = '',
}) => {
  return (
    <span
      className={`inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md ${className}`}
    >
      {label && <span className="text-gray-400 mr-1">{label}</span>}
      <span>{value}</span>
    </span>
  );
};

export default DetailBadge;
