import React, { useState } from 'react';
import { Navbar, ScreenTab } from './components/Navbar.js';
import { ReelsFeed } from './components/ReelsFeed.js';
import { Dashboard } from './components/Dashboard.js';
import { ReelAnalysis } from './components/ReelAnalysis.js';
import { AIRecommendation } from './components/AIRecommendation.js';
import { InterestProfile } from './components/InterestProfile.js';
import { LoginPage } from './components/LoginPage.js';
import { VideoUploadModal } from './components/VideoUploadModal.js';
import { useAuth } from './lib/AuthContext.js';
import { api } from './api.js';

function AppInner() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ScreenTab>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('reel') ? 'feed' : 'dashboard';
  });
  const [selectedReelId, setSelectedReelId] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in → show login page
  if (!user) {
    return <LoginPage />;
  }

  // Logged in → full app
  const handleInspectReel = (reelId: string) => {
    setSelectedReelId(reelId);
    setActiveTab('analysis');
  };

  const handleWatchInFeed = (_reelId: string) => {
    setActiveTab('feed');
  };

  const handleNavigateToScreen = (screen: 'feed' | 'analysis' | 'recommendation' | 'profile', reelId?: string) => {
    if (reelId) setSelectedReelId(reelId);
    setActiveTab(screen);
  };

  const handleReset = async () => {
    if (confirm('Clear all your session data (interactions, profiles, recommendations)?')) {
      try {
        setIsResetting(true);
        await api.resetDemo();
        setResetKey(k => k + 1);
        setActiveTab('dashboard');
      } catch (err) {
        alert('Reset failed: ' + err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div key={resetKey} className="min-h-screen bg-[#F7F8FA] text-[#12172B] flex flex-col font-body antialiased">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetDemo={handleReset}
        isResetting={isResetting}
        onOpenUploadModal={() => setIsUploadOpen(true)}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {activeTab === 'dashboard' && <Dashboard onNavigateToScreen={handleNavigateToScreen} />}
        {activeTab === 'feed' && <ReelsFeed onInspectReel={handleInspectReel} />}
        {activeTab === 'analysis' && <ReelAnalysis initialReelId={selectedReelId} onBackToDashboard={() => setActiveTab('dashboard')} onWatchInFeed={handleWatchInFeed} />}
        {activeTab === 'recommendation' && <AIRecommendation onWatchInFeed={handleWatchInFeed} />}
        {activeTab === 'profile' && <InterestProfile />}
      </main>

      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => { setResetKey(k => k + 1); }}
      />

      <footer className="hidden md:block border-t border-[#E4E7EC] bg-[#FFFFFF] py-4 text-center text-xs font-mono text-slate-500">
        TechScroll AI • High-Signal CS Feed
      </footer>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
