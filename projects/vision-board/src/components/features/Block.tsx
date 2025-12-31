import { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Plus } from 'lucide-react';
import { BLOCK_TYPES } from '@/constants/types';
import { generateId } from '@/lib/utils';
import { BlockAddMenu } from '@/components/ui/BlockAddMenu';

interface BlockProps {
  block: any;
  onChange: (block: any) => void;
  onDelete: () => void;
  onAddAfter: (newBlock: any, focusNewId: string) => void;
  onAddBlockType: (afterId: string, type: string) => void;
  darkMode: boolean;
  depth?: number;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
}

export const Block = ({ block, onChange, onDelete, onAddAfter, onAddBlockType, darkMode, depth = 0, focusId, setFocusId }: BlockProps) => {
  const [isOpen, setIsOpen] = useState(block.isOpen ?? true);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const adjustTextareaHeight = (textarea: HTMLTextAreaElement | null) => {
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

  const handleContentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      adjustTextareaHeight(e.target as HTMLTextAreaElement);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      const cursorPos = target.selectionStart || 0;
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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    onChange({ ...block, isOpen: newIsOpen });
  };

  const handleCheckboxToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange({ ...block, checked: !block.checked });
  };

  const handleChildChange = (updatedChild: any) => {
    const newChildren = (block.children || []).map((c: any) => c.id === updatedChild.id ? updatedChild : c);
    onChange({ ...block, children: newChildren });
  };

  const handleChildDelete = (childId: string) => {
    const newChildren = (block.children || []).filter((c: any) => c.id !== childId);
    onChange({ ...block, children: newChildren });
  };

  const handleAddChildAfter = (afterId: string, newBlock: any, focusNewId?: string) => {
    const children = block.children || [];
    const index = children.findIndex((c: any) => c.id === afterId);
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

  const handleAddBlockType = (type: string) => {
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
              {(block.children || []).map((child: any) => (
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
