import React from 'react';
import { Menu } from 'lucide-react';

interface TopBarProps {
    onMenuClick: () => void;
    title: string;
    showMenuButton?: boolean;
}

export function TopBar({ onMenuClick, title, showMenuButton = true }: TopBarProps) {
    return (
        <header className="bg-[#2b2d31] border-b border-[#1e1f22] px-4 pt-safe pb-3 flex items-center justify-between flex-shrink-0">
            {showMenuButton ? (
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 text-[#b5bac1] active:text-white active:bg-[#35373c] rounded-lg transition-colors"
                    aria-label="メニューを開く"
                >
                    <Menu className="w-6 h-6" />
                </button>
            ) : (
                <div className="w-10" />
            )}

            <h1 className="text-white font-semibold text-base absolute left-1/2 -translate-x-1/2">
                {title}
            </h1>

            <div className="w-10" /> {/* Spacer for centering */}
        </header>
    );
}