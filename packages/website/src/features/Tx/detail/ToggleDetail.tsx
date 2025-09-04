import { Minus, Plus } from 'lucide-react';

type ToggleDetailProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const ToggleDetail: React.FC<ToggleDetailProps> = ({ isOpen, setIsOpen }) => {
  return (
    <div className="flex flex-col sm:flex-row items-start gap-x-4 gap-y-1">
      <div className="w-full sm:w-1/4 text-left font-medium text-gray-400">
        More Details:
      </div>
      <div className="w-full sm:w-3/4 flex items-center gap-2 font-bold">
        {isOpen ? (
          <span
            className="text-gray-300 cursor-pointer flex items-center gap-1"
            onClick={() => setIsOpen(false)}
          >
            <Minus className="w-4 h-4" />
            <span>Clicks to show less</span>
          </span>
        ) : (
          <span
            className="text-gray-300 cursor-pointer flex items-center gap-1"
            onClick={() => setIsOpen(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Clicks to show more</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default ToggleDetail;
