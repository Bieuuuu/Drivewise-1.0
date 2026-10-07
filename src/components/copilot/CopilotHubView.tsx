import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Sliders,
  TrendingUp,
  Layers,
  Shield,
  ChevronRight,
  Calculator,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { formatCurrency } from '../../utils/calculations';
import { nativeBridge, isNativeAndroid } from '../../services/nativeBridge';
import { CopilotAnalyticsView } from './CopilotAnalyticsView';
import { CopilotSettingsView } from './CopilotSettingsView';

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const CopilotHubView: React.FC = () => {
  const {
    lastAnalyzedRide,
    setIsRideAnalysisModalOpen,
    setIsSimulatorOpen,
    setIsOnboardingOpen,
    setIsOverlayPermissionModalOpen,
    hasOverlayPermission,
    hasAccessibilityPermission,
    grantOverlayPermission,
    grantAccessibilityPermission,
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
    <div className="space-y-4 pb-24 pt-3 px-4 max-w-2xl mx-auto">
      {/* Top Control Surface */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="bg-[#0B0E14] border border-white/[0.09] rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/50"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-display text-base sm:text-lg font-bold text-white tracking-tight">
                Copiloto e Calculadora de Corridas
              </h1>
              <p className="text-xs text-slate-400">
                Semáforo de lucro líquido real por KM e por hora
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-hub-onboarding"
              onClick={() => setIsOnboardingOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Calibrar</span>
            </button>
            <button
              id="btn-hub-simulator"
              onClick={() => setIsSimulatorOpen(true)}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calcular / Lançar</span>
            </button>
          </div>
        </div>

        {/* Quick Mode Controls */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-white/[0.06]">
          <button
            onClick={toggleOverlay}
            className={`min-h-[42px] p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
              overlayPref.isEnabled && hasOverlayPermission
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:bg-white/[0.06]'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Bolha Flutuante</span>
            </span>
            <span
              className={`text-[11px] font-mono-num font-semibold ${
                overlayPref.isEnabled && hasOverlayPermission
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {overlayPref.isEnabled && hasOverlayPermission ? 'Ativa' : 'Ativar'}
            </span>
          </button>

          <button
            onClick={toggleDrivingMode}
            className="min-h-[42px] p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] text-slate-300 text-xs font-medium flex items-center justify-between transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5 truncate">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Modo Direção</span>
            </span>
            <span className="text-[11px] text-amber-400 font-semibold">Abrir</span>
          </button>
        </div>

        {/* Android System Overlay Permission & Restricted Settings Unlock Bar */}
        <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  hasOverlayPermission ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {hasOverlayPermission
                  ? 'Bolha e Calculadora Flutuante liberadas sobre Uber, 99 e InDrive'
                  : 'Libere "Sobrepor a outros apps" para usar a bolha fora do app'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isNativeAndroid() && hasOverlayPermission && (
                <button
                  onClick={grantAccessibilityPermission}
                  className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                    hasAccessibilityPermission
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/40 text-sky-300'
                  }`}
                >
                  {hasAccessibilityPermission ? 'Radar Auto ON' : 'Ativar Radar Auto'}
                </button>
              )}
              {isNativeAndroid() && hasOverlayPermission && (
                <button
                  onClick={() => nativeBridge.launchFloatingPipWindowNow()}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
                >
                  Abrir HUD
                </button>
              )}
              <button
                onClick={() => setIsOverlayPermissionModalOpen(true)}
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Permissões
              </button>
            </div>
          </div>

          {!hasOverlayPermission && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => nativeBridge.openAppDetailsSettings()}
                className="min-h-[40px] py-2 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span>1. Desbloquear nos 3 Pontinhos (⋮)</span>
              </button>
              <button
                type="button"
                onClick={grantOverlayPermission}
                className="min-h-[40px] py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>2. Ativar "Sobrepor a outros apps"</span>
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Last Analyzed Ride Quick Bar */}
      {lastAnalyzedRide && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setIsRideAnalysisModalOpen(true)}
          className="bg-[#0B0E14] border border-white/[0.08] hover:border-white/[0.15] p-3.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`text-xs font-mono-num font-bold shrink-0 ${
                lastAnalyzedRide.scoreTier === 'Excelente'
                  ? 'text-emerald-400'
                  : lastAnalyzedRide.scoreTier === 'Boa'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              Nota {lastAnalyzedRide.score}
            </span>
            <span aria-hidden="true" className="text-slate-600">
              ·
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs">
                {renderPlatformDot(lastAnalyzedRide.platform)}
                <span className="font-semibold text-white truncate">{lastAnalyzedRide.platform}</span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-slate-300 font-mono-num">
                  {formatCurrency(lastAnalyzedRide.offeredValue)}
                </span>
                <span aria-hidden="true" className="text-slate-600">
                  ·
                </span>
                <span className="text-emerald-400 font-medium font-mono-num">
                  Lucro líq. {formatCurrency(lastAnalyzedRide.netProfit)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {lastAnalyzedRide.pickupAddress} → {lastAnalyzedRide.dropoffAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-300 font-medium shrink-0 ml-2">
            <span>Ficha</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </motion.div>
      )}

      {/* Segmented Control Switcher */}
      <div className="flex items-center p-1 bg-[#0B0E14] border border-white/[0.08] rounded-xl">
        <button
          onClick={() => setActiveSection('analytics')}
          className={`flex-1 min-h-[38px] py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
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
          className={`flex-1 min-h-[38px] py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
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
