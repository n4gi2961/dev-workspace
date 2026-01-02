'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Plus, X, Type, ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Moon, Sun, ImagePlus, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Download, ChevronLeft, BarChart3, Target, Calendar, FileText, Check, Star, GripVertical } from 'lucide-react';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { BLOCK_TYPES, NODE_TYPES, IMAGE_SHAPES, HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { HOVER_FONT_CONFIG, ROUTINE_COLORS, FONT_OPTIONS, SIZE_OPTIONS, COLOR_OPTIONS_DARK, COLOR_OPTIONS_LIGHT } from '@/constants/styles';
import { CATEGORIES, DECADES, SAMPLE_IMAGES } from '@/constants/ui';
import { generateId, getRandomColor, getTodayString, getWeekDates, getMonthDates, getDayLabel } from '@/lib/utils';
import { getEncouragementMessage } from '@/lib/messages';
import { createInitialBlocks, createInitialPage } from '@/lib/initialData';
import { LiquidFillProgress } from '@/components/ui/LiquidFillProgress';
import { DraggableItem } from '@/components/ui/DraggableItem';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { FontSizeSelector } from '@/components/ui/FontSizeSelector';
import { BlockAddMenu } from '@/components/ui/BlockAddMenu';
import { TextToolbar } from '@/components/ui/TextToolbar';
import { ZoomControl } from '@/components/ui/ZoomControl';
import { AmbientMode } from '@/components/ui/AmbientMode';
import { WallpaperExportModal } from '@/components/ui/WallpaperExportModal';
import { ShapeSelector } from '@/components/ui/ShapeSelector';
import { MilestoneInput } from '@/components/ui/MilestoneInput';
import { RoutineWeeklyTable } from '@/components/ui/RoutineWeeklyTable';
import { DataCalendar } from '@/components/ui/DataCalendar';
import { DraggableTextNode } from '@/components/features/DraggableTextNode';
import { DraggableImageNode } from '@/components/features/DraggableImageNode';
import { Block } from '@/components/features/Block';
import { PageEditor } from '@/components/features/PageEditor';
import { useNodes } from '@/hooks/useNodes';
import { usePages } from '@/hooks/usePages';

interface VisionBoardProps {
  boardId?: string;
  userId?: string;
}

// Main Vision Board Component
export default function VisionBoard({ boardId, userId }: VisionBoardProps) {
  const [darkMode, setDarkMode] = useState(true);
  const {
    nodes,
    addNode: addNodeToHook,
    updateNode: updateNodeInHook,
    deleteNode: deleteNodeFromHook,
    loading: nodesLoading,
    error: nodesError
  } = useNodes(boardId, userId);

  // ノードIDのリストをメモ化してusePagesに渡す
  const nodeIds = useMemo(() => nodes.map(n => n.id), [nodes]);
  const { pages, updatePage: updatePageInHook } = usePages(nodeIds);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
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

  // darkMode変更時のテキスト色自動変更は無効化（パフォーマンス問題のため）
  // テキスト色はユーザーが手動で設定してください

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

  const addImageNode = async (src: string) => {
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    const containerWidth = container?.clientWidth || 800;
    const containerHeight = container?.clientHeight || 600;

    // Place new images near the center of the visible area
    const centerX = scrollLeft + containerWidth / 2;
    const centerY = scrollTop + containerHeight / 2;

    const newNode = await addNodeToHook({
      type: NODE_TYPES.IMAGE,
      src,
      x: (centerX - 125 + (Math.random() - 0.5) * 200) / (zoom / 100),
      y: (centerY - 90 + (Math.random() - 0.5) * 200) / (zoom / 100),
      width: 250,
      height: 180,
      shape: IMAGE_SHAPES.FREE,
      hoverFontSize: HOVER_FONT_SIZES.MEDIUM,
      hoverTextColor: HOVER_TEXT_COLORS.WHITE,
    });
    if (newNode) {
      await updatePageInHook(newNode.id, createInitialPage());
    }
  };

  const addTextNode = async (x: number, y: number) => {
    const newNode = await addNodeToHook({
      type: NODE_TYPES.TEXT,
      content: '',
      x: x / (zoom / 100),
      y: y / (zoom / 100),
      width: 200,
      height: 40,
      fontSize: 16,
      color: darkMode ? '#ffffff' : '#000000',
      fontFamily: "'Noto Sans JP', sans-serif",
    });
    if (newNode) {
      setSelectedNode(newNode.id);
    }
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

  const updateNode = async (updatedNode: any) => {
    await updateNodeInHook(updatedNode);
  };

  const deleteNode = async (nodeId: string) => {
    await deleteNodeFromHook(nodeId);
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  const updatePage = async (pageData: any) => {
    if (!editingPageId) return;
    await updatePageInHook(editingPageId, pageData);
  };

  const handleToggleRoutine = async (nodeId: string, routineId: string, date: string) => {
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

    await updatePageInHook(nodeId, { ...page, routines, updatedAt: Date.now() });
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
