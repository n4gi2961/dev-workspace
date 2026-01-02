import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Type, ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Moon, Sun, ImagePlus, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Download, ChevronLeft, BarChart3, Target, Calendar, FileText, Check, GripVertical, Star } from 'lucide-react';

// Constants
const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 3000;

const BLOCK_TYPES = {
  HEADING: 'heading',
  TEXT: 'text',
  TOGGLE: 'toggle',
  CHECKBOX: 'checkbox',
};

const NODE_TYPES = {
  IMAGE: 'image',
  TEXT: 'text',
};

const IMAGE_SHAPES = {
  FREE: 'free',
  SQUARE: 'square',
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
};

const HOVER_FONT_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

const HOVER_FONT_CONFIG = {
  [HOVER_FONT_SIZES.SMALL]: { title: 14, text: 11, icon: 12, label: 10 },
  [HOVER_FONT_SIZES.MEDIUM]: { title: 18, text: 14, icon: 16, label: 12 },
  [HOVER_FONT_SIZES.LARGE]: { title: 22, text: 17, icon: 20, label: 14 },
};

const HOVER_TEXT_COLORS = {
  WHITE: 'white',
  BLACK: 'black',
};

// Routine colors - vibrant but readable
const ROUTINE_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
];

const getRandomColor = () => ROUTINE_COLORS[Math.floor(Math.random() * ROUTINE_COLORS.length)];

// Encouragement messages based on percentage
const getEncouragementMessage = (percentage, type) => {
  if (type === 'milestone') {
    if (percentage === 0) return 'はじめの一歩を踏み出そう';
    if (percentage < 25) return '着実に前進中';
    if (percentage < 50) return '順調に進んでいます';
    if (percentage < 75) return 'ゴールが見えてきた';
    if (percentage < 100) return 'あと少し！';
    return '目標達成！おめでとう🎉';
  }
  if (type === 'today') {
    if (percentage === 0) return '今日も頑張ろう';
    if (percentage < 50) return 'いい調子！';
    if (percentage < 100) return 'あと少しで完璧';
    return '今日も完璧！✨';
  }
  if (type === 'streak') {
    if (percentage === 0) return '千里の道も一歩から';
    if (percentage < 10) return '継続は力なり';
    if (percentage < 30) return '習慣が芽生えてきた';
    if (percentage < 50) return '良いリズムができてきた';
    if (percentage < 70) return '素晴らしい継続力';
    if (percentage < 90) return '習慣マスターへの道';
    return '圧倒的継続力！💪';
  }
  return '';
};

const CATEGORIES = [
  { id: 'place', label: '行きたい場所', color: 'bg-blue-500' },
  { id: 'state', label: 'なりたい状態', color: 'bg-green-500' },
  { id: 'experience', label: '体験したいこと', color: 'bg-purple-500' },
];

const DECADES = [
  { id: '2020s', label: '2020年代' },
  { id: '2030s', label: '2030年代' },
  { id: '2040s', label: '2040年代' },
  { id: '2050s', label: '2050年代' },
  { id: '2060s', label: '2060年代以降' },
];

const FONT_OPTIONS = [
  { label: 'ゴシック', value: "'Noto Sans JP', sans-serif" },
  { label: '明朝', value: "'Noto Serif JP', serif" },
  { label: '手書き', value: "'Klee One', cursive" },
];

const SIZE_OPTIONS = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];

const COLOR_OPTIONS_DARK = [
  '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#a855f7'
];

const COLOR_OPTIONS_LIGHT = [
  '#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#a855f7'
];

const generateId = () => Math.random().toString(36).substr(2, 9);

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
];

// Helper functions
const getTodayString = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getWeekDates = (offset = 0) => {
  const today = new Date();
  const currentDay = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (offset * 7));
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const getMonthDates = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const dates = [];
  
  // Add padding for days before the first of the month
  const startPadding = (firstDay.getDay() + 6) % 7; // Monday = 0
  for (let i = startPadding - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    dates.push({ date: date.toISOString().split('T')[0], isCurrentMonth: false });
  }
  
  // Add all days of the month
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    dates.push({ date: date.toISOString().split('T')[0], isCurrentMonth: true });
  }
  
  // Add padding for days after the last of the month
  const endPadding = (7 - (dates.length % 7)) % 7;
  for (let i = 1; i <= endPadding; i++) {
    const date = new Date(year, month + 1, i);
    dates.push({ date: date.toISOString().split('T')[0], isCurrentMonth: false });
  }
  
  return dates;
};

const getDayLabel = (index) => ['月', '火', '水', '木', '金', '土', '日'][index];

const createInitialBlocks = () => {
  return [{
    id: generateId(),
    type: BLOCK_TYPES.TEXT,
    content: '',
    checked: false,
    isOpen: true,
    children: [],
  }];
};

