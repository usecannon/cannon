import React from 'react';

type DetailBadgeProps = {
  label: string;
  value: string;
};

const DetailBadge: React.FC<DetailBadgeProps> = ({ label, value }) => {
  return (
    <span className="inline-block px-2 py-1 text-xs font-semibold border border-gray-800 bg-gray-800 rounded-md">
      <span className="text-gray-400 mr-1">{label}</span>
      <span>{value}</span>
    </span>
  );
};

export default DetailBadge;
