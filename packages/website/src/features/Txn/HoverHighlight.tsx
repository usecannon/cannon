import React from 'react';

type HoverHighlightProps = {
  children: React.ReactNode;
  id: string;
  hoverId: string;
  setHoverId: (hoverId: string) => void;
  className?: string;
};

const HoverHighlight: React.FC<HoverHighlightProps> = ({
  children,
  id,
  hoverId,
  setHoverId,
  className,
}) => {
  const hoverColorSetting =
    'bg-yellow-100 text-black opacity-70 border-yellow-500 rounded-md';
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
        id={id}
      >
        <span
          className={`inline ${className} border-b border-dotted px-1 transition-all duration-200
      ${
        isHover
          ? hoverColorSetting
          : 'border-muted-foreground bg-transparent text-inherit'
      }
    `}
        >
          {children}
        </span>
      </span>
    </>
  );
};

export default HoverHighlight;
