'use client';

import { useState } from 'react';
import { Square, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MilestoneInputProps {
  onAdd: (title: string) => void;
  darkMode: boolean;
}

export const MilestoneInput = ({ onAdd, darkMode }: MilestoneInputProps) => {
  const t = useTranslations('pageEditor');
  const [title, setTitle] = useState('');

  const handleSubmit = () => {
    if (title.trim()) {
      onAdd(title.trim());
      setTitle('');
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
      <div className="w-6" />
      <Square size={20} className={darkMode ? 'text-gray-600' : 'text-gray-300'} />
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        placeholder={t('milestones.addPlaceholder')}
        className={`flex-1 bg-transparent border-none outline-none ${
          darkMode ? 'text-gray-200 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
        }`}
      />
      <button
        onClick={handleSubmit}
        disabled={!title.trim()}
        className={`p-1.5 rounded-lg transition-colors ${
          title.trim()
            ? 'hover:bg-violet-500/20 text-violet-400'
            : 'text-gray-500 cursor-not-allowed'
        }`}
      >
        <Plus size={18} />
      </button>
    </div>
  );
};
