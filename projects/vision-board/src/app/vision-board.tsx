'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Plus, X, Type, ChevronRight, ChevronDown, CheckSquare, Square, Trash2, Moon, Sun, ImagePlus, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Minimize, Download, ChevronLeft, BarChart3, Target, Calendar, FileText, Check, Star, GripVertical, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { BOARD_WIDTH, BOARD_HEIGHT } from '@/constants/board';
import { BLOCK_TYPES, NODE_TYPES, IMAGE_SHAPES, HOVER_FONT_SIZES, HOVER_TEXT_COLORS } from '@/constants/types';
import { HOVER_FONT_CONFIG, ROUTINE_COLORS, FONT_OPTIONS, SIZE_OPTIONS, COLOR_OPTIONS_DARK, COLOR_OPTIONS_LIGHT } from '@/constants/styles';
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
import { StarStackModal } from '@/components/ui/StarStackModal';
import { useStarStack } from '@/hooks/useStarStack';
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
import { useRoutines } from '@/hooks/useRoutines';
import { uploadImage } from '@/lib/supabase/storage';
import { createClient } from '@/lib/supabase/client';
import { createInitialPage as createEmptyPage, Page } from '@/lib/pageMapper';
import { useClearPercent } from '@/hooks/useClearPercent';
import { domToPng } from 'modern-screenshot';

// 画面幅に応じた初期ズーム値を計算
const calculateInitialZoom = (): number => {
  if (typeof window === 'undefined') return 70;
  const width = window.innerWidth;
  if (width < 640) return 30;   // モバイル
  if (width < 1024) return 50;  // タブレット
  return 70;                    // デスクトップ
};

interface VisionBoardProps {
  boardId?: string;
  userId?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

// Main Vision Board Component
export default function VisionBoard({ boardId, userId, onFullscreenChange }: VisionBoardProps) {
  const t = useTranslations('board');
  const tHints = useTranslations('hints');
  const tCommon = useTranslations('common');
  const [darkMode, setDarkMode] = useState(true);
  // ✅ Supabaseクライアント（useMemoでキャッシュ）
  const supabase = useMemo(() => createClient(), []);

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
    // saveRoutinesは削除（useRoutinesで管理）
    addFrozenDate,
    removeFrozenDate,
    loading: pagesLoading
  } = usePages(userId);

  // ✅ useRoutinesフックを使用（ルーティン共有機能用）
  const {
    routines,
    routineNodes,
    getRoutinesForNode,
    toggleRoutineCheck,
    createRoutine,
    addRoutineToNode,
    removeRoutineFromNode,
    deleteRoutine,
    updateRoutineTitle,
    updateRoutineColor,
    updateRoutineActiveDays,
    reorderRoutinesInNode,
    loading: routinesLoading,
  } = useRoutines(boardId || null, userId || null);

  // ✅ clearPercent計算フック
  const { calculateAfterToggle, recalculate } = useClearPercent();

  // ✅ 無題番号付け関数（多言語対応）
  const getNextUntitledTitle = useCallback(() => {
    const untitledBase = tCommon('untitled'); // 「無題」「Untitled」等
    // 各言語の「無題」パターンを検出
    const patterns = [
      /^無題(?:\((\d+)\))?$/,
      /^Untitled(?:\((\d+)\))?$/i,
      /^Sin título(?:\((\d+)\))?$/i,
      /^제목 없음(?:\((\d+)\))?$/,
      /^无标题(?:\((\d+)\))?$/,
    ];

    let maxNum = -1;

    Object.values(pages).forEach(page => {
      if (!page.title) return;
      for (const pattern of patterns) {
        const match = page.title.match(pattern);
        if (match) {
          const num = match[1] ? parseInt(match[1]) : 0;
          maxNum = Math.max(maxNum, num);
          break;
        }
      }
    });

    return maxNum < 0 ? untitledBase : `${untitledBase}(${maxNum + 1})`;
  }, [pages, tCommon]);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  // ✅ ヒント表示状態（null = 読み込み中）
  const [showHint, setShowHint] = useState<boolean | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  // ✅ ズーム値（null = 読み込み中）
  const [zoom, setZoom] = useState<number | null>(null);
  // ✅ 保存されたスクロール位置（null = 中央揃えを使用）
  const [initialScroll, setInitialScroll] = useState<{x: number, y: number} | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const saveSettingsRef = useRef<NodeJS.Timeout | null>(null);
  const [showAmbientMode, setShowAmbientMode] = useState(false);
  const [showWallpaperExport, setShowWallpaperExport] = useState(false);
  const [showStarStack, setShowStarStack] = useState(false);
  const [pendingStarColors, setPendingStarColors] = useState<string[]>([]);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // ✅ useStarStack を親コンポーネントで呼び出し（モーダル開閉で状態が消えないように）
  const {
    stars,
    isLoading: isStarStackLoading,
    totalStars,
    newStarsCount,
    showCork,
    addStar,
    addBatch,
    resetStars,
    syncWithSupabase,
  } = useStarStack({
    userId,
    boardId,
    pages,
    pendingStarColors,
  });

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

