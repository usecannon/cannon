import React from 'react';

type TypeColumnProps = { info: any };

const TypeColumn: React.FC<TypeColumnProps> = ({ info }) => {
  const type = info.getValue();
  return (
    <span className="px-2 py-1 text-xs border border-gray-500 text-gray-400 rounded-xl">
      {type}
    </span>
  );
};

export default TypeColumn;
