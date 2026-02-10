'use client';

import { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Check, Square, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Routine, RoutineNode, Page } from '@vision-board/shared/lib';
import { Node } from '@vision-board/supabase/hooks';

interface ShareRoutinePanelProps {
  routines: Record<string, Routine>;
  routineNodes: RoutineNode[];
  pages: Record<string, Page>;
  nodes: Node[];
  currentNodeId: string;
  onAddRoutine: (routineId: string) => void;
  onClose: () => void;
  darkMode: boolean;
}

interface NodeWithRoutines {
  nodeId: string;
  title: string;
  routines: Routine[];
}

export const ShareRoutinePanel = ({
  routines,
  routineNodes,
  pages,
  nodes,
  currentNodeId,
  onAddRoutine,
  onClose,
  darkMode,
}: ShareRoutinePanelProps) => {
  const t = useTranslations('pageEditor.routines');
  const tCommon = useTranslations('common');

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedRoutineIds, setSelectedRoutineIds] = useState<Set<string>>(new Set());

  // 現在のノードに紐づいているルーティンIDを取得
  const currentRoutineIds = useMemo(() => {
    return new Set(
      routineNodes
        .filter(rn => rn.nodeId === currentNodeId)
        .map(rn => rn.routineId)
    );
  }, [routineNodes, currentNodeId]);

  // 無題のパターンを検出するヘルパー関数
  const isUntitledPattern = useCallback((title: string): boolean => {
    // 各言語の「無題」パターン
    const patterns = [
      /^無題/, // 日本語
      /^Untitled/i, // 英語
      /^Sin título/i, // スペイン語
      /^제목 없음/, // 韓国語
      /^无标题/, // 中国語
    ];
    return patterns.some(p => p.test(title));
  }, []);

  // 無題タイトルから番号を抽出
  const extractUntitledNumber = useCallback((title: string): number => {
    const match = title.match(/\((\d+)\)/);
    return match ? parseInt(match[1]) : 0;
  }, []);

  // 他のノードとそのルーティンを取得（ソート済み）
  const otherNodesWithRoutines = useMemo((): NodeWithRoutines[] => {
    return nodes
      .filter(n => n.id !== currentNodeId && n.type === 'image')
      .map(node => {
        const pageTitle = pages[node.id]?.title || tCommon('untitled');

        // このノードに紐づくルーティン（現在のノードに既にあるものは除外）
        const nodeRoutines = routineNodes
          .filter(rn => rn.nodeId === node.id && !currentRoutineIds.has(rn.routineId))
          .map(rn => routines[rn.routineId])
          .filter(Boolean);

        return {
          nodeId: node.id,
          title: pageTitle,
          routines: nodeRoutines,
        };
      })
      .filter(item => item.routines.length > 0)
      .sort((a, b) => {
        const isUntitledA = isUntitledPattern(a.title);
        const isUntitledB = isUntitledPattern(b.title);

        // タイトル付きを上に、無題を下に
        if (isUntitledA && !isUntitledB) return 1;
        if (!isUntitledA && isUntitledB) return -1;

        // 無題同士は番号順
        if (isUntitledA && isUntitledB) {
          const numA = extractUntitledNumber(a.title);
          const numB = extractUntitledNumber(b.title);
          return numA - numB;
        }

        // タイトル付き同士はアルファベット順
        return a.title.localeCompare(b.title);
      });
  }, [nodes, currentNodeId, pages, routineNodes, routines, currentRoutineIds, tCommon, isUntitledPattern, extractUntitledNumber]);

  // ノードの展開/折りたたみをトグル
  const toggleNodeExpand = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  }, []);

  // ルーティンの選択をトグル
  const toggleRoutineSelect = useCallback((routineId: string) => {
    setSelectedRoutineIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(routineId)) {
        newSet.delete(routineId);
      } else {
        newSet.add(routineId);
      }
      return newSet;
    });
  }, []);

  // 完了ボタン押下
  const handleDone = useCallback(() => {
    selectedRoutineIds.forEach(routineId => {
      onAddRoutine(routineId);
    });
    onClose();
  }, [selectedRoutineIds, onAddRoutine, onClose]);

  const bgColor = darkMode ? 'bg-gray-800' : 'bg-white';
  const borderColor = darkMode ? 'border-gray-700' : 'border-gray-200';
  const textColor = darkMode ? 'text-gray-200' : 'text-gray-800';
  const subTextColor = darkMode ? 'text-gray-400' : 'text-gray-500';
  const hoverBg = darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

  return (
    <div className={`mt-4 p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-medium ${textColor}`}>
          {t('sharePanel.title')}
        </h3>
        <button
          onClick={onClose}
          className={`p-1 rounded ${hoverBg} ${subTextColor}`}
        >
          <X size={16} />
        </button>
      </div>

      {/* ノード一覧 */}
      {otherNodesWithRoutines.length === 0 ? (
        <p className={`text-sm ${subTextColor}`}>
          {t('sharePanel.noOtherGoals')}
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {otherNodesWithRoutines.map(({ nodeId, title, routines: nodeRoutines }) => (
            <div key={nodeId}>
              {/* ノードヘッダー（アコーディオン） */}
              <button
                onClick={() => toggleNodeExpand(nodeId)}
                className={`w-full flex items-center gap-2 p-2 rounded ${hoverBg} ${textColor}`}
              >
                {expandedNodes.has(nodeId) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span className="text-sm font-medium truncate">{title}</span>
                <span className={`text-xs ${subTextColor} ml-auto`}>
                  {nodeRoutines.length}
                </span>
              </button>

              {/* ルーティン一覧（展開時） */}
              {expandedNodes.has(nodeId) && (
                <div className="ml-6 mt-1 space-y-1">
                  {nodeRoutines.map(routine => (
                    <button
                      key={routine.id}
                      onClick={() => toggleRoutineSelect(routine.id)}
                      className={`w-full flex items-center gap-2 p-2 rounded ${hoverBg} ${textColor}`}
                    >
                      {selectedRoutineIds.has(routine.id) ? (
                        <Check size={16} className="text-violet-500" />
                      ) : (
                        <Square size={16} className={subTextColor} />
                      )}
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: routine.color }}
                      />
                      <span className="text-sm truncate">{routine.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* フッター */}
      {otherNodesWithRoutines.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleDone}
            disabled={selectedRoutineIds.size === 0}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedRoutineIds.size > 0
                ? 'bg-violet-500 text-white hover:bg-violet-600'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {t('sharePanel.done')}
          </button>
        </div>
      )}
    </div>
  );
};
