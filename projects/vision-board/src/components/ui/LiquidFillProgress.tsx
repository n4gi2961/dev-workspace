interface LiquidFillProgressProps {
  percentage: number;
  color: 'violet' | 'emerald' | 'rose';
  label: string;
  count?: number;
  total?: number;
  darkMode: boolean;
  message?: string;
  showUnit?: boolean;
}

export const LiquidFillProgress = ({ percentage, color, label, count, total, darkMode, message, showUnit = true }: LiquidFillProgressProps) => {
  const gradients = {
    violet: 'from-violet-600 to-fuchsia-500',
    emerald: 'from-emerald-500 to-teal-400',
    rose: 'from-rose-500 to-pink-400',
  };

  const bgColors = {
    violet: darkMode ? 'bg-violet-950/50' : 'bg-violet-100',
    emerald: darkMode ? 'bg-emerald-950/50' : 'bg-emerald-100',
    rose: darkMode ? 'bg-rose-950/50' : 'bg-rose-100',
  };

  const waveColors = {
    violet: darkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
    emerald: darkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
    rose: darkMode ? 'rgba(244, 63, 94, 0.3)' : 'rgba(244, 63, 94, 0.2)',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl ${bgColors[color]} p-4`} style={{ minHeight: '140px' }}>
      <div
        className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
        style={{ height: `${Math.max(percentage, 5)}%` }}
      >
        <div className="absolute inset-0 overflow-hidden">
          <svg
            className="absolute bottom-0 w-full animate-pulse"
            viewBox="0 0 100 20"
            preserveAspectRatio="none"
            style={{ height: '20px', transform: 'translateY(-5px)' }}
          >
            <path
              d="M0 10 Q 25 0, 50 10 T 100 10 V 20 H 0 Z"
              fill={waveColors[color]}
            />
          </svg>
        </div>
        <div className={`absolute inset-0 bg-gradient-to-t ${gradients[color]} opacity-80`} />
      </div>

      <div className="relative z-10">
        <p className={`text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {percentage}{showUnit && '%'}
        </p>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {message || (total !== undefined ? `${count} / ${total} 完了` : '')}
        </p>
      </div>
    </div>
  );
};
