import React from 'react';
import { PlaySquare, LayoutDashboard, Binary, Sparkles, BrainCircuit, RotateCcw, UploadCloud, LogOut } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.js';

export type ScreenTab = 'feed' | 'dashboard' | 'analysis' | 'recommendation' | 'profile';

interface NavbarProps {
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  onOpenUploadModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onResetDemo, isResetting, onOpenUploadModal }) => {
  const { displayName, signOut } = useAuth();

  const tabs = [
    { id: 'dashboard' as ScreenTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'feed' as ScreenTab, label: 'Feed', icon: PlaySquare },
    { id: 'analysis' as ScreenTab, label: 'Analysis', icon: Binary },
    { id: 'recommendation' as ScreenTab, label: 'AI Recs', icon: Sparkles },
    { id: 'profile' as ScreenTab, label: 'Profile', icon: BrainCircuit },
  ];

  return (
    <>
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#E4E7EC] bg-[#FFFFFF]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 sm:h-15 flex items-center justify-between">
          <div onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 cursor-pointer select-none">
            <div className="w-7 h-7 rounded-[6px] bg-[#3654FF] flex items-center justify-center text-white font-display font-bold text-sm shadow-sm">
              T
            </div>
            <span className="font-display font-bold text-base tracking-tight text-[#12172B]">
              TechScroll<span className="text-[#3654FF]"> AI</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-medium transition-all ${
                    isActive ? 'bg-[#12172B] text-white shadow-sm' : 'text-slate-600 hover:text-[#12172B] hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Top Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1 text-xs text-[#3654FF] bg-[#F0F4FF] hover:bg-indigo-100 active:scale-95 border border-[#3654FF]/30 px-2.5 py-1.5 rounded-[6px] font-medium transition-all"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
            <button
              onClick={onResetDemo}
              disabled={isResetting}
              title="Reset session data"
              className="flex items-center gap-1 text-xs text-slate-600 bg-[#F7F8FA] border border-[#E4E7EC] px-2 py-1.5 rounded-[6px] font-mono hover:bg-slate-100 active:scale-95 transition-all"
            >
              <RotateCcw className={`w-3 h-3 ${isResetting ? 'animate-spin text-[#3654FF]' : ''}`} />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-[#E4E7EC]">
              <span className="text-xs font-medium text-[#12172B] max-w-[90px] truncate hidden lg:inline">
                {displayName}
              </span>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 rounded-[4px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Mobile Bottom Navigation Bar (App Bar) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-lg border-t border-[#E4E7EC] px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-[6px] transition-all ${
                isActive
                  ? 'text-[#3654FF] font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className={`p-1 rounded-full ${isActive ? 'bg-[#3654FF]/10' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
