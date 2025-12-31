import { useState, useEffect, useRef } from 'react';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { TextToolbar } from '@/components/ui/TextToolbar';

interface DraggableTextNodeProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
  onDelete: (nodeId: string) => void;
  darkMode: boolean;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}

export const DraggableTextNode = ({ node, onUpdate, onDelete, darkMode, isSelected, onSelect }: DraggableTextNodeProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isEditing, setIsEditing] = useState(node.isNew || false);
  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
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
    let timer: NodeJS.Timeout;
    if (isHovered && !isDragging && !isEditing) {
      timer = setTimeout(() => setShowToolbar(true), 100);
    } else if (!isHovered) {
      timer = setTimeout(() => setShowToolbar(false), 200);
    }
    return () => clearTimeout(timer);
  }, [isHovered, isDragging, isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if ((e.target as HTMLElement).closest('.toolbar')) return;

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
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      setIsEditing(true);
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: node.width, height: node.height };
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...node, content: e.target.value });
  };

  const handleTextBlur = () => {
    setIsEditing(false);
    if (!node.content) {
      onDelete(node.id);
    }
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      if (!node.content) {
        onDelete(node.id);
      }
    }
  };

  const handleToolbarUpdate = (updated: any) => {
    if (updated === null) {
      onDelete(node.id);
    } else {
      onUpdate(updated);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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
