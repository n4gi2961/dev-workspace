'use client';

import { useState } from 'react';
import { Plus, Type, ChevronRight, CheckSquare } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BLOCK_TYPES } from '@vision-board/shared/constants';

interface BlockAddMenuProps {
  onAdd: (type: string) => void;
  darkMode: boolean;
}

export const BlockAddMenu = ({ onAdd, darkMode }: BlockAddMenuProps) => {
  const t = useTranslations('blockMenu');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
        }`}
      >
        <Plus size={16} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute left-0 top-full mt-1 z-50 p-1.5 rounded-lg shadow-xl flex items-center gap-1 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.TEXT); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Type size={12} /> {t('text')}
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.HEADING); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Type size={12} /> {t('heading')}
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.TOGGLE); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ChevronRight size={12} /> {t('toggle')}
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.CHECKBOX); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <CheckSquare size={12} /> {t('check')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
