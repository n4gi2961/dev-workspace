import { useState } from 'react';
import { X } from 'lucide-react';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { NODE_TYPES } from '@/constants/types';

interface WallpaperExportModalProps {
  nodes: any[];
  darkMode: boolean;
  onClose: () => void;
}

export const WallpaperExportModal = ({ nodes, darkMode, onClose }: WallpaperExportModalProps) => {
  const [resolution, setResolution] = useState('1920x1080');
  const [exporting, setExporting] = useState(false);

  const resolutions = [
    { id: '1920x1080', label: 'デスクトップ (1920×1080)', width: 1920, height: 1080 },
    { id: '2560x1440', label: 'デスクトップ QHD (2560×1440)', width: 2560, height: 1440 },
    { id: '3840x2160', label: 'デスクトップ 4K (3840×2160)', width: 3840, height: 2160 },
    { id: '1170x2532', label: 'iPhone (1170×2532)', width: 1170, height: 2532 },
    { id: '1284x2778', label: 'iPhone Pro Max (1284×2778)', width: 1284, height: 2778 },
    { id: '2048x2732', label: 'iPad (2048×2732)', width: 2048, height: 2732 },
  ];

  const handleExport = async () => {
    setExporting(true);

    const res = resolutions.find(r => r.id === resolution);
    if (!res) return;

    const canvas = document.createElement('canvas');
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = darkMode ? '#030712' : '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / BOARD_WIDTH;
    const scaleY = canvas.height / BOARD_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (canvas.width - BOARD_WIDTH * scale) / 2;
    const offsetY = (canvas.height - BOARD_HEIGHT * scale) / 2;

    const imageNodes = nodes.filter(n => n.type === NODE_TYPES.IMAGE);

    for (const node of imageNodes) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = node.src;
        });

        const x = offsetX + node.x * scale;
        const y = offsetY + node.y * scale;
        const w = node.width * scale;
        const h = node.height * scale;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8 * scale);
        ctx.clip();
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      } catch (e) {
        console.error('Failed to load image:', e);
      }
    }

    const textNodes = nodes.filter(n => n.type === NODE_TYPES.TEXT);
    for (const node of textNodes) {
      if (!node.content) continue;

      const x = offsetX + node.x * scale;
      const y = offsetY + node.y * scale;
      const fontSize = (node.fontSize || 16) * scale;

      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = node.color || (darkMode ? '#ffffff' : '#000000');
      ctx.fillText(node.content, x, y + fontSize);
    }

    const link = document.createElement('a');
    link.download = `vision-board-${resolution}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    setExporting(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md p-6 rounded-2xl shadow-2xl ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            壁紙として出力
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-800'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              解像度を選択
            </label>
            <div className="space-y-2">
              {resolutions.map(res => (
                <button
                  key={res.id}
                  onClick={() => setResolution(res.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    resolution === res.id
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                      : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-750'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50"
          >
            {exporting ? '出力中...' : 'ダウンロード'}
          </button>

          <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            ダウンロード後、デバイスの設定から壁紙に設定してください
          </p>
        </div>
      </div>
    </div>
  );
};
