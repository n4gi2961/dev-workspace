'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { NODE_TYPES } from '@/constants/types';
import { HoverPreview } from '@/components/features/HoverPreview';

interface AmbientModeProps {
  nodes: any[];
  pages: Record<string, any>;
  onToggleRoutine: (nodeId: string, routineId: string, date: string) => void;
  darkMode: boolean;
  onClose: () => void;
}

export const AmbientMode = ({ nodes, pages, onToggleRoutine, darkMode, onClose }: AmbientModeProps) => {
  const t = useTranslations('ambientMode');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const imageNodes = nodes.filter(n => n.type === NODE_TYPES.IMAGE);
  const lastWheelTime = useRef(0);

  // スライド完了後にprevIndexをクリア
  useEffect(() => {
    if (slideDirection) {
      const timer = setTimeout(() => {
        setPrevIndex(null);
        setSlideDirection(null);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [slideDirection]);

  const goToNext = useCallback(() => {
    if (imageNodes.length <= 1) return;
    setPrevIndex(currentIndex);
    setSlideDirection('up');
    setCurrentIndex(prev => (prev + 1) % imageNodes.length);
    setIsShowingDetails(false);
  }, [currentIndex, imageNodes.length]);

  const goToPrev = useCallback(() => {
    if (imageNodes.length <= 1) return;
    setPrevIndex(currentIndex);
    setSlideDirection('down');
    setCurrentIndex(prev => (prev - 1 + imageNodes.length) % imageNodes.length);
    setIsShowingDetails(false);
  }, [currentIndex, imageNodes.length]);

  // キーボードイベント（Escape、上下矢印）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') goToNext();
      if (e.key === 'ArrowUp') goToPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose]);

  // ホイールスクロールで画像切り替え（デバウンス付き）
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 400) return;
    lastWheelTime.current = now;

    if (e.deltaY > 0) {
      goToNext();
    } else if (e.deltaY < 0) {
      goToPrev();
    }
  }, [goToNext, goToPrev]);

  if (imageNodes.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onClick={onClose}
      >
        <p className="text-white/60 text-lg">{t('addImages')}</p>
      </div>
    );
  }

  const currentNode = imageNodes[currentIndex];
  const currentPage = pages[currentNode.id];
  const prevNode = prevIndex !== null ? imageNodes[prevIndex] : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      onWheel={handleWheel}
      onClick={onClose}
    >
      {/* 背景のぼかし画像 */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-400"
        style={{
          backgroundImage: `url(${currentNode.src})`,
          filter: 'blur(50px) brightness(0.3)',
          transform: 'scale(1.2)',
        }}
      />

      {/* メイン画像エリア - フルスクリーン */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* 退出する画像（前の画像） */}
        {prevNode && slideDirection && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              animation: slideDirection === 'up'
                ? 'slideOutUp 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'slideOutDown 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
          >
            <img
              src={prevNode.src}
              alt="Vision"
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        )}

        {/* 現在の画像 */}
        <div
          className="relative flex items-center justify-center pointer-events-auto cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsShowingDetails(prev => !prev);
          }}
          style={{
            animation: slideDirection
              ? slideDirection === 'up'
                ? 'slideInFromBottom 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
                : 'slideInFromTop 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
              : undefined,
          }}
        >
          <img
            src={currentNode.src}
            alt="Vision"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
          />

          {/* クリック時のルーティン表示 */}
          {isShowingDetails && currentPage && (
            <HoverPreview
              node={currentNode}
              page={currentPage}
              onToggleRoutine={onToggleRoutine}
              darkMode={darkMode}
              fontSize="medium"
              textColor="white"
            />
          )}
        </div>
      </div>

      {/* ページインジケーター（画面右端に固定） */}
      {imageNodes.length > 1 && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 pointer-events-auto z-10">
          {imageNodes.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (idx !== currentIndex) {
                  setPrevIndex(currentIndex);
                  setSlideDirection(idx > currentIndex ? 'up' : 'down');
                  setCurrentIndex(idx);
                  setIsShowingDetails(false);
                }
              }}
              className={`w-1.5 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white h-5' : 'bg-white/50 hover:bg-white/70 h-1.5'
              }`}
            />
          ))}
        </div>
      )}

      {/* アニメーション用CSS - 連続スライド */}
      <style jsx>{`
        @keyframes slideOutUp {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-100vh);
          }
        }
        @keyframes slideOutDown {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100vh);
          }
        }
        @keyframes slideInFromBottom {
          from {
            transform: translateY(100vh);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100vh);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
