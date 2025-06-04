import React from 'react';

type HoverHighlightProps = {
  children: React.ReactNode;
  id: string;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
};

const HoverHighlight: React.FC<HoverHighlightProps> = ({
  children,
  id,
  hoverId,
  setHoverId,
}) => {
  const hoverColorSetting =
    'border-yellow-500 bg-yellow-100 opacity-70 border-dotted text-black';
  const isHover = id === hoverId;

  return (
    <>
      <span
        onMouseEnter={() => {
          setHoverId(id);
        }}
        onMouseLeave={() => {
          setHoverId('');
        }}
        className={`px-1 border border-transparent transition-colors duration-200 rounded-md ${
          isHover ? hoverColorSetting : ''
        }`}
        id={id}
      >
        {children}
      </span>
    </>
  );
};

export default HoverHighlight;
