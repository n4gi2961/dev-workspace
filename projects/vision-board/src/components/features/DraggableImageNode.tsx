import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { IMAGE_SHAPES, HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { createInitialPage } from '@/lib/initialData';
import { FontSizeSelector } from '@/components/ui/FontSizeSelector';
import { ShapeSelector } from '@/components/ui/ShapeSelector';
import { HoverPreview } from '@/components/features/HoverPreview';

interface DraggableImageNodeProps {
  node: any;
  onUpdate: (updatedNode: any) => void;
  onDelete: (nodeId: string) => void;
  onOpenEditor: (nodeId: string) => void;
  pages: any;
  onToggleRoutine: (nodeId: string, routineId: string, date: string) => void;
  darkMode: boolean;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
}

export const DraggableImageNode = ({ node, onUpdate, onDelete, onOpenEditor, pages, onToggleRoutine, darkMode, isSelected, onSelect }: DraggableImageNodeProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showPlaceHint, setShowPlaceHint] = useState(false);
  // ✅ ローカル位置/サイズ状態（ドラッグ中のみ使用）
  const [localPos, setLocalPos] = useState({ x: node.x, y: node.y });
  const [localSize, setLocalSize] = useState({ width: node.width, height: node.height });
  const nodeRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ width: 0, height: 0 });
  const startNodePos = useRef({ x: 0, y: 0 });
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);
  // ✅ nodeをrefで保持（依存配列から除外するため）
  const nodeRef2 = useRef(node);
  nodeRef2.current = node;

  const page = pages[node.id] || createInitialPage();
  const shape = node.shape || IMAGE_SHAPES.FREE;
  const hoverFontSize = node.hoverFontSize || HOVER_FONT_SIZES.MEDIUM;
  const hoverTextColor = node.hoverTextColor || HOVER_TEXT_COLORS.WHITE;

  const getAspectRatioForShape = (shape: string): number | null => {
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

  const handleShapeChange = (newShape: string) => {
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

  const handleFontSizeChange = (newSize: string) => {
    onUpdate({ ...node, hoverFontSize: newSize });
  };

  const handleTextColorChange = (newColor: string) => {
    onUpdate({ ...node, hoverTextColor: newColor });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.preventDefault();
    e.stopPropagation();

    clickCount.current++;

    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        if (clickCount.current === 1) {
          onSelect(node.id);
          // ✅ ドラッグ開始時にローカル状態を初期化
          setLocalPos({ x: node.x, y: node.y });
          setLocalSize({ width: node.width, height: node.height });
          setIsDragging(true);
          setShowPlaceHint(true);
          startPos.current = { x: e.clientX - node.x, y: e.clientY - node.y };
        }
        clickCount.current = 0;
      }, 200);
    } else if (clickCount.current === 2) {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      onOpenEditor(node.id);
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    // ✅ リサイズ開始時にローカル状態を初期化
    setLocalPos({ x: node.x, y: node.y });
    setLocalSize({ width: node.width, height: node.height });
    setIsResizing(true);
    setResizeDirection(direction);
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = { width: node.width, height: node.height };
    startNodePos.current = { x: node.x, y: node.y };
  };

  // ✅ nodeが外部から変更されたらローカル状態を同期
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setLocalPos({ x: node.x, y: node.y });
      setLocalSize({ width: node.width, height: node.height });
    }
  }, [node.x, node.y, node.width, node.height, isDragging, isResizing]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const currentNode = nodeRef2.current;

      if (isDragging) {
        let newX = e.clientX - startPos.current.x;
        let newY = e.clientY - startPos.current.y;

        newX = Math.max(0, Math.min(newX, BOARD_WIDTH - localSize.width));
        newY = Math.max(0, Math.min(newY, BOARD_HEIGHT - localSize.height));

        // ✅ ローカル状態のみ更新（DBには保存しない）
        setLocalPos({ x: newX, y: newY });
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

        // ✅ ローカル状態のみ更新（DBには保存しない）
        setLocalPos({ x: newX, y: newY });
        setLocalSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      const currentNode = nodeRef2.current;

      // ✅ ドラッグ/リサイズ終了時のみDBに保存
      if (isDragging || isResizing) {
        onUpdate({
          ...currentNode,
          x: localPos.x,
          y: localPos.y,
          width: localSize.width,
          height: localSize.height,
        });
      }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing, resizeDirection, shape, localPos, localSize]);

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

  // ✅ 表示にはローカル状態を使用（ドラッグ中のスムーズな動き）
  const displayX = isDragging || isResizing ? localPos.x : node.x;
  const displayY = isDragging || isResizing ? localPos.y : node.y;
  const displayWidth = isDragging || isResizing ? localSize.width : node.width;
  const displayHeight = isDragging || isResizing ? localSize.height : node.height;

  return (
    <div
      ref={nodeRef}
      className={`absolute group transition-shadow duration-200 ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      } ${isDragging ? 'opacity-90 cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: displayX,
        top: displayY,
        width: displayWidth,
        height: displayHeight,
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
