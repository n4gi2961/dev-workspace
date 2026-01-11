import { useState } from 'react';
import { Square } from 'lucide-react';
import { IMAGE_SHAPES } from '@/constants/types';

interface ShapeSelectorProps {
  currentShape: string;
  onShapeChange: (shape: string) => void;
  darkMode: boolean;
}

export const ShapeSelector = ({ currentShape, onShapeChange, darkMode }: ShapeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const shapes = [
    { id: IMAGE_SHAPES.FREE, label: '自由' },
    { id: IMAGE_SHAPES.ORIGINAL, label: 'オリジナル' },
    { id: IMAGE_SHAPES.SQUARE, label: '正方形' },
    { id: IMAGE_SHAPES.LANDSCAPE, label: '横長 16:9' },
    { id: IMAGE_SHAPES.PORTRAIT, label: '縦長 3:4' },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 bg-violet-500/80 hover:bg-violet-600 rounded-full transition-colors"
        title="形状を変更"
      >
        <Square size={14} className="text-white" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full right-0 mt-2 p-2 rounded-xl shadow-2xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex flex-col gap-1 min-w-[120px]">
              {shapes.map(shape => (
                <button
                  key={shape.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShapeChange(shape.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    currentShape === shape.id
                      ? 'bg-violet-500/20 text-violet-400'
                      : darkMode
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Square size={14} />
                  {shape.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
