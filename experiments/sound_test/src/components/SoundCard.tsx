import { Play, Pause } from 'lucide-react';
import { SoundGenerator } from '../core/AudioEngine';

interface SoundCardProps {
  title: string;
  description: string;
  generator: SoundGenerator;
  isPlaying: boolean;
  volume: number;
  onToggle: () => void;
  onVolumeChange: (volume: number) => void;
  color?: string;
}

export function SoundCard({
  title,
  description,
  isPlaying,
  volume,
  onToggle,
  onVolumeChange,
  color = 'bg-slate-700',
}: SoundCardProps) {
  return (
    <div className={`${color} rounded-xl p-4 shadow-lg`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">{title}</h3>
        <button
          onClick={onToggle}
          className={`p-2 rounded-full transition-colors ${
            isPlaying ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-600 hover:bg-slate-500'
          }`}
        >
          {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white" />}
        </button>
      </div>
      <p className="text-slate-400 text-xs mb-3">{description}</p>
      <input
        type="range"
        min="0"
        max="100"
        value={volume * 100}
        onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-green-500"
      />
      <div className="text-right text-xs text-slate-400 mt-1">{Math.round(volume * 100)}%</div>
    </div>
  );
}
