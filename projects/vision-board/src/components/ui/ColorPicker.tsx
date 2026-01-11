import { useState } from 'react';
import { ROUTINE_COLORS } from '@/constants/styles';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  darkMode: boolean;
}

export const ColorPicker = ({ color, onChange, darkMode }: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute left-5 bottom-[20%] mb-1 p-2 rounded-lg shadow-xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex flex-wrap gap-2 min-w-[160px]">
              {ROUTINE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setIsOpen(false); }}
                  className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
