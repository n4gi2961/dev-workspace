import { useState } from 'react';
import { HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';

interface FontSizeSelectorProps {
  currentSize: string;
  currentColor: string;
  onSizeChange: (size: string) => void;
  onColorChange: (color: string) => void;
  darkMode: boolean;
}

export const FontSizeSelector = ({ currentSize, currentColor, onSizeChange, onColorChange, darkMode }: FontSizeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizes = [
    { id: HOVER_FONT_SIZES.SMALL, label: '小' },
    { id: HOVER_FONT_SIZES.MEDIUM, label: '中' },
    { id: HOVER_FONT_SIZES.LARGE, label: '大' },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 bg-blue-500/80 hover:bg-blue-600 rounded-full transition-colors flex items-center justify-center"
        title="文字サイズ・色を変更"
      >
        <span className="text-white font-bold text-xs flex items-baseline">
          <span style={{ fontSize: '8px' }}>A</span>
          <span style={{ fontSize: '12px' }}>A</span>
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full right-0 mt-2 p-3 rounded-xl shadow-2xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="space-y-3">
              {/* Size options */}
              <div>
                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  文字サイズ
                </p>
                <div className="flex gap-1">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSizeChange(size.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        currentSize === size.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : darkMode
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color options */}
              <div>
                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  文字色
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(HOVER_TEXT_COLORS.WHITE);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 bg-white ${
                      currentColor === HOVER_TEXT_COLORS.WHITE
                        ? 'border-blue-500'
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(HOVER_TEXT_COLORS.BLACK);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 bg-gray-900 ${
                      currentColor === HOVER_TEXT_COLORS.BLACK
                        ? 'border-blue-500'
                        : 'border-gray-600'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
