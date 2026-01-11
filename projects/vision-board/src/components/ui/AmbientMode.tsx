import { useState, useEffect } from 'react';
import { NODE_TYPES } from '@/constants/types';

interface AmbientModeProps {
  nodes: any[];
  darkMode: boolean;
  onClose: () => void;
}

export const AmbientMode = ({ nodes, darkMode, onClose }: AmbientModeProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageNodes = nodes.filter(n => n.type === NODE_TYPES.IMAGE);

  // 画像変更から8秒後に次の画像へ（手動変更でもリセット）
  useEffect(() => {
    if (imageNodes.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % imageNodes.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [imageNodes.length, currentIndex]);  // currentIndex追加でリセット

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % imageNodes.length);
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev - 1 + imageNodes.length) % imageNodes.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageNodes.length, onClose]);

  if (imageNodes.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black flex items-center justify-center cursor-pointer"
        onClick={onClose}
      >
        <p className="text-white/60 text-lg">画像を追加してください</p>
      </div>
    );
  }

  const currentNode = imageNodes[currentIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-black cursor-pointer"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: `url(${currentNode.src})`,
          filter: 'blur(50px) brightness(0.3)',
          transform: 'scale(1.2)',
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center p-16">
        <img
          src={currentNode.src}
          alt="Vision"
          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl transition-all duration-1000"
        />
      </div>

      {imageNodes.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {imageNodes.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      <div className="absolute top-6 right-6 text-white/40 text-sm">
        ESC または クリックで閉じる
      </div>
    </div>
  );
};
