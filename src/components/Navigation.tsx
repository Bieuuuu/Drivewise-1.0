import React from 'react';
import { Home, Zap, Navigation as NavigationIcon, BarChart3, CalendarDays, User } from 'lucide-react';
import { useDriveWise } from '../context/DriveWiseContext';

export type TabType = 'home' | 'copilot' | 'journey' | 'reports' | 'history' | 'profile';

interface NavigationProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onChangeTab }) => {
  const { isJourneyActive, lastAnalyzedRide } = useDriveWise();

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'home', label: 'Início', icon: Home },
    { id: 'copilot', label: 'Copiloto', icon: Zap },
    { id: 'journey', label: 'Jornada', icon: NavigationIcon },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'history', label: 'Histórico', icon: CalendarDays },
    { id: 'profile', label: 'Perfil', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-xl border-t border-white/[0.08] pb-safe">
      <div className="max-w-2xl mx-auto px-1 sm:px-3 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          const isJourneyTab = item.id === 'journey';
          const isCopilotTab = item.id === 'copilot';

          return (
            <button
              key={item.id}
              onClick={() => onChangeTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[48px] sm:min-w-[56px] ${
                isActive
                  ? isCopilotTab
                    ? 'text-amber-400 font-semibold'
                    : 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''} ${
                    isCopilotTab && !isActive ? 'text-amber-400/80' : ''
                  }`}
                />

                {/* Pulsing indicator when journey is active */}
                {isJourneyTab && isJourneyActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                )}
                {isJourneyTab && isJourneyActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                )}

                {/* Copilot active alert indicator */}
                {isCopilotTab && lastAnalyzedRide && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                )}
              </div>

              <span className={`text-[10px] sm:text-[11px] mt-1 tracking-tight ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>

              {isActive && (
                <div
                  className={`w-1.5 h-1.5 rounded-full absolute -bottom-0.5 ${
                    isCopilotTab ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
