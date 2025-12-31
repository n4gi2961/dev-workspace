import { useState } from 'react';
import { GripVertical } from 'lucide-react';

interface DraggableItemProps {
  children: React.ReactNode;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: (index: number) => void;
  darkMode: boolean;
}

export const DraggableItem = ({ children, index, onDragStart, onDragOver, onDrop, darkMode }: DraggableItemProps) => {
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