const createInitialPage = () => ({
  title: '',
  description: '',
  headerImage: null,
  category: null,
  targetDecade: null,
  milestones: [],
  routines: [],
  blocks: createInitialBlocks(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Liquid Fill Progress Component - Updated with rose color for today
const LiquidFillProgress = ({ percentage, color, label, count, total, darkMode, message }) => {
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
          {percentage}%
        </p>
        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {message || (total !== undefined ? `${count} / ${total} 完了` : '')}
        </p>
      </div>
    </div>
  );
};

// Draggable Item Component for reordering
const DraggableItem = ({ children, index, onDragStart, onDragOver, onDrop, darkMode }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart(index);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(index);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDrop(index);
      }}
      className={`flex items-center gap-2 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isDragOver ? 'border-t-2 border-violet-500' : ''}`}
    >
      <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
      }`}>
        <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
      </div>
      {children}
    </div>
  );
};

// Color Picker for routines
const ColorPicker = ({ color, onChange, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="w-4 h-4 rounded-full border-2 border-white/30 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute left-0 top-full mt-1 p-2 rounded-lg shadow-xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="grid grid-cols-5 gap-1">
              {ROUTINE_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setIsOpen(false); }}
                  className={`w-5 h-5 rounded-full ${color === c ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Block Add Menu Component
const BlockAddMenu = ({ onAdd, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseDown={(e) => e.stopPropagation()}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
        }`}
      >
        <Plus size={16} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute left-0 top-full mt-1 z-50 p-1.5 rounded-lg shadow-xl flex items-center gap-1 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.TEXT); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Type size={12} /> テキスト
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.HEADING); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <Type size={12} /> 見出し
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.TOGGLE); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <ChevronRight size={12} /> トグル
            </button>
            <button
              onClick={() => { onAdd(BLOCK_TYPES.CHECKBOX); setIsOpen(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs whitespace-nowrap transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
              }`}
            >
              <CheckSquare size={12} /> チェック
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// Recursive Block Component
const Block = ({ block, onChange, onDelete, onAddAfter, onAddBlockType, darkMode, depth = 0, focusId, setFocusId }) => {
  const [isOpen, setIsOpen] = useState(block.isOpen ?? true);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);
  const textareaRef = useRef(null);
  
  useEffect(() => {
    if (focusId === block.id) {
      if (inputRef.current) {
        inputRef.current.focus();
      } else if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setFocusId(null);
    }
  }, [focusId, block.id, setFocusId]);

  const adjustTextareaHeight = (textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.max(32, textarea.scrollHeight) + 'px';
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight(textareaRef.current);
    }
  }, [block.content]);
  
  const handleContentChange = (e) => {
    const value = e.target.value;
    
    if (value === '[] ' || value === '[]') {
      onChange({ ...block, type: BLOCK_TYPES.CHECKBOX, content: '', checked: false });
      return;
    }
    if (value === '> ') {
      onChange({ ...block, type: BLOCK_TYPES.TOGGLE, content: '', children: block.children || [] });
      return;
    }
    
    onChange({ ...block, content: value });
    
    if (e.target.tagName === 'TEXTAREA') {
      adjustTextareaHeight(e.target);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cursorPos = e.target.selectionStart;
      const content = block.content;
      const beforeCursor = content.slice(0, cursorPos);
      const afterCursor = content.slice(cursorPos);
      
      onChange({ ...block, content: beforeCursor });
      
      const newBlockId = generateId();
      const newBlock = {
        id: newBlockId,
        type: BLOCK_TYPES.TEXT,
        content: afterCursor,
        checked: false,
        isOpen: true,
        children: [],
      };
      onAddAfter(newBlock, newBlockId);
    }
  };
  
  const handleToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onChange({ ...block, isOpen: newIsOpen });
  };
  
  const handleCheckboxToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onChange({ ...block, checked: !block.checked });
  };

  const handleChildChange = (updatedChild) => {
    const newChildren = (block.children || []).map(c => c.id === updatedChild.id ? updatedChild : c);
    onChange({ ...block, children: newChildren });
  };

  const handleChildDelete = (childId) => {
    const newChildren = (block.children || []).filter(c => c.id !== childId);
    onChange({ ...block, children: newChildren });
  };

  const handleAddChildAfter = (afterId, newBlock, focusNewId) => {
    const children = block.children || [];
    const index = children.findIndex(c => c.id === afterId);
    const newChildren = [...children.slice(0, index + 1), newBlock, ...children.slice(index + 1)];
    onChange({ ...block, children: newChildren });
    if (focusNewId) setFocusId(focusNewId);
  };

  const addChildBlock = (type = BLOCK_TYPES.TEXT) => {
    const newBlockId = generateId();
    const newBlock = {
      id: newBlockId,
      type,
      content: '',
      checked: false,
      isOpen: true,
      children: [],
    };
    onChange({ ...block, children: [...(block.children || []), newBlock] });
    setFocusId(newBlockId);
  };

  const handleAddBlockType = (type) => {
    onAddBlockType(block.id, type);
  };

  const baseInputStyle = `w-full bg-transparent border-none outline-none resize-none ${
    darkMode ? 'text-white placeholder-gray-500' : 'text-gray-800 placeholder-gray-400'
  }`;

  switch (block.type) {
    case BLOCK_TYPES.HEADING:
      return (
        <div 
          className="group flex items-center gap-1 py-1"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`w-6 flex-shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <BlockAddMenu onAdd={handleAddBlockType} darkMode={darkMode} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="見出し"
            className={`${baseInputStyle} text-xl font-bold`}
          />
          <button 
            onClick={onDelete} 
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1 hover:bg-red-500/20 rounded transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      );
    
    case BLOCK_TYPES.TEXT:
      return (
        <div 
          className="group flex items-start gap-1 py-0.5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`w-6 flex-shrink-0 pt-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <BlockAddMenu onAdd={handleAddBlockType} darkMode={darkMode} />
          </div>
          <textarea
            ref={textareaRef}
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="テキストを入力"
            className={`${baseInputStyle} text-base leading-relaxed overflow-hidden`}
            style={{ minHeight: '32px', resize: 'none' }}
          />
          <button 
            onClick={onDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1 hover:bg-red-500/20 rounded mt-0.5 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      );
    
    case BLOCK_TYPES.TOGGLE:
      return (
        <div 
          className="py-0.5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="group flex items-center gap-1">
            <div className={`w-6 flex-shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <BlockAddMenu onAdd={handleAddBlockType} darkMode={darkMode} />
            </div>
            <button 
              onClick={handleToggle}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={block.content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="テキストを入力"
              className={`${baseInputStyle} font-medium`}
            />
            <button 
              onClick={onDelete}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-1 hover:bg-red-500/20 rounded transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            >
              <Trash2 size={14} className="text-red-400" />
            </button>
          </div>
          {isOpen && (
            <div className={`ml-7 mt-1 pl-4 border-l-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              {(block.children || []).map(child => (
                <Block
                  key={child.id}
                  block={child}
                  onChange={handleChildChange}
                  onDelete={() => handleChildDelete(child.id)}
                  onAddAfter={(newBlock, focusNewId) => handleAddChildAfter(child.id, newBlock, focusNewId)}
                  onAddBlockType={(afterId, type) => {
                    const newBlockId = generateId();
                    const newBlock = {
                      id: newBlockId,
                      type,
                      content: '',
                      checked: false,
                      isOpen: true,
                      children: [],
                    };
                    handleAddChildAfter(afterId, newBlock, newBlockId);
                  }}
                  darkMode={darkMode}
                  depth={depth + 1}
                  focusId={focusId}
                  setFocusId={setFocusId}
                />
              ))}
              <button
                onClick={() => addChildBlock()}
                onMouseDown={(e) => e.stopPropagation()}
                className={`flex items-center gap-1 mt-1 ml-1 px-2 py-1 rounded text-xs transition-colors ${
                  darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Plus size={12} /> ブロックを追加
              </button>
            </div>
          )}
        </div>
      );
    
    case BLOCK_TYPES.CHECKBOX:
      return (
        <div 
          className="group flex items-center gap-1 py-0.5"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className={`w-6 flex-shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <BlockAddMenu onAdd={handleAddBlockType} darkMode={darkMode} />
          </div>
          <button 
            onClick={handleCheckboxToggle}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            {block.checked ? (
              <CheckSquare size={18} className="text-emerald-400" />
            ) : (
              <Square size={18} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
            )}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={block.content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="テキストを入力"
            className={`${baseInputStyle} ${block.checked ? 'line-through opacity-60' : ''}`}
          />
          <button 
            onClick={onDelete}
            onMouseDown={(e) => e.stopPropagation()}
            className={`p-1 hover:bg-red-500/20 rounded transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <Trash2 size={14} className="text-red-400" />
          </button>
        </div>
      );
    
    default:
      return null;
  }
};

// Routine Weekly Table Component
const RoutineWeeklyTable = ({ routines, weekOffset, onToggleRoutine, onAddRoutine, onDeleteRoutine, onUpdateRoutineColor, onReorder, darkMode }) => {
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const weekDates = getWeekDates(weekOffset);
  const todayString = getTodayString();

  const handleAddRoutine = () => {
    if (newRoutineTitle.trim()) {
      onAddRoutine(newRoutineTitle.trim());
      setNewRoutineTitle('');
    }
  };

  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (index) => {
    // Visual feedback handled in component
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex !== null && dragIndex !== targetIndex) {
      onReorder(dragIndex, targetIndex);
    }
    setDragIndex(null);
  };

  return (
    <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? 'bg-gray-700/50' : 'bg-gray-200'}>
            <th className="w-8"></th>
            <th className={`py-2 px-3 text-left font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              タスク
            </th>
            {weekDates.map((date, idx) => {
              const isToday = date === todayString;
              return (
                <th 
                  key={date} 
                  className={`py-2 px-2 text-center font-medium w-10 ${
                    isToday 
                      ? 'bg-violet-500/20 text-violet-400' 
                      : darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  <div>{getDayLabel(idx)}</div>
                  <div className="text-xs opacity-60">{date.slice(8)}</div>
                </th>
              );
            })}
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {routines.map((routine, index) => (
            <tr 
              key={routine.id} 
              className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
              onDrop={() => handleDrop(index)}
            >
              <td className="py-2 px-1">
                <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}>
                  <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                </div>
              </td>
              <td className={`py-2 px-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2">
                  <ColorPicker
                    color={routine.color || '#8b5cf6'}
                    onChange={(color) => onUpdateRoutineColor(routine.id, color)}
                    darkMode={darkMode}
                  />
                  {routine.title}
                </div>
              </td>
              {weekDates.map((date, idx) => {
                const isChecked = routine.history?.[date] || false;
                const isToday = date === todayString;
                const isFuture = date > todayString;
                return (
                  <td 
                    key={date} 
                    className={`py-2 px-2 text-center ${isToday ? 'bg-violet-500/10' : ''}`}
                  >
                    {isFuture ? (
                      <span className="text-gray-500">-</span>
                    ) : (
                      <button
                        onClick={() => onToggleRoutine(routine.id, date)}
                        className={`w-6 h-6 rounded flex items-center justify-center transition-colors`}
                        style={{
                          backgroundColor: isChecked ? routine.color || '#8b5cf6' : (darkMode ? '#4b5563' : '#d1d5db'),
                        }}
                      >
                        {isChecked && <Check size={14} className="text-white" />}
                      </button>
                    )}
                  </td>
                );
              })}
              <td className="py-2 px-1">
                <button
                  onClick={() => onDeleteRoutine(routine.id)}
                  className="p-1 hover:bg-red-500/20 rounded opacity-50 hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </td>
            </tr>
          ))}
          <tr className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <td colSpan={10} className="py-2 px-3">
              <div className="flex items-center gap-2 ml-6">
                <input
                  type="text"
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRoutine()}
                  placeholder="新しいルーティンを追加..."
                  className={`flex-1 bg-transparent border-none outline-none text-sm ${
                    darkMode ? 'text-gray-300 placeholder-gray-500' : 'text-gray-700 placeholder-gray-400'
                  }`}
                />
                <button
                  onClick={handleAddRoutine}
                  disabled={!newRoutineTitle.trim()}
                  className={`p-1 rounded transition-colors ${
                    newRoutineTitle.trim()
                      ? 'hover:bg-violet-500/20 text-violet-400'
                      : 'text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Plus size={16} />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// Data Calendar Component
const DataCalendar = ({ routines, milestones, darkMode }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const todayString = getTodayString();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthDates = getMonthDates(year, month);
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  // Get milestone completion dates
  const milestoneDates = new Set(
    milestones
      .filter(m => m.completedAt)
      .map(m => new Date(m.completedAt).toISOString().split('T')[0])
  );

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {year}年 {monthNames[month]}
          </span>
          <button
            onClick={goToToday}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${
              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            今日
          </button>
        </div>
        <button
          onClick={goToNextMonth}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
          }`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['月', '火', '水', '木', '金', '土', '日'].map(day => (
          <div 
            key={day} 
            className={`text-center text-xs font-medium py-1 ${
              darkMode ? 'text-gray-500' : 'text-gray-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {monthDates.map(({ date, isCurrentMonth }, idx) => {
          const isToday = date === todayString;
          const hasMilestone = milestoneDates.has(date);
          const isFuture = date > todayString;
          
          // Get routine completions for this date
          const routineCompletions = routines.map(r => ({
            color: r.color || '#8b5cf6',
            completed: r.history?.[date] || false,
          })).filter(r => r.completed);

          return (
            <div
              key={idx}
              className={`relative aspect-square p-1 rounded-lg transition-colors ${
                !isCurrentMonth 
                  ? 'opacity-30' 
                  : isToday 
                    ? 'bg-violet-500/20 ring-2 ring-violet-500' 
                    : darkMode 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-200'
              }`}
            >
              <div className={`text-xs text-center ${
                isToday 
                  ? 'text-violet-400 font-bold' 
                  : darkMode 
                    ? 'text-gray-300' 
                    : 'text-gray-700'
              }`}>
                {parseInt(date.slice(8))}
              </div>
              
              {/* Routine dots */}
              {routineCompletions.length > 0 && !isFuture && (
                <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                  {routineCompletions.slice(0, 4).map((r, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                  ))}
                  {routineCompletions.length > 4 && (
                    <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      +{routineCompletions.length - 4}
                    </div>
                  )}
                </div>
              )}

              {/* Milestone star */}
              {hasMilestone && (
                <div className="absolute top-0 right-0">
                  <Star size={12} className="text-yellow-400 fill-yellow-400" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          凡例
        </div>
        <div className="flex flex-wrap gap-3">
          {routines.map(r => (
            <div key={r.id} className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: r.color || '#8b5cf6' }}
              />
              <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {r.title}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              マイルストーン達成
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page Editor Component
const PageEditor = ({ page, nodeImage, onUpdate, onClose, darkMode }) => {
  const [focusId, setFocusId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragMilestoneIndex, setDragMilestoneIndex] = useState(null);
  
  const tabs = [
    { id: 'overview', label: '概要', icon: FileText },
    { id: 'milestones', label: 'マイルストーン', icon: Target },
    { id: 'routines', label: 'ルーティン', icon: Calendar },
    { id: 'data', label: 'データ', icon: BarChart3 },
  ];

  const updateField = (field, value) => {
    onUpdate({ ...page, [field]: value, updatedAt: Date.now() });
  };

  // Milestone functions
  const addMilestone = (title) => {
    const newMilestone = {
      id: generateId(),
      title,
      completed: false,
      completedAt: null,
    };
    updateField('milestones', [...(page.milestones || []), newMilestone]);
  };

  const toggleMilestone = (id) => {
    const milestones = (page.milestones || []).map(m => {
      if (m.id === id) {
        return {
          ...m,
          completed: !m.completed,
          completedAt: !m.completed ? Date.now() : null,
        };
      }
      return m;
    });
    updateField('milestones', milestones);
  };

  const deleteMilestone = (id) => {
    updateField('milestones', (page.milestones || []).filter(m => m.id !== id));
  };

  const reorderMilestones = (fromIndex, toIndex) => {
    const milestones = [...(page.milestones || [])];
    const [moved] = milestones.splice(fromIndex, 1);
    milestones.splice(toIndex, 0, moved);
    updateField('milestones', milestones);
  };

  // Routine functions
  const addRoutine = (title) => {
    const newRoutine = {
      id: generateId(),
      title,
      color: getRandomColor(),
      history: {},
    };
    updateField('routines', [...(page.routines || []), newRoutine]);
  };

  const toggleRoutine = (routineId, date) => {
    const routines = (page.routines || []).map(r => {
      if (r.id === routineId) {
        const newHistory = { ...r.history };
        newHistory[date] = !newHistory[date];
        return { ...r, history: newHistory };
      }
      return r;
    });
    updateField('routines', routines);
  };

  const deleteRoutine = (id) => {
    updateField('routines', (page.routines || []).filter(r => r.id !== id));
  };

  const updateRoutineColor = (id, color) => {
    const routines = (page.routines || []).map(r => {
      if (r.id === id) {
        return { ...r, color };
      }
      return r;
    });
    updateField('routines', routines);
  };

  const reorderRoutines = (fromIndex, toIndex) => {
    const routines = [...(page.routines || [])];
    const [moved] = routines.splice(fromIndex, 1);
    routines.splice(toIndex, 0, moved);
    updateField('routines', routines);
  };

  // Calculate stats
  const completedMilestones = (page.milestones || []).filter(m => m.completed).length;
  const totalMilestones = (page.milestones || []).length;
  const milestoneProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const todayString = getTodayString();
  const todayRoutines = page.routines || [];
  const todayCompleted = todayRoutines.filter(r => r.history?.[todayString]).length;
  const todayTotal = todayRoutines.length;
  const todayProgress = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  const calculateRoutineRate = () => {
    const routines = page.routines || [];
    if (routines.length === 0) return 0;
    
    const last30Days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      last30Days.push(date.toISOString().split('T')[0]);
    }
    
    let totalChecks = 0;
    let possibleChecks = routines.length * 30;
    
    routines.forEach(r => {
      last30Days.forEach(date => {
        if (r.history?.[date]) totalChecks++;
      });
    });
    
    return Math.round((totalChecks / possibleChecks) * 100);
  };

  const routineRate = calculateRoutineRate();

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-black/80' : 'bg-white/80'} backdrop-blur-md`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-4xl h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col ${
          darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Image */}
        <div 
          className="bg-cover bg-center relative flex-shrink-0"
          style={{ 
            height: '27vh',
            backgroundImage: page.headerImage || nodeImage ? `url(${page.headerImage || nodeImage})` : undefined,
            backgroundColor: !page.headerImage && !nodeImage ? (darkMode ? '#374151' : '#e5e7eb') : undefined,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/30 hover:bg-black/50 rounded-lg transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          {!page.headerImage && !nodeImage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ImagePlus size={48} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <input
              type="text"
              value={page.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="目標のタイトル"
              className="w-full text-3xl font-bold bg-transparent border-none outline-none text-white placeholder-white/50 drop-shadow-lg"
            />
          </div>
        </div>

        {/* Meta Info */}
        <div className={`px-6 py-3 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={page.category || ''}
              onChange={(e) => updateField('category', e.target.value || null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 border-gray-600' 
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              } border outline-none`}
            >
              <option value="">カテゴリー未設定</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            <select
              value={page.targetDecade || ''}
              onChange={(e) => updateField('targetDecade', e.target.value || null)}
              className={`px-3 py-1.5 rounded-lg text-sm ${
                darkMode 
                  ? 'bg-gray-800 text-gray-300 border-gray-600' 
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              } border outline-none`}
            >
              <option value="">期限未設定</option>
              {DECADES.map(dec => (
                <option key={dec.id} value={dec.id}>{dec.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? darkMode 
                    ? 'text-violet-400 border-b-2 border-violet-400' 
                    : 'text-violet-600 border-b-2 border-violet-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    概要・メモ
                  </label>
                  <textarea
                    value={page.description || ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="この目標について自由に記述..."
                    rows={4}
                    className={`w-full px-4 py-3 rounded-lg resize-none ${
                      darkMode 
                        ? 'bg-gray-800 text-gray-200 placeholder-gray-500 border-gray-600' 
                        : 'bg-gray-100 text-gray-700 placeholder-gray-400 border-gray-200'
                    } border outline-none focus:ring-2 focus:ring-violet-500/50`}
                  />
                </div>

                {/* Stats with Liquid Fill */}
                <div className="grid grid-cols-3 gap-4">
                  <LiquidFillProgress
                    percentage={milestoneProgress}
                    color="violet"
                    label="マイルストーン進捗"
                    darkMode={darkMode}
                    message={getEncouragementMessage(milestoneProgress, 'milestone')}
                  />
                  <LiquidFillProgress
                    percentage={todayProgress}
                    color="rose"
                    label="今日のルーティン"
                    darkMode={darkMode}
                    message={getEncouragementMessage(todayProgress, 'today')}
                  />
                  <LiquidFillProgress
                    percentage={routineRate}
                    color="emerald"
                    label="継続率 (30日)"
                    darkMode={darkMode}
                    message={getEncouragementMessage(routineRate, 'streak')}
                  />
                </div>
              </div>
            )}

            {/* Milestones Tab */}
            {activeTab === 'milestones' && (
              <div className="space-y-3">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  目標達成までの中長期的なステップを管理します。ドラッグで並び替え可能です。
                </p>
                
                {(page.milestones || []).map((milestone, idx) => (
                  <div 
                    key={milestone.id}
                    draggable
                    onDragStart={() => setDragMilestoneIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragMilestoneIndex !== null && dragMilestoneIndex !== idx) {
                        reorderMilestones(dragMilestoneIndex, idx);
                      }
                      setDragMilestoneIndex(null);
                    }}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      darkMode ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-100 hover:bg-gray-150'
                    } group ${dragMilestoneIndex === idx ? 'opacity-50' : ''}`}
                  >
                    <div className={`cursor-grab active:cursor-grabbing p-1 rounded ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}>
                      <GripVertical size={14} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                    </div>
                    <button
                      onClick={() => toggleMilestone(milestone.id)}
                      className="flex-shrink-0"
                    >
                      {milestone.completed ? (
                        <CheckSquare size={20} className="text-emerald-400" />
                      ) : (
                        <Square size={20} className={darkMode ? 'text-gray-500' : 'text-gray-400'} />
                      )}
                    </button>
                    <span className={`flex-1 ${
                      milestone.completed 
                        ? 'line-through opacity-60' 
                        : darkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      {milestone.title}
                    </span>
                    {milestone.completedAt && (
                      <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {new Date(milestone.completedAt).toLocaleDateString('ja-JP')}
                      </span>
                    )}
                    <button
                      onClick={() => deleteMilestone(milestone.id)}
                      className="p-1 hover:bg-red-500/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                ))}

                <MilestoneInput onAdd={addMilestone} darkMode={darkMode} />
              </div>
            )}

            {/* Routines Tab */}
            {activeTab === 'routines' && (
              <div className="space-y-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  日々の習慣を管理します。色をクリックして変更、ドラッグで並び替えできます。
                </p>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setWeekOffset(weekOffset - 1)}
                    className={`p-2 rounded-lg transition-colors ${
                      darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setWeekOffset(0)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      weekOffset === 0
                        ? 'bg-violet-500/20 text-violet-400'
                        : darkMode ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    今週
                  </button>
                  <button
                    onClick={() => setWeekOffset(weekOffset + 1)}
                    disabled={weekOffset >= 0}
                    className={`p-2 rounded-lg transition-colors ${
                      weekOffset >= 0
                        ? 'opacity-30 cursor-not-allowed'
                        : darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                <RoutineWeeklyTable
                  routines={page.routines || []}
                  weekOffset={weekOffset}
                  onToggleRoutine={toggleRoutine}
                  onAddRoutine={addRoutine}
                  onDeleteRoutine={deleteRoutine}
                  onUpdateRoutineColor={updateRoutineColor}
                  onReorder={reorderRoutines}
                  darkMode={darkMode}
                />
              </div>
            )}

            {/* Data Tab - Calendar View */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <DataCalendar
                  routines={page.routines || []}
                  milestones={page.milestones || []}
                  darkMode={darkMode}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Milestone Input Component
const MilestoneInput = ({ onAdd, darkMode }) => {
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
        placeholder="新しいマイルストーンを追加..."
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

// Hover Preview Component
const HoverPreview = ({ node, page, onToggleRoutine, darkMode, fontSize, textColor }) => {
  const todayString = getTodayString();
  const fontConfig = HOVER_FONT_CONFIG[fontSize] || HOVER_FONT_CONFIG[HOVER_FONT_SIZES.MEDIUM];
  const color = textColor === HOVER_TEXT_COLORS.BLACK ? '#000000' : '#ffffff';
  const mutedColor = textColor === HOVER_TEXT_COLORS.BLACK ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';
  
  const todayRoutines = (page.routines || []).map(r => ({
    ...r,
    todayChecked: r.history?.[todayString] || false,
  }));

  const allMilestones = page.milestones || [];

  return (
    <div className="absolute inset-0 z-20 overflow-hidden rounded-lg">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${node.src})`,
          filter: 'blur(8px) brightness(0.4)',
          transform: 'scale(1.1)',
        }}
      />
      
      <div className="absolute inset-0 p-4 overflow-y-auto">
        <h3 
          className="font-bold mb-3 drop-shadow-lg"
          style={{ fontSize: `${fontConfig.title}px`, color }}
        >
          {page.title || '無題'}
        </h3>
        
        {todayRoutines.length > 0 && (
          <div className="mb-3">
            <p 
              className="mb-2"
              style={{ fontSize: `${fontConfig.label}px`, color: mutedColor }}
            >
              今日のルーティン
            </p>
            <div className="space-y-1">
              {todayRoutines.map(routine => (
                <button
                  key={routine.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleRoutine(node.id, routine.id, todayString);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 hover:bg-white/10 rounded px-1 py-0.5 transition-colors w-full text-left"
                >
                  {routine.todayChecked ? (
                    <CheckSquare style={{ width: fontConfig.icon, height: fontConfig.icon }} className="text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Square style={{ width: fontConfig.icon, height: fontConfig.icon, color: mutedColor }} className="flex-shrink-0" />
                  )}
                  <span 
                    style={{ 
                      fontSize: `${fontConfig.text}px`, 
                      color: routine.todayChecked ? mutedColor : color,
                      textDecoration: routine.todayChecked ? 'line-through' : 'none'
                    }}
                  >
                    {routine.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {allMilestones.length > 0 && (
          <div>
            <p 
              className="mb-2"
              style={{ fontSize: `${fontConfig.label}px`, color: mutedColor }}
            >
              マイルストーン
            </p>
            <div className="space-y-1">
              {allMilestones.map(milestone => (
                <div 
                  key={milestone.id} 
                  className={`flex items-center gap-2 px-1 py-0.5 ${
                    milestone.completed ? 'opacity-50' : ''
                  }`}
                >
                  {milestone.completed ? (
                    <div 
                      className="flex-shrink-0 rounded-full bg-emerald-500/30 flex items-center justify-center"
                      style={{ width: fontConfig.icon, height: fontConfig.icon }}
                    >
                      <Check style={{ width: fontConfig.icon - 4, height: fontConfig.icon - 4 }} className="text-emerald-400" />
                    </div>
                  ) : (
                    <Target style={{ width: fontConfig.icon, height: fontConfig.icon }} className="text-violet-400 flex-shrink-0" />
                  )}
                  <span 
                    style={{ 
                      fontSize: `${fontConfig.text}px`, 
                      color: milestone.completed ? mutedColor : color,
                      textDecoration: milestone.completed ? 'line-through' : 'none'
                    }}
                  >
                    {milestone.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayRoutines.length === 0 && allMilestones.length === 0 && (
          <p style={{ fontSize: `${fontConfig.text}px`, color: mutedColor }}>
            ダブルクリックで編集
          </p>
        )}
      </div>
    </div>
  );
};

// Font Size and Color Selector Component
const FontSizeSelector = ({ currentSize, currentColor, onSizeChange, onColorChange, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const sizes = [
    { id: HOVER_FONT_SIZES.SMALL, label: '小' },
    { id: HOVER_FONT_SIZES.MEDIUM, label: '中' },
    { id: HOVER_FONT_SIZES.LARGE, label: '大' },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 bg-blue-500/80 hover:bg-blue-600 rounded-full transition-colors flex items-center justify-center"
        title="文字サイズ・色を変更"
      >
        <span className="text-white font-bold text-xs flex items-baseline">
          <span style={{ fontSize: '8px' }}>A</span>
          <span style={{ fontSize: '12px' }}>A</span>
        </span>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full right-0 mt-2 p-3 rounded-xl shadow-2xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="space-y-3">
              {/* Size options */}
              <div>
                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  文字サイズ
                </p>
                <div className="flex gap-1">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSizeChange(size.id);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        currentSize === size.id
                          ? 'bg-blue-500/20 text-blue-400'
                          : darkMode
                            ? 'hover:bg-gray-700 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Color options */}
              <div>
                <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  文字色
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(HOVER_TEXT_COLORS.WHITE);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 bg-white ${
                      currentColor === HOVER_TEXT_COLORS.WHITE 
                        ? 'border-blue-500' 
                        : 'border-gray-300'
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onColorChange(HOVER_TEXT_COLORS.BLACK);
                    }}
                    className={`w-8 h-8 rounded-lg border-2 bg-gray-900 ${
                      currentColor === HOVER_TEXT_COLORS.BLACK 
                        ? 'border-blue-500' 
                        : 'border-gray-600'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Text Styling Toolbar
const TextToolbar = ({ node, onUpdate, darkMode }) => {
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const colorOptions = darkMode ? COLOR_OPTIONS_DARK : COLOR_OPTIONS_LIGHT;

  return (
    <div 
      className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-lg shadow-xl z-50 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <button
          onClick={() => { setShowFonts(!showFonts); setShowSizes(false); setShowColors(false); }}
          className={`px-2 py-1 rounded text-xs ${
            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          フォント
        </button>
        {showFonts && (
          <div className={`absolute top-full left-0 mt-1 p-1 rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {FONT_OPTIONS.map(font => (
              <button
                key={font.value}
                onClick={() => { onUpdate({ ...node, fontFamily: font.value }); setShowFonts(false); }}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs whitespace-nowrap ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                }`}
                style={{ fontFamily: font.value }}
              >
                {font.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowSizes(!showSizes); setShowFonts(false); setShowColors(false); }}
          className={`px-2 py-1 rounded text-xs ${
            darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          {node.fontSize || 16}px
        </button>
        {showSizes && (
          <div className={`absolute top-full left-0 mt-1 p-1 rounded-lg shadow-xl max-h-40 overflow-y-auto ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            {SIZE_OPTIONS.map(size => (
              <button
                key={size}
                onClick={() => { onUpdate({ ...node, fontSize: size }); setShowSizes(false); }}
                className={`block w-full text-left px-3 py-1 rounded text-xs ${
                  darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
                } ${node.fontSize === size ? 'bg-violet-500/20' : ''}`}
              >
                {size}px
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => { setShowColors(!showColors); setShowFonts(false); setShowSizes(false); }}
          className={`w-6 h-6 rounded border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
          style={{ backgroundColor: node.color || (darkMode ? '#ffffff' : '#000000') }}
        />
        {showColors && (
          <div className={`absolute top-full right-0 mt-1 p-2 rounded-lg shadow-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="grid grid-cols-5 gap-1">
              {colorOptions.map(color => (
                <button
                  key={color}
                  onClick={() => { onUpdate({ ...node, color }); setShowColors(false); }}
                  className={`w-6 h-6 rounded border-2 ${
                    node.color === color ? 'border-violet-500' : darkMode ? 'border-gray-600' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onUpdate(null)}
        className="p-1.5 hover:bg-red-500/20 rounded"
      >
        <Trash2 size={14} className="text-red-400" />
      </button>
    </div>
  );
};

// Draggable Text Node Component
const DraggableTextNode = ({ node, onUpdate, onDelete, darkMode, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(node.isNew || false);
  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const nodeRef = useRef(null);
  const textareaRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const clickTimer = useRef(null);
  const clickCount = useRef(0);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (node.isNew) {
      onUpdate({ ...node, isNew: false });
    }
  }, []);

  useEffect(() => {
    let timer;
    if (isHovered && !isDragging && !isEditing) {
      timer = setTimeout(() => setShowToolbar(true), 100);
    } else if (!isHovered) {
      timer = setTimeout(() => setShowToolbar(false), 200);
    }
    return () => clearTimeout(timer);
  }, [isHovered, isDragging, isEditing]);

  const handleMouseDown = (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    if (e.target.closest('.toolbar')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    clickCount.current++;
    
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        if (clickCount.current === 1) {
          onSelect(node.id);
          setIsDragging(true);
          startPos.current = { x: e.clientX - node.x, y: e.clientY - node.y };
        }
        clickCount.current = 0;
      }, 200);
    } else if (clickCount.current === 2) {
      clearTimeout(clickTimer.current);
      clickCount.current = 0;
      setIsEditing(true);
    }
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: node.width, height: node.height };
  };

  const handleTextChange = (e) => {
    onUpdate({ ...node, content: e.target.value });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (!node.content) {
      onDelete(node.id);
    }
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (!node.content) {
        onDelete(node.id);
      }
    }
  };

  const handleToolbarUpdate = (updated) => {
    if (updated === null) {
      onDelete(node.id);
    } else {
      onUpdate(updated);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        let newX = e.clientX - startPos.current.x;
        let newY = e.clientY - startPos.current.y;
        
        newX = Math.max(0, Math.min(newX, BOARD_WIDTH - node.width));
        newY = Math.max(0, Math.min(newY, BOARD_HEIGHT - node.height));
        
        onUpdate({ ...node, x: newX, y: newY });
      }
      if (isResizing) {
        const deltaX = e.clientX - startPos.current.x;
        const deltaY = e.clientY - startPos.current.y;
        let newWidth = Math.max(50, startSize.current.width + deltaX);
        let newHeight = Math.max(30, startSize.current.height + deltaY);
        
        newWidth = Math.min(newWidth, BOARD_WIDTH - node.x);
        newHeight = Math.min(newHeight, BOARD_HEIGHT - node.y);
        
        onUpdate({ ...node, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, node, onUpdate]);

  return (
    <div
      ref={nodeRef}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex: isSelected || isEditing || showToolbar ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showToolbar && !isDragging && !isEditing && (
        <div 
          className="toolbar absolute -top-12 left-0 right-0 h-14"
          onMouseEnter={() => setIsHovered(true)}
        >
          <TextToolbar node={node} onUpdate={handleToolbarUpdate} darkMode={darkMode} />
        </div>
      )}

      {isSelected && !isEditing && (
        <div className="absolute -inset-1 border-2 border-blue-500 rounded pointer-events-none" />
      )}

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={node.content || ''}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
          className="w-full h-full resize-none outline-none bg-transparent"
          style={{
            fontFamily: node.fontFamily || "'Noto Sans JP', sans-serif",
            fontSize: `${node.fontSize || 16}px`,
            color: node.color || (darkMode ? '#ffffff' : '#000000'),
          }}
          placeholder="テキストを入力..."
        />
      ) : (
        <div 
          className="w-full h-full overflow-hidden whitespace-pre-wrap break-words"
          style={{
            fontFamily: node.fontFamily || "'Noto Sans JP', sans-serif",
            fontSize: `${node.fontSize || 16}px`,
            color: node.color || (darkMode ? '#ffffff' : '#000000'),
          }}
        >
          {node.content || (
            <span className="opacity-50">ダブルクリックで編集</span>
          )}
        </div>
      )}

      {(isHovered || showToolbar) && !isEditing && (
        <div
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg viewBox="0 0 16 16" className={`w-full h-full ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <path d="M14 14H10M14 14V10M14 14L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      )}
    </div>
  );
};

// Shape Selector Component
const ShapeSelector = ({ currentShape, onShapeChange, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const shapes = [
    { id: IMAGE_SHAPES.FREE, label: '自由' },
    { id: IMAGE_SHAPES.SQUARE, label: '正方形' },
    { id: IMAGE_SHAPES.LANDSCAPE, label: '横長 16:9' },
    { id: IMAGE_SHAPES.PORTRAIT, label: '縦長 3:4' },
  ];

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        className="p-1.5 bg-violet-500/80 hover:bg-violet-600 rounded-full transition-colors"
        title="形状を変更"
      >
        <Square size={14} className="text-white" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className={`absolute top-full right-0 mt-2 p-2 rounded-xl shadow-2xl z-50 ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex flex-col gap-1 min-w-[120px]">
              {shapes.map(shape => (
                <button
                  key={shape.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShapeChange(shape.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-colors ${
                    currentShape === shape.id
                      ? 'bg-violet-500/20 text-violet-400'
                      : darkMode
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <Square size={14} />
                  {shape.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Draggable Image Node Component
const DraggableImageNode = ({ node, onUpdate, onDelete, onOpenEditor, pages, onToggleRoutine, darkMode, isSelected, onSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showPlaceHint, setShowPlaceHint] = useState(false);
  const nodeRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startNodePos = useRef({ x: 0, y: 0 });
  const clickTimer = useRef(null);
  const clickCount = useRef(0);

  const page = pages[node.id] || createInitialPage();
  const shape = node.shape || IMAGE_SHAPES.FREE;
  const hoverFontSize = node.hoverFontSize || HOVER_FONT_SIZES.MEDIUM;
  const hoverTextColor = node.hoverTextColor || HOVER_TEXT_COLORS.WHITE;

  const getAspectRatioForShape = (shape) => {
    switch (shape) {
      case IMAGE_SHAPES.SQUARE:
        return 1;
      case IMAGE_SHAPES.LANDSCAPE:
        return 16 / 9;
      case IMAGE_SHAPES.PORTRAIT:
        return 3 / 4;
      default:
        return null;
    }
  };

  const handleShapeChange = (newShape) => {
    const aspectRatio = getAspectRatioForShape(newShape);
    let newWidth = node.width;
    let newHeight = node.height;
    
    if (aspectRatio) {
      if (node.width > node.height * aspectRatio) {
        newHeight = node.width / aspectRatio;
      } else {
        newWidth = node.height * aspectRatio;
      }
    }
    
    onUpdate({ ...node, shape: newShape, width: newWidth, height: newHeight });
  };

  const handleFontSizeChange = (newSize) => {
    onUpdate({ ...node, hoverFontSize: newSize });
  };

  const handleTextColorChange = (newColor) => {
    onUpdate({ ...node, hoverTextColor: newColor });
  };

  const handleMouseDown = (e) => {
    if (e.target.classList.contains('resize-handle')) return;
    if (e.target.closest('button')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    clickCount.current++;
    
    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        if (clickCount.current === 1) {
          onSelect(node.id);
          setIsDragging(true);
          setShowPlaceHint(true);
          startPos.current = { x: e.clientX - node.x, y: e.clientY - node.y };
        }
        clickCount.current = 0;
      }, 200);
    } else if (clickCount.current === 2) {
      clearTimeout(clickTimer.current);
      clickCount.current = 0;
      onOpenEditor(node.id);
    }
  };

  const handleResizeStart = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: node.width, height: node.height };
    startNodePos.current = { x: node.x, y: node.y };
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        let newX = e.clientX - startPos.current.x;
        let newY = e.clientY - startPos.current.y;
        
        newX = Math.max(0, Math.min(newX, BOARD_WIDTH - node.width));
        newY = Math.max(0, Math.min(newY, BOARD_HEIGHT - node.height));
        
        onUpdate({ ...node, x: newX, y: newY });
      }
      if (isResizing && resizeDirection) {
        const deltaX = e.clientX - startPos.current.x;
        const deltaY = e.clientY - startPos.current.y;
        const aspectRatio = getAspectRatioForShape(shape);
        
        let newWidth = startSize.current.width;
        let newHeight = startSize.current.height;
        let newX = startNodePos.current.x;
        let newY = startNodePos.current.y;

        const dir = resizeDirection;
        
        if (dir.includes('e')) {
          newWidth = Math.max(100, startSize.current.width + deltaX);
        }
        if (dir.includes('w')) {
          const widthDelta = -deltaX;
          newWidth = Math.max(100, startSize.current.width + widthDelta);
          if (newWidth !== startSize.current.width + widthDelta) {
            newX = startNodePos.current.x + (startSize.current.width - 100);
          } else {
            newX = startNodePos.current.x - widthDelta;
          }
        }
        
        if (dir.includes('s')) {
          newHeight = Math.max(60, startSize.current.height + deltaY);
        }
        if (dir.includes('n')) {
          const heightDelta = -deltaY;
          newHeight = Math.max(60, startSize.current.height + heightDelta);
          if (newHeight !== startSize.current.height + heightDelta) {
            newY = startNodePos.current.y + (startSize.current.height - 60);
          } else {
            newY = startNodePos.current.y - heightDelta;
          }
        }

        if (aspectRatio) {
          if (dir.includes('e') || dir.includes('w')) {
            newHeight = newWidth / aspectRatio;
          } else if (dir.includes('n') || dir.includes('s')) {
            newWidth = newHeight * aspectRatio;
          }
          
          if ((dir.includes('n') || dir.includes('s')) && (dir.includes('e') || dir.includes('w'))) {
            const widthBasedHeight = newWidth / aspectRatio;
            const heightBasedWidth = newHeight * aspectRatio;
            
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newHeight = widthBasedHeight;
            } else {
              newWidth = heightBasedWidth;
            }
          }
        }

        newWidth = Math.min(newWidth, BOARD_WIDTH - newX);
        newHeight = Math.min(newHeight, BOARD_HEIGHT - newY);
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        
        onUpdate({ ...node, x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection(null);
      setShowPlaceHint(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeDirection, node, shape, onUpdate]);

  const resizeHandles = [
    { position: 'n', cursor: 'ns-resize', style: { top: -4, left: '50%', transform: 'translateX(-50%)', width: 40, height: 8 } },
    { position: 's', cursor: 'ns-resize', style: { bottom: -4, left: '50%', transform: 'translateX(-50%)', width: 40, height: 8 } },
    { position: 'e', cursor: 'ew-resize', style: { right: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 40 } },
    { position: 'w', cursor: 'ew-resize', style: { left: -4, top: '50%', transform: 'translateY(-50%)', width: 8, height: 40 } },
    { position: 'ne', cursor: 'nesw-resize', style: { top: -4, right: -4, width: 12, height: 12 } },
    { position: 'nw', cursor: 'nwse-resize', style: { top: -4, left: -4, width: 12, height: 12 } },
    { position: 'se', cursor: 'nwse-resize', style: { bottom: -4, right: -4, width: 12, height: 12 } },
    { position: 'sw', cursor: 'nesw-resize', style: { bottom: -4, left: -4, width: 12, height: 12 } },
  ];

  return (
    <div
      ref={nodeRef}
      className={`absolute group transition-shadow duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      } ${isDragging ? 'opacity-90 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative w-full h-full overflow-hidden shadow-xl rounded-lg">
        <img
          src={node.src}
          alt="Vision"
          className="w-full h-full object-cover rounded-lg"
          draggable={false}
        />
        
        {showPlaceHint && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-40 rounded-lg">
            <span className="text-white text-sm font-medium px-3 py-1.5 bg-black/70 rounded-lg">
              長押しで配置
            </span>
          </div>
        )}
        
        {isHovered && !isDragging && !isResizing && !showPlaceHint && (
          <HoverPreview 
            node={node} 
            page={page} 
            onToggleRoutine={onToggleRoutine}
            darkMode={darkMode}
            fontSize={hoverFontSize}
            textColor={hoverTextColor}
          />
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-30">
          <FontSizeSelector
            currentSize={hoverFontSize}
            currentColor={hoverTextColor}
            onSizeChange={handleFontSizeChange}
            onColorChange={handleTextColorChange}
            darkMode={darkMode}
          />
          <ShapeSelector
            currentShape={shape}
            onShapeChange={handleShapeChange}
            darkMode={darkMode}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-full transition-colors"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      </div>

      {(isHovered || isSelected) && !isDragging && (
        <>
          {resizeHandles.map(handle => (
            <div
              key={handle.position}
              className={`resize-handle absolute opacity-0 group-hover:opacity-100 transition-opacity z-30 ${
                handle.position.length === 1 ? 'hover:bg-blue-500/30' : ''
              }`}
              style={{
                ...handle.style,
                cursor: handle.cursor,
              }}
              onMouseDown={(e) => handleResizeStart(e, handle.position)}
            >
              {handle.position.length === 2 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-md" />
                </div>
              )}
              {handle.position.length === 1 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className={`bg-blue-500/50 rounded-full ${
                      handle.position === 'n' || handle.position === 's' 
                        ? 'w-8 h-1' 
                        : 'w-1 h-8'
                    }`} 
                  />
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

// Zoom Control Component
const ZoomControl = ({ zoom, onZoomChange, onFullscreen, onExportWallpaper, darkMode }) => {
  const minZoom = 25;
  const maxZoom = 200;
  
  const handleSliderChange = (e) => {
    onZoomChange(parseInt(e.target.value));
  };

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-xl z-30 ${
      darkMode ? 'bg-gray-800/90 text-gray-300' : 'bg-white/90 text-gray-700'
    } backdrop-blur-sm shadow-lg`}>
      <button
        onClick={onExportWallpaper}
        className={`p-1.5 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
        title="壁紙として出力"
      >
        <Download size={16} />
      </button>

      <button
        onClick={onFullscreen}
        className={`p-1.5 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
        title="フルスクリーン表示"
      >
        <Maximize size={16} />
      </button>

      <div className={`w-px h-5 ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

      <button
        onClick={() => onZoomChange(Math.max(minZoom, zoom - 25))}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
      >
        <ZoomOut size={16} />
      </button>
      
      <input
        type="range"
        min={minZoom}
        max={maxZoom}
        value={zoom}
        onChange={handleSliderChange}
        className="w-20 h-1 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
      />
      
      <button
        onClick={() => onZoomChange(Math.min(maxZoom, zoom + 25))}
        className={`p-1 rounded transition-colors ${
          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
        }`}
      >
        <ZoomIn size={16} />
      </button>
      
      <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
    </div>
  );
};

// Fullscreen/Ambient Mode Component
const AmbientMode = ({ nodes, darkMode, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const imageNodes = nodes.filter(n => n.type === NODE_TYPES.IMAGE);

  useEffect(() => {
    if (imageNodes.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % imageNodes.length);
    }, 8000);

    return () => clearInterval(interval);
  }, [imageNodes.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
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

// Wallpaper Export Modal
const WallpaperExportModal = ({ nodes, darkMode, onClose }) => {
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
    const canvas = document.createElement('canvas');
    canvas.width = res.width;
    canvas.height = res.height;
    const ctx = canvas.getContext('2d');

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

// Main Vision Board Component
export default function VisionBoard() {
  const [darkMode, setDarkMode] = useState(true);
  const [nodes, setNodes] = useState([]);
  const [pages, setPages] = useState({});
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingPageId, setEditingPageId] = useState(null);
  const [showHint, setShowHint] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showAmbientMode, setShowAmbientMode] = useState(false);
  const [showWallpaperExport, setShowWallpaperExport] = useState(false);
  const boardRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const initialScrollDone = useRef(false);

  // Scroll to center on initial load
  useEffect(() => {
    if (containerRef.current && !initialScrollDone.current) {
      const container = containerRef.current;
      const scrollX = (BOARD_WIDTH - container.clientWidth) / 2;
      const scrollY = (BOARD_HEIGHT - container.clientHeight) / 2;
      container.scrollLeft = scrollX;
      container.scrollTop = scrollY;
      initialScrollDone.current = true;
    }
  }, []);

  useEffect(() => {
    setNodes(prevNodes => prevNodes.map(node => {
      if (node.type === NODE_TYPES.TEXT) {
        if (node.color === '#ffffff' && !darkMode) {
          return { ...node, color: '#000000' };
        } else if (node.color === '#000000' && darkMode) {
          return { ...node, color: '#ffffff' };
        }
      }
      return node;
    }));
  }, [darkMode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e) => {
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: container.scrollLeft,
          scrollTop: container.scrollTop,
        };
        container.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e) => {
      if (!isPanning) return;
      e.preventDefault();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      container.scrollLeft = panStart.current.scrollLeft - dx;
      container.scrollTop = panStart.current.scrollTop - dy;
    };

    const handleMouseUp = (e) => {
      if (e.button === 1 || isPanning) {
        setIsPanning(false);
        container.style.cursor = 'default';
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning]);

  const addImageNode = (src) => {
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    const containerWidth = container?.clientWidth || 800;
    const containerHeight = container?.clientHeight || 600;
    
    // Place new images near the center of the visible area
    const centerX = scrollLeft + containerWidth / 2;
    const centerY = scrollTop + containerHeight / 2;
    
    const newNode = {
      id: generateId(),
      type: NODE_TYPES.IMAGE,
      src,
      x: (centerX - 125 + (Math.random() - 0.5) * 200) / (zoom / 100),
      y: (centerY - 90 + (Math.random() - 0.5) * 200) / (zoom / 100),
      width: 250,
      height: 180,
      shape: IMAGE_SHAPES.FREE,
      hoverFontSize: HOVER_FONT_SIZES.MEDIUM,
      hoverTextColor: HOVER_TEXT_COLORS.WHITE,
    };
    setNodes([...nodes, newNode]);
    setPages({
      ...pages,
      [newNode.id]: createInitialPage(),
    });
  };

  const addTextNode = (x, y) => {
    const newNode = {
      id: generateId(),
      type: NODE_TYPES.TEXT,
      content: '',
      x: x / (zoom / 100),
      y: y / (zoom / 100),
      width: 200,
      height: 40,
      fontSize: 16,
      color: darkMode ? '#ffffff' : '#000000',
      fontFamily: "'Noto Sans JP', sans-serif",
      isNew: true,
    };
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addImageNode(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateNode = (updatedNode) => {
    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
  };

  const deleteNode = (nodeId) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    const newPages = { ...pages };
    delete newPages[nodeId];
    setPages(newPages);
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  const updatePage = (pageData) => {
    setPages({
      ...pages,
      [editingPageId]: pageData,
    });
  };

  const handleToggleRoutine = (nodeId, routineId, date) => {
    const page = pages[nodeId];
    if (!page) return;

    const routines = (page.routines || []).map(r => {
      if (r.id === routineId) {
        const newHistory = { ...r.history };
        newHistory[date] = !newHistory[date];
        return { ...r, history: newHistory };
      }
      return r;
    });

    setPages({
      ...pages,
      [nodeId]: { ...page, routines, updatedAt: Date.now() },
    });
  };

  const handleBoardDoubleClick = (e) => {
    if (e.target === boardRef.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      addTextNode(x, y);
    }
  };

  const handleBoardClick = (e) => {
    if (e.target === boardRef.current) {
      setSelectedNode(null);
    }
  };

  const handleZoomChange = (newZoom) => {
    const container = containerRef.current;
    if (!container) {
      setZoom(newZoom);
      return;
    }

    // Calculate center point before zoom
    const centerX = container.scrollLeft + container.clientWidth / 2;
    const centerY = container.scrollTop + container.clientHeight / 2;
    
    // Calculate the board position at center
    const boardCenterX = centerX / (zoom / 100);
    const boardCenterY = centerY / (zoom / 100);
    
    // Apply new zoom
    setZoom(newZoom);
    
    // Adjust scroll to keep the same board position at center
    requestAnimationFrame(() => {
      const newCenterX = boardCenterX * (newZoom / 100);
      const newCenterY = boardCenterY * (newZoom / 100);
      container.scrollLeft = newCenterX - container.clientWidth / 2;
      container.scrollTop = newCenterY - container.clientHeight / 2;
    });
  };

  const editingPage = editingPageId ? pages[editingPageId] : null;
  const editingNode = editingPageId ? nodes.find(n => n.id === editingPageId) : null;

  return (
    <div 
      className={`h-screen flex flex-col transition-colors duration-300 ${
        darkMode ? 'bg-gray-950' : 'bg-gray-50'
      }`}
      style={{ fontFamily: "'Noto Sans JP', 'SF Pro Display', -apple-system, sans-serif" }}
    >
      {/* Toolbar */}
      <div className={`flex-shrink-0 ${
        darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'
      } border-b backdrop-blur-xl z-40`}>
        <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                Vision Board
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group">
              <button
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <ImagePlus size={16} />
                サンプル画像
              </button>
              <div className={`absolute top-full right-0 mt-2 p-2 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}>
                <div className="grid grid-cols-2 gap-2">
                  {SAMPLE_IMAGES.map((src, idx) => (
                    <button
                      key={idx}
                      onClick={() => addImageNode(src)}
                      className="w-20 h-16 rounded-lg overflow-hidden hover:ring-2 hover:ring-violet-500 transition-all"
                    >
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
            >
              <Plus size={16} />
              画像を追加
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl transition-all ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Board Container */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-auto relative ${isPanning ? 'cursor-grabbing' : ''}`}
      >
        <div
          ref={boardRef}
          className={`relative ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
          style={{ 
            width: BOARD_WIDTH * (zoom / 100), 
            height: BOARD_HEIGHT * (zoom / 100),
            backgroundImage: darkMode 
              ? 'radial-gradient(circle, #374151 1px, transparent 1px)' 
              : 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: `${24 * (zoom / 100)}px ${24 * (zoom / 100)}px`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
          }}
          onClick={handleBoardClick}
          onDoubleClick={handleBoardDoubleClick}
        >
          {nodes.map(node => (
            node.type === NODE_TYPES.IMAGE ? (
              <DraggableImageNode
                key={node.id}
                node={node}
                onUpdate={updateNode}
                onDelete={deleteNode}
                onOpenEditor={(id) => setEditingPageId(id)}
                pages={pages}
                onToggleRoutine={handleToggleRoutine}
                darkMode={darkMode}
                isSelected={selectedNode === node.id}
                onSelect={setSelectedNode}
              />
            ) : (
              <DraggableTextNode
                key={node.id}
                node={node}
                onUpdate={updateNode}
                onDelete={deleteNode}
                darkMode={darkMode}
                isSelected={selectedNode === node.id}
                onSelect={setSelectedNode}
              />
            )
          ))}
          
          <div className={`absolute inset-0 pointer-events-none border-2 border-dashed ${
            darkMode ? 'border-gray-800' : 'border-gray-300'
          } rounded-lg`} style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }} />
        </div>

        {nodes.length === 0 && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ top: '64px' }}>
            <div className={`text-center pointer-events-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center ${
                darkMode ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                <ImagePlus size={40} className={darkMode ? 'text-gray-600' : 'text-gray-400'} />
              </div>
              <p className="text-2xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                夢を可視化すると、脳はそれを現実として認識し始める
              </p>
              <p className="text-sm mb-6 max-w-lg mx-auto px-4">
                あなたの夢と目標を画像で表現し、毎日眺めることで潜在意識に働きかける
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
              >
                最初の画像を追加
              </button>
            </div>
          </div>
        )}
      </div>

      {editingPageId && editingPage && (
        <PageEditor
          page={editingPage}
          nodeImage={editingNode?.src}
          onUpdate={updatePage}
          onClose={() => setEditingPageId(null)}
          darkMode={darkMode}
        />
      )}

      <ZoomControl 
        zoom={zoom} 
        onZoomChange={handleZoomChange} 
        onFullscreen={() => setShowAmbientMode(true)}
        onExportWallpaper={() => setShowWallpaperExport(true)}
        darkMode={darkMode} 
      />

      {showAmbientMode && (
        <AmbientMode
          nodes={nodes}
          darkMode={darkMode}
          onClose={() => setShowAmbientMode(false)}
        />
      )}

      {showWallpaperExport && (
        <WallpaperExportModal
          nodes={nodes}
          darkMode={darkMode}
          onClose={() => setShowWallpaperExport(false)}
        />
      )}

      {showHint && (
        <div className={`fixed bottom-4 left-4 px-4 py-2 rounded-xl text-xs flex items-center gap-3 z-30 ${
          darkMode ? 'bg-gray-800/90 text-gray-400' : 'bg-white/90 text-gray-500'
        } backdrop-blur-sm`}>
          <div>
            <span className="font-medium">ヒント:</span> ドラッグで移動 • ホイールドラッグでパン • ダブルクリックでテキスト追加
          </div>
          <button
            onClick={() => setShowHint(false)}
            className={`p-1 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <EyeOff size={14} />
          </button>
        </div>
      )}

      {!showHint && (
        <button
          onClick={() => setShowHint(true)}
          className={`fixed bottom-4 left-4 p-2 rounded-xl z-30 ${
            darkMode ? 'bg-gray-800/90 text-gray-400 hover:bg-gray-700' : 'bg-white/90 text-gray-500 hover:bg-gray-200'
          } backdrop-blur-sm transition-colors`}
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
}
