import React from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import { Fuel, PlusCircle, Cloud, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-[#08090D]/95 backdrop-blur-md border-b border-white/[0.08] px-3.5 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Journey Status - Guaranteed single-line non-wrapping */}
        <div className="flex items-center gap-2.5 min-w-0">
          <DriveWiseLogo size={36} className="rounded-xl shadow-md shrink-0" />
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wider leading-none">
                DRIVEWISE
              </span>
              {/* Discrete cloud sync / login indicator */}
              {firebaseUser ? (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  title={cloudSyncStatus === 'syncing' ? 'Sincronizando com nuvem' : 'Nuvem Conectada (Google)'}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/25 transition-all"
                >
                  {cloudSyncStatus === 'syncing' ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span className="text-[9px] font-medium leading-none hidden sm:inline">Nuvem</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  title="Conectar com conta Google (Salvar dados na nuvem)"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] text-slate-400 hover:text-emerald-400 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all"
                >
                  <Cloud className="w-3 h-3 text-slate-400" />
                  <span className="text-[9px] font-medium leading-none hidden sm:inline">Salvar</span>
                </button>
              )}

              {/* Plan / Subscription Badge (ADMIN ONLY) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  title={
                    !isSubscriptionSystemOnline
                      ? 'DriveWise PRO (Modo de Testes - Cobrança Offline) • Ver Plano R$ 9,99/mês'
                      : subscription.isSubscribed
                      ? 'DriveWise PRO Ativo'
                      : isTrialActive
                      ? `Período de Testes: ${trialDaysRemaining} dias restantes`
                      : 'Período gratuito expirado • Assine por R$ 9,99/mês'
                  }
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                    !isSubscriptionSystemOnline
                      ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25'
                      : subscription.isSubscribed
                      ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : isTrialActive
                      ? 'text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25'
                      : 'text-rose-300 bg-rose-500/20 border border-rose-500/35 hover:bg-rose-500/30'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[9px] leading-none">
                    {!isSubscriptionSystemOnline
                      ? 'PRO (Beta)'
                      : subscription.isSubscribed
                      ? 'PRO'
                      : isTrialActive
                      ? `10D (${trialDaysRemaining}d)`
                      : 'Assinar'}
                  </span>
                </button>
              )}
            </div>

            {/* Status Pill strictly single line (white-space: nowrap) */}
            <div className="mt-1">
              <button
                type="button"
                onClick={onNavigateToJourney}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors whitespace-nowrap ${
                  isJourneyActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.08] hover:bg-white/[0.1]'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isJourneyActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span className="leading-none">{isJourneyActive ? 'Trabalhando' : 'Jornada encerrada'}</span>
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
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-200 transition-all border border-white/[0.08] flex items-center justify-center"
          >
            <PlusCircle className="w-4 h-4 text-rose-400" />
          </button>

          <button
            type="button"
            onClick={() => setIsFuelModalOpen(true)}
            title="Registrar Abastecimento"
            aria-label="Registrar Abastecimento"
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-200 transition-all border border-white/[0.08] flex items-center justify-center"
          >
            <Fuel className="w-4 h-4 text-amber-400" />
          </button>

          <button
            type="button"
            onClick={onNavigateToProfile}
            title="Meu Perfil"
            aria-label="Meu Perfil"
            className={`w-9 h-9 rounded-xl overflow-hidden active:scale-95 transition-all shrink-0 ${
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
