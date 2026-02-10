import React, { useState } from 'react';
import { Home, Compass, User } from 'lucide-react';
import { TopBar } from './components/TopBar';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ExploreView } from './components/ExploreView';
import { ProfileView } from './components/ProfileView';

type TabType = 'home' | 'explore' | 'profile';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#313338] flex flex-col overflow-hidden relative safe-area-inset">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top Bar - Only show hamburger menu on home tab */}
      <TopBar 
        onMenuClick={() => setSidebarOpen(true)} 
        title={activeTab === 'home' ? 'ホーム' : activeTab === 'explore' ? '探索' : 'プロフィール'}
        showMenuButton={activeTab === 'home'}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'home' && <HomeView />}
        {activeTab === 'explore' && <ExploreView />}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}