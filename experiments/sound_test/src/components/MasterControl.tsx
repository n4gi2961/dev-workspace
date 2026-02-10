import { Volume2 } from 'lucide-react';

interface MasterControlProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
}

export function MasterControl({ volume, onVolumeChange }: MasterControlProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
      <Volume2 className="text-green-400" size={24} />
      <div className="flex-1">
        <div className="text-slate-400 text-sm mb-1">Master Volume</div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume * 100}
          onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
        />
      </div>
      <div className="text-white font-mono w-12 text-right">{Math.round(volume * 100)}%</div>
    </div>
  );
}
