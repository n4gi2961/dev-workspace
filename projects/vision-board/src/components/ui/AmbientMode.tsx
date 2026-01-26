'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { NODE_TYPES } from '@/constants/types';
import { HoverPreview } from '@/components/features/HoverPreview';
import { useMeteorAnimation } from '@/hooks/useMeteorAnimation';
import { MeteorEffect } from '@/components/ui/MeteorEffect';
import { getTodayString } from '@/lib/utils';

interface AmbientModeProps {
  nodes: any[];
  pages: Record<string, any>;
  routines?: Record<string, any>;  // ★ useRoutines経由のルーティン一覧
  routineNodes?: any[];  // ★ ルーティンとノードの関連
  getRoutinesForNode?: (nodeId: string) => any[];  // ★ ノードのルーティン取得関数
  onToggleRoutine: (nodeId: string, routineId: string, date: string) => void;
  darkMode: boolean;
  onClose: () => void;
}

export const AmbientMode = ({ nodes, pages, routines, routineNodes, getRoutinesForNode, onToggleRoutine, darkMode, onClose }: AmbientModeProps) => {
  const t = useTranslations('ambientMode');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<'up' | 'down' | null>(null);
  const [isShowingDetails, setIsShowingDetails] = useState(false);
  const lastWheelTime = useRef(0);

  // 画像の実際の表示サイズを保持
  const [imageDisplaySize, setImageDisplaySize] = useState<{ width: number; height: number } | null>(null);

  // シャッフル結果をキャッシュ（ノードIDが変わらない限り再計算しない）
  const shuffledNodesRef = useRef<any[]>([]);
  const prevNodeIdsRef = useRef<string>('');

  const imageNodes = useMemo(() => {
    const filtered = nodes.filter(n => n.type === NODE_TYPES.IMAGE);
    const currentIds = filtered.map(n => n.id).sort().join(',');

    // ノードのID構成が変わった場合のみ再シャッフル
    if (currentIds !== prevNodeIdsRef.current) {
      prevNodeIdsRef.current = currentIds;
      const shuffled = [...filtered];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      shuffledNodesRef.current = shuffled;
    }

    return shuffledNodesRef.current;
  }, [nodes]);

  // Meteor animation for routine check
  const { meteors, trigger: triggerMeteor } = useMeteorAnimation({ duration: 1000 });
  const todayString = getTodayString();

  // Wrap onToggleRoutine to trigger meteor on check (5% chance for dopamine effect)
  const METEOR_CHANCE = 0.05; // 5% probability
  const handleToggleRoutine = useCallback((nodeId: string, routineId: string, date: string) => {
    // ★ useRoutines経由のroutinesを優先使用
    const routine = routines?.[routineId];
    if (routine && !routine.history?.[date]) {
      // This is a check action - trigger meteor with 5% probability
      const isMeteor = Math.random() < METEOR_CHANCE;
      if (isMeteor) {
        triggerMeteor(routine.color || '#8b5cf6');
        // Strong haptic feedback for meteor (pattern: vibrate-pause-vibrate)
        if (navigator.vibrate) {
          navigator.vibrate([50, 30, 80]);
        }
      } else {
        // Normal haptic feedback
        if (navigator.vibrate) {
          navigator.vibrate(25);
        }
      }
    }
    onToggleRoutine(nodeId, routineId, date);
  }, [routines, onToggleRoutine, triggerMeteor]);

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
    setImageDisplaySize(null);
  }, [currentIndex, imageNodes.length]);

  const goToPrev = useCallback(() => {
    if (imageNodes.length <= 1) return;
    setPrevIndex(currentIndex);
    setSlideDirection('down');
    setCurrentIndex(prev => (prev - 1 + imageNodes.length) % imageNodes.length);
    setIsShowingDetails(false);
    setImageDisplaySize(null);
  }, [currentIndex, imageNodes.length]);

  // 画像の表示サイズを計算
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // 95vw x 95vh の領域に収まる表示サイズを計算
    const containerWidth = window.innerWidth * 0.95;
    const containerHeight = window.innerHeight * 0.95;

    const imageAspect = naturalWidth / naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth: number;
    let displayHeight: number;

    if (imageAspect > containerAspect) {
      // 横長画像：横幅に合わせる
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
    } else {
      // 縦長画像：縦幅に合わせる
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
    }

    setImageDisplaySize({ width: displayWidth, height: displayHeight });
  }, []);

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
              className="w-[95vw] h-[95vh] object-contain rounded-xl shadow-2xl"
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
            // 通常時: 95vw x 95vh、クリック時: 計算された画像サイズ
            width: isShowingDetails && imageDisplaySize ? imageDisplaySize.width : '95vw',
            height: isShowingDetails && imageDisplaySize ? imageDisplaySize.height : '95vh',
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
            className="w-full h-full object-contain rounded-xl shadow-2xl"
            onLoad={handleImageLoad}
          />

          {/* クリック時のルーティン表示 */}
          {isShowingDetails && currentPage && (
            <HoverPreview
              node={currentNode}
              page={currentPage}
              nodeRoutines={getRoutinesForNode?.(currentNode.id)}
              onToggleRoutine={handleToggleRoutine}
              fontSize="medium"
              textColor="white"
            />
          )}

          {/* 流れ星エフェクト */}
          <MeteorEffect meteors={meteors} />
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
                  setImageDisplaySize(null);
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
