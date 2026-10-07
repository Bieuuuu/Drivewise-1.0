import React from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import { Fuel, PlusCircle, Cloud, CheckCircle2, RefreshCw } from 'lucide-react';
import { DriveWiseLogo } from './DriveWiseLogo';
import { UserAvatar } from './UserAvatar';

interface HeaderProps {
  onNavigateToJourney: () => void;
  onNavigateToProfile: () => void;
  onOpenLanding?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateToJourney,
  onNavigateToProfile,
  activeTab,
}) => {
  const {
    isJourneyActive,
    user,
    setIsExpenseModalOpen,
    setIsFuelModalOpen,
    firebaseUser,
    cloudSyncStatus,
    setIsAuthModalOpen,
    subscription,
    isSubscriptionSystemOnline,
    isTrialActive,
    trialDaysRemaining,
    setIsSubscriptionModalOpen,
    isAdmin,
  } = useDriveWise();

  const isProfileActive = activeTab === 'profile';

  return (
    <header className="sticky top-0 z-40 bg-[#08090D]/95 backdrop-blur-xl border-b border-white/[0.08] px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Journey Status - Guaranteed single-line non-wrapping */}
        <div className="flex items-center gap-2.5 min-w-0">
          <DriveWiseLogo size={36} className="rounded-xl shadow-md shrink-0" />
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white text-sm tracking-tight leading-none">
                DriveWise
              </span>

              {/* Discrete cloud sync / login action */}
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  title={
                    cloudSyncStatus === 'syncing'
                      ? 'Sincronizando com nuvem'
                      : 'Nuvem conectada'
                  }
                  className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                >
                  {cloudSyncStatus === 'syncing' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span className="text-[10px] font-medium leading-none hidden sm:inline">
                    Nuvem
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  title="Conectar com conta Google"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <Cloud className="w-3 h-3" />
                  <span className="text-[10px] font-medium leading-none hidden sm:inline">
                    Salvar
                  </span>
                </button>
              )}

              {/* Plan / Subscription Action (ADMIN ONLY) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] font-mono-num font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                  <span>
                    {!isSubscriptionSystemOnline
                      ? 'PRO Beta'
                      : subscription.isSubscribed
                      ? 'PRO'
                      : isTrialActive
                      ? `${trialDaysRemaining}d`
                      : 'Assinar'}
                  </span>
                </button>
              )}
            </div>

            {/* Interactive Journey Status Trigger */}
            <div className="mt-1">
              <button
                type="button"
                onClick={onNavigateToJourney}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isJourneyActive
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isJourneyActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                  }`}
                />
                <span className="leading-none">
                  {isJourneyActive ? 'Turno ativo' : 'Turno encerrado'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions & Profile - Harmonized Ergonomic Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            title="Registrar Despesa"
            aria-label="Registrar Despesa"
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-200 transition-all border border-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-rose-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsFuelModalOpen(true)}
            title="Registrar Abastecimento"
            aria-label="Registrar Abastecimento"
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-200 transition-all border border-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <Fuel className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={onNavigateToProfile}
            title="Meu Perfil"
            aria-label="Meu Perfil"
            className={`w-9 h-9 rounded-xl overflow-hidden active:scale-95 transition-all shrink-0 cursor-pointer ${
              isProfileActive
                ? 'ring-2 ring-emerald-400 ring-offset-1 ring-offset-black'
                : 'border border-white/[0.14] hover:border-emerald-500/60'
            }`}
          >
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          </button>
        </div>
      </div>
    </header>
  );
};
