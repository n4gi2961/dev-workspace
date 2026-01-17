'use client';

import { Images, Maximize, ZoomOut, ZoomIn } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ZoomControlProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onSlideshow: () => void;
  onEnterFullscreen: () => void;
  darkMode: boolean;
}

export const ZoomControl = ({ zoom, onZoomChange, onSlideshow, onEnterFullscreen, darkMode }: ZoomControlProps) => {
  const t = useTranslations('board');
  const minZoom = 50;
  const maxZoom = 200;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseInt(e.target.value));
  };

  return (
    <div className={`fixed bottom-4 left-4 sm:left-auto sm:right-4 flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl z-30 ${
      darkMode ? 'bg-gray-800/90 text-gray-300' : 'bg-white/90 text-gray-700'
    } backdrop-blur-sm shadow-lg`}>
      {/* ズーム機能 */}
      <button
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 10))}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
      >
        <ZoomOut size={16} />
      </button>

      {/* スライダーは小画面で非表示 */}
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        value={zoom}
        onChange={handleSliderChange}
        className="hidden sm:block w-20 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
      />

      <button
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 10))}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
      >
        <ZoomIn size={16} />
      </button>

      <span className="text-xs font-medium w-8 sm:w-10 text-center">{zoom}%</span>

      <div className={`w-px h-4 sm:h-5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

      {/* 1枚ずつ機能・全画面機能 */}
      <button
        onClick={onSlideshow}
        className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
        title={t('focusMode')}
      >
        <Images size={16} />
      </button>

      <button
        onClick={onEnterFullscreen}
        className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
        title={t('fullscreenMode')}
      >
        <Maximize size={16} />
      </button>
    </div>
  );
};
