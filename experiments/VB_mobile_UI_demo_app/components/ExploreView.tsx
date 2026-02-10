import React from 'react';
import { Search, TrendingUp, Sparkles } from 'lucide-react';

export function ExploreView() {
    const categories = [
        { id: 1, name: 'ゲーム', icon: '🎮', count: 150 },
        { id: 2, name: '音楽', icon: '🎵', count: 89 },
        { id: 3, name: 'アート', icon: '🎨', count: 120 },
        { id: 4, name: 'テクノロジー', icon: '💻', count: 95 },
        { id: 5, name: 'スポーツ', icon: '⚽', count: 67 },
        { id: 6, name: '料理', icon: '🍳', count: 78 },
    ];

    const trending = [
        { id: 1, title: 'トレンドトピック 1', members: '1.2k', online: 345 },
        { id: 2, title: 'トレンドトピック 2', members: '890', online: 234 },
        { id: 3, title: 'トレンドトピック 3', members: '2.5k', online: 567 },
    ];

    return (
        <div className="h-full w-full bg-[#313338] overflow-y-auto">
            <div className="px-4 py-4">
                {/* Search Bar */}
                <div className="relative mb-5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80848e]" />
                    <input
                        type="text"
                        placeholder="探索する..."
                        className="w-full bg-[#1e1f22] text-white text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-[#5865f2]"
                    />
                </div>

                {/* Trending Section */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-[#5865f2]" />
                        <h2 className="text-white font-semibold text-base">トレンド</h2>
                    </div>
                    <div className="space-y-2.5">
                        {trending.map((item) => (
                            <button
                                key={item.id}
                                className="w-full bg-[#2b2d31] active:bg-[#35373c] transition-colors rounded-xl p-3.5 text-left"
                            >
                                <h3 className="text-white font-medium text-sm mb-2">{item.title}</h3>
                                <div className="flex items-center gap-3 text-xs text-[#b5bac1]">
                                    <span>{item.members} メンバー</span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-[#23a559] rounded-full"></span>
                                        {item.online} オンライン
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles className="w-4 h-4 text-[#5865f2]" />
                        <h2 className="text-white font-semibold text-base">カテゴリー</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                className="bg-[#2b2d31] active:bg-[#35373c] transition-colors rounded-xl p-3.5 text-left"
                            >
                                <div className="text-2xl mb-2">{category.icon}</div>
                                <h3 className="text-white font-medium text-sm mb-0.5">{category.name}</h3>
                                <p className="text-xs text-[#b5bac1]">{category.count} サーバー</p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}