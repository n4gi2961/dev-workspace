import React from 'react';
import { X, Plus } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const boards = [
        { id: 1, name: 'ボード 01', color: '#5865f2', noteCount: 12 },
        { id: 2, name: 'ボード 02', color: '#57f287', noteCount: 8 },
        { id: 3, name: 'ボード 03', color: '#fee75c', noteCount: 15 },
        { id: 4, name: 'ボード 04', color: '#eb459e', noteCount: 6 },
        { id: 5, name: 'ボード 05', color: '#ed4245', noteCount: 20 },
        { id: 6, name: 'ボード 06', color: '#00a8fc', noteCount: 4 },
        { id: 7, name: 'ボード 07', color: '#9b59b6', noteCount: 10 },
        { id: 8, name: 'ボード 08', color: '#1abc9c', noteCount: 7 },
    ];

    return (
        <aside
            className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-[#2b2d31] z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
        >
            <div className="flex flex-col h-full">
                {/* Sidebar Header */}
                <div className="bg-[#1e1f22] px-4 py-4 pt-safe flex items-center justify-between border-b border-[#1e1f22] flex-shrink-0">
                    <h2 className="text-white font-semibold text-lg">ボード一覧</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-[#b5bac1] hover:text-white active:bg-[#35373c] rounded-full transition-colors"
                        aria-label="サイドバーを閉じる"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Boards List */}
                    <div className="py-3">
                        {boards.map((board, index) => (
                            <button
                                key={board.id}
                                className="w-full px-4 py-3 flex items-center gap-4 active:bg-[#35373c] transition-colors"
                            >
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-md"
                                    style={{ backgroundColor: board.color }}
                                >
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="text-[#f2f3f5] font-medium text-base">
                                        {board.name}
                                    </h3>
                                    <p className="text-[#b5bac1] text-sm">
                                        {board.noteCount} メモ
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Add Board Button */}
                <div className="p-4 pb-safe border-t border-[#1e1f22] flex-shrink-0">
                    <button className="w-full bg-[#5865f2] active:bg-[#4752c4] text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-lg">
                        <Plus className="w-5 h-5" />
                        新しいボードを作成
                    </button>
                </div>
            </div>
        </aside>
    );
}