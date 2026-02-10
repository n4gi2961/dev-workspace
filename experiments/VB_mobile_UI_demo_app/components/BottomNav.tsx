import React from 'react';
import { Home, Compass, User } from 'lucide-react';

type TabType = 'home' | 'explore' | 'profile';

interface BottomNavProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const tabs = [
        { id: 'home' as TabType, icon: Home, label: 'ホーム' },
        { id: 'explore' as TabType, icon: Compass, label: '探索' },
        { id: 'profile' as TabType, icon: User, label: 'プロフィール' },
    ];

    return (
        <nav className="bg-[#2b2d31] border-t border-[#1e1f22] px-2 pb-safe pt-2 flex-shrink-0">
            <div className="flex justify-around items-center">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex flex-col items-center gap-1 py-1.5 px-6 rounded-xl transition-all ${isActive ? 'text-white' : 'text-[#80848e]'
                                }`}
                            aria-label={tab.label}
                        >
                            <Icon className={`w-6 h-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
                            <span className={`text-[10px] ${isActive ? 'font-medium' : ''}`}>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}