  // ✅ 設定をローカルキャッシュ/DBから読み込み（zoom, scroll, showHint）
  useEffect(() => {
    const loadSettings = async () => {
      if (!boardId || !userId) {
        // ボードIDがない場合はデフォルト値
        setZoom(calculateInitialZoom());
        setShowHint(true);
        setSettingsLoaded(true);
        return;
      }

      // 1. ローカルキャッシュ確認
      const cachedZoom = localStorage.getItem(`board-zoom-${boardId}`);
      const cachedScroll = localStorage.getItem(`board-scroll-${boardId}`);
      const cachedShowHint = localStorage.getItem(`board-showHint-${boardId}`);

      let hasCache = false;

      if (cachedZoom) {
        setZoom(parseInt(cachedZoom));
        hasCache = true;
      }

      if (cachedScroll) {
        try {
          const scroll = JSON.parse(cachedScroll);
          setInitialScroll({ x: scroll.x, y: scroll.y });
        } catch { /* ignore */ }
      }

      if (cachedShowHint !== null) {
        setShowHint(cachedShowHint === 'true');
      }

      // キャッシュがあればDB読み込みをスキップ
      if (hasCache) {
        if (cachedShowHint === null) setShowHint(true);
        setSettingsLoaded(true);
        return;
      }

      // 2. DBから取得
      try {
        const { data } = await supabase
          .from('boards')
          .select('settings')
          .eq('id', boardId)
          .single();

        const settings = data?.settings || {};

        // ズーム
        if (settings.zoom) {
          setZoom(settings.zoom);
          localStorage.setItem(`board-zoom-${boardId}`, settings.zoom.toString());
        } else {
          const initialZoom = calculateInitialZoom();
          setZoom(initialZoom);
        }

        // ヒント表示状態
        if (settings.showHint !== undefined) {
          setShowHint(settings.showHint);
          localStorage.setItem(`board-showHint-${boardId}`, settings.showHint.toString());
        } else {
          setShowHint(true);
        }
      } catch {
        // エラー時はデフォルト値
        setZoom(calculateInitialZoom());
        setShowHint(true);
      }
      setSettingsLoaded(true);
    };

    loadSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, userId]);

