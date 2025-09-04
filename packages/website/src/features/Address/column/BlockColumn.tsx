import React from 'react';

type BlockColumnProps = {
  info: any;
};

const BlockColumn: React.FC<BlockColumnProps> = ({ info }) => {
  return <span>{String(parseInt(info.getValue().slice(2), 16))}</span>;
};

export default BlockColumn;
