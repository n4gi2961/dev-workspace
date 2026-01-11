'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, X, Type, ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Moon, Sun, ImagePlus, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Minimize, Download, ChevronLeft, BarChart3, Target, Calendar, FileText, Check, Star, GripVertical } from 'lucide-react';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { BLOCK_TYPES, NODE_TYPES, IMAGE_SHAPES, HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { HOVER_FONT_CONFIG, ROUTINE_COLORS, FONT_OPTIONS, SIZE_OPTIONS, COLOR_OPTIONS_DARK, COLOR_OPTIONS_LIGHT } from '@/constants/styles';
import { CATEGORIES, DECADES, SAMPLE_IMAGES } from '@/constants/ui';
import { generateId, getRandomColor, getTodayString, getWeekDates, getMonthDates, getDayLabel } from '@/lib/utils';
import { getEncouragementMessage } from '@/lib/messages';
import { createInitialBlocks } from '@/lib/initialData';
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
import { useNodes, Node } from '@/hooks/useNodes';
import { usePages } from '@/hooks/usePages';
import { uploadImage } from '@/lib/supabase/storage';
import { createInitialPage as createEmptyPage, Page } from '@/lib/pageMapper';
import { domToPng } from 'modern-screenshot';

interface VisionBoardProps {
  boardId?: string;
  userId?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Main Vision Board Component
export default function VisionBoard({ boardId, userId, onFullscreenChange }: VisionBoardProps) {
  const [darkMode, setDarkMode] = useState(true);

  // ✅ useNodesフックを使用
  const {
    nodes,
    addNode: addNodeToHook,
    updateNode: updateNodeInHook,
    deleteNode: deleteNodeFromHook,
    loading: nodesLoading
  } = useNodes(boardId, userId);

  // ✅ usePagesフックを使用
  const {
    pages,
    getPage,
    savePage,
    updatePageLocal,
    deletePage: deletePageFromHook,
    saveMilestones,
    saveRoutines,
    loading: pagesLoading
  } = usePages(userId);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showAmbientMode, setShowAmbientMode] = useState(false);
  const [showWallpaperExport, setShowWallpaperExport] = useState(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // 全画面モード変更時に親に通知
  useEffect(() => {
    onFullscreenChange?.(isFullscreenMode);
  }, [isFullscreenMode, onFullscreenChange]);

  // ブラウザ全画面モードの開始
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreenMode(true);
    } catch (err) {
      // Fullscreen APIが使えない場合はアプリ内全画面のみ
      setIsFullscreenMode(true);
    }
  }, []);

  // ブラウザ全画面モードの終了
  const exitFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
    setIsFullscreenMode(false);
  }, []);

  // Escキーでブラウザ全画面が解除された時の同期
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreenMode) {
        setIsFullscreenMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isFullscreenMode]);

  const boardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const initialScrollDone = useRef(false);
  const fullscreenOverlayRef = useRef<HTMLDivElement>(null);

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

  // darkMode変更時のテキスト色自動変更は無効化
  // （Supabase永続化により、毎回DBへの更新が発生するため）
  // テキスト色はユーザーが手動で設定してください

  // ✅ ノード読み込み完了時にページを自動プリフェッチ（ホバー即時表示のため）
  useEffect(() => {
    if (!nodesLoading && nodes.length > 0 && userId) {
      nodes.forEach(node => {
        if (node.type === 'image') {
          getPage(node.id);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodesLoading, userId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
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

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      e.preventDefault();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      container.scrollLeft = panStart.current.scrollLeft - dx;
      container.scrollTop = panStart.current.scrollTop - dy;
    };

    const handleMouseUp = (e: MouseEvent) => {
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

  // ✅ 非同期でSupabaseに保存
  const addImageNode = async (src: string) => {
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    const containerWidth = container?.clientWidth || 800;
    const containerHeight = container?.clientHeight || 600;

    // Place new images near the center of the visible area
    const centerX = scrollLeft + containerWidth / 2;
    const centerY = scrollTop + containerHeight / 2;

    const newNode = {
      type: NODE_TYPES.IMAGE as 'image',
      src,
      x: (centerX - 125 + (Math.random() - 0.5) * 200) / (zoom / 100),
      y: (centerY - 90 + (Math.random() - 0.5) * 200) / (zoom / 100),
      width: 250,
      height: 180,
      shape: IMAGE_SHAPES.FREE,
      hoverFontSize: HOVER_FONT_SIZES.MEDIUM,
      hoverTextColor: HOVER_TEXT_COLORS.WHITE,
    };

    // ✅ Supabaseに保存（IDはSupabaseが生成）
    const savedNode = await addNodeToHook(newNode);
    if (savedNode) {
      // ✅ ページもSupabaseに保存
      const initialPage = createEmptyPage();
      updatePageLocal(savedNode.id, initialPage);
      savePage(savedNode.id, initialPage);
    }
  };

  const addTextNode = async (x: number, y: number) => {
    const newNode = {
      type: NODE_TYPES.TEXT as 'text',
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
    // ✅ Supabaseに保存
    const savedNode = await addNodeToHook(newNode);
    if (savedNode) {
      setSelectedNode(savedNode.id);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId || !boardId) return;

    try {
      // ✅ Storageにアップロードして公開URLを取得
      const imageUrl = await uploadImage(file, userId, boardId);
      addImageNode(imageUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('画像のアップロードに失敗しました');
    }
  };

  // ✅ Supabaseに保存（楽観的更新）
  const updateNode = (updatedNode: Node) => {
    updateNodeInHook(updatedNode);
  };

  // ✅ Supabaseから削除
  const deleteNode = (nodeId: string) => {
    deleteNodeFromHook(nodeId);
    // ✅ ページもSupabaseから削除
    deletePageFromHook(nodeId);
    if (selectedNode === nodeId) {
      setSelectedNode(null);
    }
  };

  const updatePage = (pageData: Page) => {
    if (!editingPageId) return;
    // ✅ ローカル更新（楽観的更新）
    updatePageLocal(editingPageId, pageData);
    // ✅ Supabaseに保存
    savePage(editingPageId, pageData);
    // ✅ マイルストーン・ルーティンも保存
    if (pageData.milestones) {
      saveMilestones(editingPageId, pageData.milestones);
    }
    if (pageData.routines) {
      saveRoutines(editingPageId, pageData.routines);
    }
  };

  const handleToggleRoutine = (nodeId: string, routineId: string, date: string) => {
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

    // ✅ ローカル更新（楽観的更新）
    updatePageLocal(nodeId, { ...page, routines, updatedAt: Date.now() });
    // ✅ Supabaseに保存
    saveRoutines(nodeId, routines);
  };

  // ✅ ページエディタを開く（データをロード）
  const handleOpenEditor = async (nodeId: string) => {
    // まずページデータを取得（キャッシュかDBから）
    await getPage(nodeId);
    // エディタを開く
    setEditingPageId(nodeId);
  };

  const handleBoardDoubleClick = (e: React.MouseEvent) => {
    // 全画面モードではテキスト作成を無効化
    if (isFullscreenMode) return;
    if (e.target === boardRef.current) {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left + container.scrollLeft;
      const y = e.clientY - rect.top + container.scrollTop;
      addTextNode(x, y);
    }
  };

  const handleBoardClick = (e: React.MouseEvent) => {
    if (e.target === boardRef.current) {
      setSelectedNode(null);
    }
  };

  const handleZoomChange = (newZoom: number) => {
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

  // 全画面モードでのスクリーンショットダウンロード
  const handleFullscreenDownload = async () => {
    const container = containerRef.current;
    const board = boardRef.current;
    if (!container || !board) return;

    // オーバーレイUIを一時的に非表示
    if (fullscreenOverlayRef.current) {
      fullscreenOverlayRef.current.style.display = 'none';
    }

    try {
      // 現在のスクロール位置とビューポートサイズを取得
      const scrollLeft = container.scrollLeft;
      const scrollTop = container.scrollTop;
      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;

      // ボード全体をキャプチャしてからクロップ
      // ※ キャプチャ画像はズーム後のサイズになる（transform: noneは効かない）
      const imageScale = 2; // 高解像度出力用
      const dataUrl = await domToPng(board, {
        backgroundColor: darkMode ? '#030712' : '#f9fafb',
        scale: imageScale,
      });

      // キャンバスでクロップ処理
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = viewportWidth * imageScale;
        canvas.height = viewportHeight * imageScale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // キャプチャ画像はズーム後のサイズなので、スクロール位置をそのまま使用
        ctx.drawImage(
          img,
          scrollLeft * imageScale,      // ソースX（スクロール位置そのまま）
          scrollTop * imageScale,       // ソースY
          viewportWidth * imageScale,   // ソース幅（ビューポートサイズ）
          viewportHeight * imageScale,  // ソース高さ
          0, 0,
          viewportWidth * imageScale,
          viewportHeight * imageScale
        );

        // JPEG画像としてダウンロード（品質0.92で高画質かつ軽量）
        const link = document.createElement('a');
        link.download = `vision-board-${new Date().toISOString().slice(0, 10)}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.92);
        link.click();
      };
      img.src = dataUrl;
    } catch (error) {
      console.error('Screenshot failed:', error);
    } finally {
      // オーバーレイUIを再表示
      if (fullscreenOverlayRef.current) {
        fullscreenOverlayRef.current.style.display = 'flex';
      }
    }
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
      {/* Toolbar - hidden in fullscreen mode */}
      {!isFullscreenMode && (
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
      )}

      {/* Scrollable Board Container */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto relative ${isPanning ? 'cursor-grabbing' : ''}`}
        style={{
          scrollbarColor: darkMode ? '#374151 #111827' : '#d1d5db #f3f4f6',
          scrollbarWidth: 'thin',
        }}
      >
        {/* スクロール領域をズーム後のサイズに制限するラッパー */}
        <div
          style={{
            width: BOARD_WIDTH * (zoom / 100),
            height: BOARD_HEIGHT * (zoom / 100),
          }}
        >
          <div
            ref={boardRef}
            className={`relative ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}
            style={{
              width: BOARD_WIDTH,
              height: BOARD_HEIGHT,
              backgroundImage: darkMode
                ? 'radial-gradient(circle, #374151 1px, transparent 1px)'
                : 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
              backgroundSize: '24px 24px',
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
                onOpenEditor={handleOpenEditor}
                pages={pages}
                onToggleRoutine={handleToggleRoutine}
                darkMode={darkMode}
                isSelected={selectedNode === node.id}
                onSelect={setSelectedNode}
                zoom={zoom}
                isFullscreenMode={isFullscreenMode}
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
                isFullscreenMode={isFullscreenMode}
              />
            )
          ))}
          
          <div className={`absolute inset-0 pointer-events-none border-2 border-dashed ${
            darkMode ? 'border-gray-800' : 'border-gray-300'
          } rounded-lg`} style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }} />
          </div>
        </div>

        {nodesLoading ? (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none" style={{ top: '64px' }}>
            <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
              <p className="text-lg font-medium">Now Loading...</p>
            </div>
          </div>
        ) : nodes.length === 0 && (
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
          nodeImage={editingNode?.src || ''}
          onUpdate={updatePage}
          onClose={() => setEditingPageId(null)}
          darkMode={darkMode}
        />
      )}

      {!isFullscreenMode && (
        <ZoomControl
          zoom={zoom}
          onZoomChange={handleZoomChange}
          onSlideshow={() => setShowAmbientMode(true)}
          onEnterFullscreen={enterFullscreen}
          darkMode={darkMode}
        />
      )}

      {/* Fullscreen Mode Overlay UI - 右下に配置（ズーム機能 | スクショ、終了） */}
      {isFullscreenMode && (
        <div ref={fullscreenOverlayRef} className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/50 backdrop-blur-sm rounded-xl">
          {/* ズーム機能 */}
          <button
            onClick={() => handleZoomChange(Math.max(25, zoom - 25))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="ズームアウト"
          >
            <ZoomOut size={16} className="text-white" />
          </button>
          <input
            type="range"
            min={25}
            max={200}
            value={zoom}
            onChange={(e) => handleZoomChange(parseInt(e.target.value))}
            className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <button
            onClick={() => handleZoomChange(Math.min(200, zoom + 25))}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="ズームイン"
          >
            <ZoomIn size={16} className="text-white" />
          </button>
          <span className="text-xs font-medium w-10 text-center text-white">{zoom}%</span>
          <div className="w-px h-5 bg-white/20" />
          {/* スクショ・終了 */}
          <button
            onClick={handleFullscreenDownload}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="スクリーンショット"
          >
            <Download size={16} className="text-white" />
          </button>
          <button
            onClick={exitFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="全画面終了"
          >
            <Minimize size={16} className="text-white" />
          </button>
        </div>
      )}

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

      {/* ヒントUI - 全画面時は非表示 */}
      {!isFullscreenMode && showHint && (
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

      {!isFullscreenMode && !showHint && (
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