  // ✅ ズーム変更時（中央維持 + デバウンス保存）
  const handleZoomChange = useCallback((newZoom: number) => {
    const container = containerRef.current;
    const currentZoom = zoom ?? 70;

    if (container) {
      // Calculate center point before zoom
      const centerX = container.scrollLeft + container.clientWidth / 2;
      const centerY = container.scrollTop + container.clientHeight / 2;

      // Calculate the board position at center
      const boardCenterX = centerX / (currentZoom / 100);
      const boardCenterY = centerY / (currentZoom / 100);

      // Apply new zoom
      setZoom(newZoom);

      // Adjust scroll to keep the same board position at center
      requestAnimationFrame(() => {
        const newCenterX = boardCenterX * (newZoom / 100);
        const newCenterY = boardCenterY * (newZoom / 100);
        container.scrollLeft = newCenterX - container.clientWidth / 2;
        container.scrollTop = newCenterY - container.clientHeight / 2;
      });
    } else {
      setZoom(newZoom);
    }

    // ✅ 永続化処理
    if (!boardId) return;

    // ローカルキャッシュ即時更新
    localStorage.setItem(`board-zoom-${boardId}`, newZoom.toString());

    // DBはデバウンス保存（500ms）- 既存settingsとマージ
    if (saveSettingsRef.current) clearTimeout(saveSettingsRef.current);
    saveSettingsRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('boards')
        .select('settings')
        .eq('id', boardId)
        .single();

      await supabase
        .from('boards')
        .update({
          settings: { ...data?.settings, zoom: newZoom },
          updated_at: new Date().toISOString()
        })
        .eq('id', boardId);
    }, 500);
  }, [boardId, supabase, zoom]);

  // ✅ ヒント表示状態のトグル（永続化付き）
  const handleToggleHint = useCallback((show: boolean) => {
    setShowHint(show);

    if (!boardId) return;

    // ローカルキャッシュ即時更新
    localStorage.setItem(`board-showHint-${boardId}`, show.toString());

    // DBはデバウンス保存（500ms）- 既存settingsとマージ
    if (saveSettingsRef.current) clearTimeout(saveSettingsRef.current);
    saveSettingsRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('boards')
        .select('settings')
        .eq('id', boardId)
        .single();

      await supabase
        .from('boards')
        .update({
          settings: { ...data?.settings, showHint: show },
          updated_at: new Date().toISOString()
        })
        .eq('id', boardId);
    }, 500);
  }, [boardId, supabase]);

  // ✅ ズーム確定後にスクロール位置を設定（保存位置または中央揃え）
  useEffect(() => {
    if (containerRef.current && zoom !== null && settingsLoaded && !initialScrollDone.current) {
      const container = containerRef.current;

      if (initialScroll) {
        // 保存された位置を復元
        container.scrollLeft = initialScroll.x;
        container.scrollTop = initialScroll.y;
      } else {
        // 新規ボード: 中央揃え
        const scaledWidth = BOARD_WIDTH * (zoom / 100);
        const scaledHeight = BOARD_HEIGHT * (zoom / 100);
        container.scrollLeft = Math.max(0, (scaledWidth - container.clientWidth) / 2);
        container.scrollTop = Math.max(0, (scaledHeight - container.clientHeight) / 2);
      }
      initialScrollDone.current = true;
    }
  }, [zoom, settingsLoaded, initialScroll]);

  // ✅ ページ離脱時にスクロール位置を保存（LocalStorageのみ）
  useEffect(() => {
    const saveScrollPosition = () => {
      if (!boardId || !containerRef.current) return;
      const container = containerRef.current;
      localStorage.setItem(`board-scroll-${boardId}`, JSON.stringify({
        x: container.scrollLeft,
        y: container.scrollTop
      }));
    };

    window.addEventListener('beforeunload', saveScrollPosition);
    return () => window.removeEventListener('beforeunload', saveScrollPosition);
  }, [boardId]);

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
      // 中クリック、または全画面モード時は左クリックでもパン開始
      if (e.button === 1 || (isFullscreenMode && e.button === 0)) {
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
      // 中クリック、または全画面モード時は左クリックでもパン終了
      if (e.button === 1 || (isFullscreenMode && e.button === 0) || isPanning) {
        setIsPanning(false);
        container.style.cursor = isFullscreenMode ? 'grab' : 'default';
      }
    };

    // 全画面モード時はカーソルをgrabに
    if (isFullscreenMode) {
      container.style.cursor = 'grab';
    } else {
      container.style.cursor = 'default';
    }

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, settingsLoaded, isFullscreenMode]);  // ✅ isFullscreenMode追加

  // ✅ 非同期でSupabaseに保存
  const addImageNode = async (src: string, imgWidth: number, imgHeight: number) => {
    const container = containerRef.current;
    const scrollLeft = container?.scrollLeft || 0;
    const scrollTop = container?.scrollTop || 0;
    const containerWidth = container?.clientWidth || 800;
    const containerHeight = container?.clientHeight || 600;

    // Place new images near the center of the visible area
    const centerX = scrollLeft + containerWidth / 2;
    const centerY = scrollTop + containerHeight / 2;

    const currentZoom = zoom ?? 70;
    const newNode = {
      type: NODE_TYPES.IMAGE as 'image',
      src,
      x: (centerX - imgWidth / 2 + (Math.random() - 0.5) * 200) / (currentZoom / 100),
      y: (centerY - imgHeight / 2 + (Math.random() - 0.5) * 200) / (currentZoom / 100),
      width: imgWidth,
      height: imgHeight,
      shape: IMAGE_SHAPES.FREE,
      hoverFontSize: HOVER_FONT_SIZES.MEDIUM,
      hoverTextColor: HOVER_TEXT_COLORS.WHITE,
    };

    // ✅ Supabaseに保存（IDはSupabaseが生成）
    const savedNode = await addNodeToHook(newNode);
    if (savedNode) {
      // ✅ ページもSupabaseに保存（無題番号付け）
      const initialPage = {
        ...createEmptyPage(),
        title: getNextUntitledTitle(),
      };
      updatePageLocal(savedNode.id, initialPage);
      savePage(savedNode.id, initialPage);
    }
  };

  const addTextNode = async (x: number, y: number) => {
    const currentZoom = zoom ?? 70;
    const newNode = {
      type: NODE_TYPES.TEXT as 'text',
      content: '',
      x: x / (currentZoom / 100),
      y: y / (currentZoom / 100),
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

      // ✅ 画像の実際のサイズを取得してアスペクト比を維持
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 600;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        let width: number;
        let height: number;

        if (naturalWidth >= naturalHeight) {
          // 横長または正方形: 幅を600pxに
          width = MAX_SIZE;
          height = Math.round((naturalHeight / naturalWidth) * MAX_SIZE);
        } else {
            // 縦長: 高さを600pxに
          height = MAX_SIZE;
          width = Math.round((naturalWidth / naturalHeight) * MAX_SIZE);
        }

        addImageNode(imageUrl, width, height);
      };
      img.onerror = () => {
        // 読み込み失敗時はデフォルトサイズ
        addImageNode(imageUrl, 600, 400);
      };
      img.src = imageUrl;
    } catch (err) {
      console.error('Image upload failed:', err);
      alert(t('uploadFailed'));
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
    // ✅ マイルストーンを保存
    if (pageData.milestones) {
      saveMilestones(editingPageId, pageData.milestones);
    }
    // ★ routinesはPageEditorからuseRoutines経由で直接操作するため、ここでは保存しない
  };

  // ★ useRoutines経由でルーティンチェックを更新
  const handleToggleRoutine = async (nodeId: string, routineId: string, date: string) => {
    const node = nodes.find(n => n.id === nodeId);
    const routine = routines[routineId];
    if (!node || !routine) return;

    // チェック状態を取得
    const wasChecked = routine.history?.[date] || false;
    const willBeChecked = !wasChecked;

    // チェックされた場合、その習慣の色を記録（Star Stack用）
    if (willBeChecked && routine.color) {
      setPendingStarColors(prev => [...prev, routine.color]);
    }

    // ✅ useRoutines経由でDB更新（楽観的更新も含む）
    await toggleRoutineCheck(routineId, date);

    // ✅ clearPercent再計算
    const nodeRoutines = getRoutinesForNode(nodeId);
    const page = pages[nodeId];
    if (nodeRoutines.length > 0 && page) {
      const currentClearPercent = node.clearPercent ?? 0;
      const newClearPercent = calculateAfterToggle(
        currentClearPercent,
        nodeRoutines,
        page.frozenDates || [],
        routineId,
        date,
        willBeChecked
      );
      updateNodeInHook({ ...node, clearPercent: newClearPercent });
    }
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

  // ✅ ズーム読み込み中はローディング表示
  if (zoom === null) {
    return (
      <div className={`h-screen flex items-center justify-center ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800 animate-pulse"></div>
          <div className="h-4 w-32 bg-gray-800 rounded mx-auto animate-pulse"></div>
        </div>
      </div>
    );
  }

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
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-end relative">
          {/* 中央揃えタイトル */}
          <h1 className={`absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="sm:hidden bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {t('titleShort')}
            </span>
            <span className="hidden sm:inline bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {t('titleFull')}
            </span>
          </h1>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('addImage')}</span>
            </button>

            <button
              onClick={() => setShowStarStack(true)}
              className={`p-2 sm:p-2.5 rounded-xl transition-all ${
                darkMode
                  ? 'bg-gray-800 hover:bg-gray-700 text-amber-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-amber-600'
              }`}
              title={t('starStack.title')}
            >
              <Sparkles size={18} />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 sm:p-2.5 rounded-xl transition-all ${
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
                nodeRoutines={getRoutinesForNode(node.id)}
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
              <p className="text-lg font-medium">{t('loadingMessage')}</p>
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
                {t('loadingQuote')}
              </p>
              <p className="text-sm mb-6 max-w-lg mx-auto px-4">
                {t('loadingDescription')}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-violet-500/25"
              >
                {t('addFirstImage')}
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
          onRoutineChecked={(color) => setPendingStarColors(prev => [...prev, color])}
          nodeId={editingPageId}
          userId={userId}
          boardId={boardId}
          onImageChange={(newUrl) => {
            const node = nodes.find(n => n.id === editingPageId);
            if (node) {
              updateNodeInHook({ ...node, src: newUrl });
            }
          }}
          onAddFrozenDate={(date) => editingPageId && addFrozenDate(editingPageId, date)}
          onRemoveFrozenDate={(date) => editingPageId && removeFrozenDate(editingPageId, date)}
          clearPercent={editingNode?.clearPercent ?? 0}
          // ルーティン共有機能用（useRoutines経由）
          routines={routines}
          routineNodes={routineNodes}
          pages={pages}
          nodes={nodes}
          onCreateRoutine={(title) => editingPageId && createRoutine(title, editingPageId)}
          onDeleteRoutine={(routineId) => editingPageId && removeRoutineFromNode(routineId, editingPageId)}
          onToggleRoutine={toggleRoutineCheck}
          onUpdateRoutineColor={updateRoutineColor}
          onUpdateRoutineTitle={updateRoutineTitle}
          onUpdateActiveDays={updateRoutineActiveDays}
          onReorderRoutines={(from, to) => editingPageId && reorderRoutinesInNode(editingPageId, from, to)}
          onAddRoutineToNode={(routineId) => editingPageId && addRoutineToNode(routineId, editingPageId)}
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
            title={t('zoom.out')}
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
            title={t('zoom.in')}
          >
            <ZoomIn size={16} className="text-white" />
          </button>
          <span className="text-xs font-medium w-10 text-center text-white">{zoom}%</span>
          <div className="w-px h-5 bg-white/20" />
          {/* スクショ・終了 */}
          <button
            onClick={handleFullscreenDownload}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={t('screenshot')}
          >
            <Download size={16} className="text-white" />
          </button>
          <button
            onClick={exitFullscreen}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title={t('exitFullscreen')}
          >
            <Minimize size={16} className="text-white" />
          </button>
        </div>
      )}

      {showAmbientMode && (
        <AmbientMode
          nodes={nodes}
          pages={pages}
          routines={routines}
          routineNodes={routineNodes}
          getRoutinesForNode={getRoutinesForNode}
          onToggleRoutine={handleToggleRoutine}
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

      {showStarStack && (
        <StarStackModal
          stars={stars}
          isLoading={isStarStackLoading}
          totalStars={totalStars}
          newStarsCount={newStarsCount}
          showCork={showCork}
          addStar={addStar}
          addBatch={addBatch}
          resetStars={resetStars}
          syncWithSupabase={syncWithSupabase}
          onClearPendingColors={() => setPendingStarColors([])}
          darkMode={darkMode}
          onClose={() => setShowStarStack(false)}
        />
      )}

      {/* ヒントUI - 全画面時は非表示、小画面ではZoomControlの上に配置 */}
      {!isFullscreenMode && showHint === true && (
        <div className={`fixed bottom-16 sm:bottom-4 left-4 px-3 sm:px-4 py-2 rounded-xl text-xs flex items-center gap-2 sm:gap-3 z-30 ${
          darkMode ? 'bg-gray-800/90 text-gray-400' : 'bg-white/90 text-gray-500'
        } backdrop-blur-sm`}>
          <div className="hidden sm:block">
            <span className="font-medium">{tHints('prefix')}</span> {tHints('desktop')}
          </div>
          <div className="sm:hidden text-[10px]">
            {tHints('mobile')}
          </div>
          <button
            onClick={() => handleToggleHint(false)}
            className={`p-1 rounded-lg transition-colors ${
              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <EyeOff size={14} />
          </button>
        </div>
      )}

      {!isFullscreenMode && showHint === false && (
        <button
          onClick={() => handleToggleHint(true)}
          className={`fixed bottom-16 sm:bottom-4 left-4 p-2 rounded-xl z-30 ${
            darkMode ? 'bg-gray-800/90 text-gray-400 hover:bg-gray-700' : 'bg-white/90 text-gray-500 hover:bg-gray-200'
          } backdrop-blur-sm transition-colors`}
        >
          <Eye size={16} />
        </button>
      )}
    </div>
  );
}
