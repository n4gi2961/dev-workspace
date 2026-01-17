'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FONT_OPTIONS, SIZE_OPTIONS, COLOR_OPTIONS_DARK, COLOR_OPTIONS_LIGHT } from '@/constants/styles';

interface TextToolbarProps {
  node: any;
  onUpdate: (updatedNode: any | null) => void;
  darkMode: boolean;
}

export const TextToolbar = ({ node, onUpdate, darkMode }: TextToolbarProps) => {
  const t = useTranslations('textToolbar');
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const colorOptions = darkMode ? COLOR_OPTIONS_DARK : COLOR_OPTIONS_LIGHT;

  return (
    <div
      className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-lg shadow-xl z-50 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <button
          onClick={() => { setShowFonts(!showFonts); setShowSizes(false); setShowColors(false); }}
          className={`px-2 py-1 rounded text-xs ${
            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {t('font')}
        </button>
        {showFonts && (
          <div className={`absolute top-full left-0 mt-1 p-1 rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {FONT_OPTIONS.map(font => (
              <button
                key={font.value}
                onClick={() => { onUpdate({ ...node, fontFamily: font.value }); setShowFonts(false); }}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowSizes(!showSizes); setShowFonts(false); setShowColors(false); }}
          className={`px-2 py-1 rounded text-xs ${
            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {node.fontSize || 16}px
        </button>
        {showSizes && (
          <div className={`absolute top-full left-0 mt-1 p-1 rounded-lg shadow-xl max-h-40 overflow-y-auto ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {SIZE_OPTIONS.map(size => (
              <button
                key={size}
                onClick={() => { onUpdate({ ...node, fontSize: size }); setShowSizes(false); }}
                className={`block w-full text-left px-3 py-1 rounded text-xs ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                } ${node.fontSize === size ? 'bg-violet-500/20' : ''}`}
              >
                {size}px
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowColors(!showColors); setShowFonts(false); setShowSizes(false); }}
          className={`w-6 h-6 rounded border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
          style={{ backgroundColor: node.color || (darkMode ? '#ffffff' : '#000000') }}
        />
        {showColors && (
          <div className={`absolute top-full right-0 mt-1 p-2 rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="grid grid-cols-5 gap-1">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => { onUpdate({ ...node, color }); setShowColors(false); }}
                  className={`w-6 h-6 rounded border-2 ${
                    node.color === color ? 'border-violet-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onUpdate(null)}
        className="p-1.5 hover:bg-red-500/20 rounded"
      >
        <Trash2 size={14} className="text-red-400" />
      </button>
    </div>
  );
};
