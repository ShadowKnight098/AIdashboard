import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[10px] border border-[#E4E7EC] p-6 text-center space-y-4 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-[#C98A2C] flex items-center justify-center mx-auto text-lg font-bold">
              !
            </div>
            <h2 className="text-base font-bold text-[#12172B]">Something encountered a problem</h2>
            <p className="text-xs font-mono text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200 text-left overflow-x-auto">
              {this.state.error?.message || 'Unknown error'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary px-4 py-2 text-xs"
            >
              Reload Platform
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

  // Show loading spinner while checking auth (max 2.5s)
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#E4E7EC] border-t-[#3654FF] rounded-full animate-spin mx-auto" />
          <p className="font-mono text-xs text-slate-500">Connecting to TechScroll...</p>
        </div>
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
        {activeTab === 'analysis' && (
          <ReelAnalysis
            initialReelId={selectedReelId}
            onBackToDashboard={() => setActiveTab('dashboard')}
            onWatchInFeed={handleWatchInFeed}
          />
        )}
        {activeTab === 'recommendation' && <AIRecommendation onWatchInFeed={handleWatchInFeed} />}
        {activeTab === 'profile' && <InterestProfile />}
      </main>

      <VideoUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={() => {
          setResetKey(k => k + 1);
        }}
      />

      <footer className="hidden md:block border-t border-[#E4E7EC] bg-[#FFFFFF] py-4 text-center text-xs font-mono text-slate-500">
        TechScroll AI • High-Signal CS Feed
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
