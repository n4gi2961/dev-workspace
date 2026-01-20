'use client';

import { useEffect, useCallback, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { StarInstance } from '@/components/features/star-stacking/FallingStar';
import { STAR_STACK_CONFIG } from '@/constants/starStack';

// Dynamic import for Three.js scene (SSR disabled)
const StarStackScene = dynamic(
  () =>
    import('@/components/features/star-stacking/StarStackScene').then(
      (mod) => mod.StarStackScene
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    ),
  }
);

interface StarStackModalProps {
  // useStarStack から渡される props
  stars: StarInstance[];
  isLoading: boolean;
  totalStars: number;
  newStarsCount: number;
  showCork: boolean;
  addStar: () => void;
  addBatch: (count?: number) => void;
  resetStars: () => void;
  syncWithSupabase: () => Promise<void>;
  onClearPendingColors?: () => void;
  darkMode: boolean;
  onClose: () => void;
}

export function StarStackModal({
  stars,
  isLoading,
  totalStars,
  newStarsCount,
  showCork,
  addStar,
  addBatch,
  resetStars,
  syncWithSupabase,
  onClearPendingColors,
  darkMode,
  onClose,
}: StarStackModalProps) {
  const t = useTranslations('board.starStack');

  // Track if we've already synced to prevent duplicate execution
  const hasSyncedRef = useRef(false);

  // Sync with Supabase on mount (only once)
  useEffect(() => {
    if (!hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncWithSupabase().then(() => {
        onClearPendingColors?.();
      });
    }
  }, [syncWithSupabase, onClearPendingColors]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on background click
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const maxStars = STAR_STACK_CONFIG.MAX_STARS;
  const isAtMax = stars.length >= maxStars;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackgroundClick}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${
          darkMode ? 'bg-black/70' : 'bg-black/50'
        } backdrop-blur-sm`}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl h-[80vh] max-h-[600px] rounded-2xl shadow-2xl overflow-hidden ${
          darkMode ? 'bg-gray-900' : 'bg-white'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`absolute top-0 left-0 right-0 z-10 px-6 py-4 ${
            darkMode ? 'bg-gray-900/80' : 'bg-white/80'
          } backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                {t('title')}
              </h2>
              <p
                className={`text-sm ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'hover:bg-gray-800 text-gray-400'
                  : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* 3D Scene */}
        <div className="w-full h-full pt-16 pb-32">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full border-3 border-amber-500 border-t-transparent animate-spin" />
                <p
                  className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Loading...
                </p>
              </div>
            </div>
          ) : (
            <StarStackScene stars={stars} darkMode={darkMode} showCork={showCork} />
          )}
        </div>

        {/* Footer Controls */}
        <div
          className={`absolute bottom-0 left-0 right-0 z-10 px-6 py-4 ${
            darkMode ? 'bg-gray-900/80' : 'bg-white/80'
          } backdrop-blur-sm`}
        >
          {/* Star Counter */}
          <div className="flex items-center justify-center mb-3">
            <div
              className={`px-4 py-2 rounded-full ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  darkMode ? 'text-amber-400' : 'text-amber-600'
                }`}
              >
                {t('counter', { count: stars.length, max: maxStars })}
              </span>
              {newStarsCount > 0 && (
                <span
                  className={`ml-2 text-xs ${
                    darkMode ? 'text-green-400' : 'text-green-600'
                  }`}
                >
                  (+{newStarsCount} new!)
                </span>
              )}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={addStar}
              disabled={isAtMax}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isAtMax
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
              } ${
                darkMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-white'
              }`}
            >
              {t('addStar')}
            </button>

            <button
              onClick={() => addBatch()}
              disabled={isAtMax}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                isAtMax
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
              } ${
                darkMode
                  ? 'bg-amber-700 hover:bg-amber-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {t('addBatch')}
            </button>

            <button
              onClick={resetStars}
              className={`p-2 rounded-xl transition-all hover:scale-105 ${
                darkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-400'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
              }`}
              title={t('reset')}
            >
              <RotateCcw size={18} />
            </button>
          </div>

          {/* Instructions */}
          <div
            className={`mt-3 text-center text-xs ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {t('rotate')} | {t('zoom')}
          </div>
        </div>
      </div>
    </div>
  );
}
