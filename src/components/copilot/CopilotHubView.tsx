import React, { useState } from 'react';
import {
  Zap,
  Sliders,
  TrendingUp,
  Layers,
  Shield,
  ChevronRight,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { formatCurrency } from '../../utils/calculations';
import { nativeBridge, isNativeAndroid } from '../../services/nativeBridge';
import { CopilotAnalyticsView } from './CopilotAnalyticsView';
import { CopilotSettingsView } from './CopilotSettingsView';

export const CopilotHubView: React.FC = () => {
  const {
    lastAnalyzedRide,
    setIsRideAnalysisModalOpen,
    setIsSimulatorOpen,
    setIsOnboardingOpen,
    setIsOverlayPermissionModalOpen,
    hasOverlayPermission,
    overlayPref,
    toggleOverlay,
    toggleDrivingMode,
  } = useDriveWise();

  const [activeSection, setActiveSection] = useState<'analytics' | 'settings'>('analytics');

  const renderPlatformDot = (platform: string) => {
    if (platform === 'Uber') return <span className="w-2 h-2 rounded-full bg-white shrink-0" />;
    if (platform === '99') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
    if (platform === 'InDrive') return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />;
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-2xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/40">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Copiloto & Calculadora de Corridas
              </h1>
              <p className="text-xs text-slate-400">
                Semáforo de lucro líquido real por KM e por hora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-hub-onboarding"
              onClick={() => setIsOnboardingOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-emerald-400 text-xs font-bold transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Calibrar</span>
            </button>
            <button
              id="btn-hub-simulator"
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calcular / Lançar</span>
            </button>
          </div>
        </div>

        {/* Quick Mode Controls */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/[0.06]">
          <button
            onClick={toggleOverlay}
            className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
              overlayPref.isEnabled && hasOverlayPermission
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-white/[0.03] border-white/[0.06] text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bolha Flutuante</span>
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                overlayPref.isEnabled && hasOverlayPermission
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'bg-white/[0.08] text-slate-400'
              }`}
            >
              {overlayPref.isEnabled && hasOverlayPermission ? 'ATIVA' : 'ATIVAR'}
            </span>
          </button>

          <button
            onClick={toggleDrivingMode}
            className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo direção</span>
            </span>
            <span className="text-[10px] text-amber-400 font-medium">ABRIR</span>
          </button>
        </div>

        {/* Android System Overlay Permission Bar */}
        <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                hasOverlayPermission ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {hasOverlayPermission
                ? 'Bolha & Calculadora Flutuante liberadas sobre Uber, 99 e InDrive'
                : 'Libere "Sobrepor a outros apps" para usar a bolha flutuante fora do app'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isNativeAndroid() && hasOverlayPermission && (
              <button
                onClick={() => nativeBridge.launchFloatingPipWindowNow()}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold cursor-pointer"
              >
                Abrir HUD
              </button>
            )}
            <button
              onClick={() => setIsOverlayPermissionModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 text-[11px] font-bold cursor-pointer"
            >
              Permissões
            </button>
          </div>
        </div>
      </div>

      {/* Last Analyzed Ride Quick Bar */}
      {lastAnalyzedRide && (
        <div
          onClick={() => setIsRideAnalysisModalOpen(true)}
          className="bg-[#0C0C0D] border border-white/[0.08] hover:border-white/[0.14] p-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                lastAnalyzedRide.scoreTier === 'Excelente'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : lastAnalyzedRide.scoreTier === 'Boa'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              {lastAnalyzedRide.score}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                {renderPlatformDot(lastAnalyzedRide.platform)}
                <span className="font-semibold text-white truncate">{lastAnalyzedRide.platform}</span>
                <span className="text-slate-400 font-mono-num">
                  {formatCurrency(lastAnalyzedRide.offeredValue)}
                </span>
                <span className="text-emerald-400 font-medium font-mono-num">
                  (Lucro líq.: {formatCurrency(lastAnalyzedRide.netProfit)})
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {lastAnalyzedRide.pickupAddress} → {lastAnalyzedRide.dropoffAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-amber-400 font-medium shrink-0 ml-2">
            <span>Ficha</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Subnavigation Switcher */}
      <div className="flex items-center p-1 bg-[#0C0C0D] border border-white/[0.08] rounded-xl">
        <button
          onClick={() => setActiveSection('analytics')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeSection === 'analytics'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Relatórios e histórico</span>
        </button>

        <button
          onClick={() => setActiveSection('settings')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            activeSection === 'settings'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Critérios e custos</span>
        </button>
      </div>

      {/* Render Subview */}
      {activeSection === 'analytics' ? <CopilotAnalyticsView /> : <CopilotSettingsView />}
    </div>
  );
};
