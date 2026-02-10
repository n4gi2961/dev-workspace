import React from 'react';
import { Edit, Share2, Bell, Shield, Eye, Palette } from 'lucide-react';

export function ProfileView() {
    const stats = [
        { label: 'フレンド', value: '42' },
        { label: 'サーバー', value: '8' },
        { label: 'メッセージ', value: '1.2k' },
    ];

    const settings = [
        { id: 1, icon: Edit, label: 'プロフィールを編集', color: '#5865f2' },
        { id: 2, icon: Palette, label: 'テーマ設定', color: '#57f287' },
        { id: 3, icon: Bell, label: '通知設定', color: '#fee75c' },
        { id: 4, icon: Shield, label: 'プライバシー設定', color: '#eb459e' },
        { id: 5, icon: Eye, label: 'アクティビティ設定', color: '#ed4245' },
        { id: 6, icon: Share2, label: 'プロフィールを共有', color: '#00a8fc' },
    ];

    return (
        <div className="h-full w-full bg-[#313338] overflow-y-auto">
            <div className="w-full">
                {/* Banner */}
                <div className="h-24 bg-gradient-to-r from-[#5865f2] to-[#7289da]"></div>

                {/* Profile Section */}
                <div className="px-4 pb-6">
                    {/* Avatar */}
                    <div className="relative -mt-12 mb-3">
                        <div className="w-20 h-20 rounded-full bg-[#2b2d31] border-[6px] border-[#313338] flex items-center justify-center">
                            <span className="text-white text-2xl font-bold">U</span>
                        </div>
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#23a559] rounded-full border-[3px] border-[#313338]"></div>
                    </div>

                    {/* User Info */}
                    <div className="mb-5">
                        <h1 className="text-white text-xl font-bold mb-0.5">ユーザー名</h1>
                        <p className="text-[#b5bac1] text-xs mb-3">#0000</p>
                        <p className="text-[#b5bac1] text-sm">
                            こんにちは！私のプロフィールへようこそ 👋
                        </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2.5 mb-5">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="bg-[#2b2d31] rounded-xl p-3 text-center"
                            >
                                <p className="text-white text-lg font-bold mb-0.5">{stat.value}</p>
                                <p className="text-[#b5bac1] text-xs">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Settings */}
                    <div className="space-y-2">
                        {settings.map((setting) => {
                            const Icon = setting.icon;
                            return (
                                <button
                                    key={setting.id}
                                    className="w-full bg-[#2b2d31] active:bg-[#35373c] transition-colors rounded-xl p-3.5 flex items-center gap-3 text-left"
                                >
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ backgroundColor: `${setting.color}20` }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: setting.color }} />
                                    </div>
                                    <span className="text-white font-medium text-sm">{setting.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}