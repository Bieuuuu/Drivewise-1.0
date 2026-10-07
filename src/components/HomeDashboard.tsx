import React from 'react';
import { motion } from 'motion/react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  getMetricsForDate,
} from '../utils/calculations';
import {
  Play,
  ArrowRight,
  Target,
  Sparkles,
  Gauge,
  CheckCircle2,
  Calculator,
  Layers,
  Fuel,
  PlusCircle,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';
import { isNativeAndroid, nativeBridge } from '../services/nativeBridge';

interface HomeDashboardProps {
  onStartOrViewJourney: () => void;
  onNavigateToReports: () => void;
  onNavigateToHistory: () => void;
  onNavigateToCopilot?: () => void;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartOrViewJourney,
  onNavigateToCopilot,
}) => {
  const {
    user,
    sessions,
    expenses,
    activeSession,
    isJourneyActive,
    elapsedSeconds,
    currentGpsDistance,
    currentDateStr,
    lastAnalyzedRide,
    setIsSimulatorOpen,
    setIsRideAnalysisModalOpen,
    setIsOnboardingOpen,
    setIsExpenseModalOpen,
    setIsFuelModalOpen,
    setIsOverlayPermissionModalOpen,
    hasOverlayPermission,
    grantOverlayPermission,
    overlayPref,
    toggleOverlay,
    toggleDrivingMode,
    isMinimalistMode,
    firebaseUser,
    activeVehicleProfile,
    decisionRules,
  } = useDriveWise();

  // Metrics for today (completed sessions + expenses)
  const todayMetrics = getMetricsForDate(sessions, expenses, currentDateStr);

  // Include live active shift earnings, distance, duration, and estimated fuel cost in real time!
  const liveMinutes = isJourneyActive ? Math.floor(elapsedSeconds / 60) : 0;
  const activeShiftIncome = activeSession ? activeSession.income || 0 : 0;
  const activeShiftFuelCost = isJourneyActive
    ? (currentGpsDistance / (user.avgConsumptionKmPerLiter || 11.5)) * (user.avgFuelPrice || 5.89)
    : 0;

  const combinedDurationMinutes = todayMetrics.totalDurationMinutes + liveMinutes;
  const combinedDistanceKm =
    todayMetrics.totalDistanceKm + (isJourneyActive ? currentGpsDistance : 0);
  const totalIncomeToday = todayMetrics.totalIncome + activeShiftIncome;
  const totalCostsToday = todayMetrics.totalExpenses + activeShiftFuelCost;
  const netProfitToday = totalIncomeToday - totalCostsToday;

  // Hourly rate - exclude outlier if less than 2 minutes
  const hourlyRateToday =
    combinedDurationMinutes >= 2 ? (totalIncomeToday / combinedDurationMinutes) * 60 : 0;

  // Daily goal progress
  const dailyGoal = user.dailyGoal || 300;
  const goalProgressPercent =
    dailyGoal > 0 ? Math.min(100, Math.round((totalIncomeToday / dailyGoal) * 100)) : 0;

  // Platform breakdown for today (including active session)
  const platformBreakdown = {
    Uber:
      todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.Uber || 0), 0) +
      (activeSession?.platformEarnings?.Uber || 0),
    '99':
      todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.['99'] || 0), 0) +
      (activeSession?.platformEarnings?.['99'] || 0),
    InDrive:
      todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.InDrive || 0), 0) +
      (activeSession?.platformEarnings?.InDrive || 0),
  };

  // Real calibrated cost per km & target
  const costPerKm = activeVehicleProfile.manualCostPerKm || decisionRules.costPerKm || 0.75;
  const minNetPerKm = decisionRules.minNetPerKm || 1.8;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-4 pb-24 pt-3 px-4 max-w-xl mx-auto">
      {/* 1. Greeting & Calibrated Telemetry Strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex items-start justify-between gap-3 pt-1"
      >
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
            {getGreeting()},{' '}
            {user.name ||
              firebaseUser?.displayName ||
              firebaseUser?.email?.split('@')[0] ||
              'Motorista'}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-1">
            <span>Custo R$ {costPerKm.toFixed(2)}/km</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">
              Meta R$ {minNetPerKm.toFixed(2)}/km líq
            </span>
            {isMinimalistMode && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">Modo essencial</span>
              </>
            )}
          </div>
        </div>

        {!isMinimalistMode && (
          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOnboardingOpen(true)}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calibrar</span>
          </motion.button>
        )}
      </motion.div>

      {/* 2. Focal Anchor: Today's Real Net Profit Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.04, ease: EASE_OUT }}
        className="bg-[#0B0E14] border border-white/[0.09] rounded-2xl p-5 shadow-xl shadow-black/50"
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-medium text-slate-400">
            Lucro líquido de hoje (descontando combustível e custos)
          </span>
        </div>

        <div className="flex items-baseline gap-2.5 mb-3">
          <motion.span
            key={netProfitToday.toFixed(2)}
            initial={{ opacity: 0.7, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono-num ${
              netProfitToday >= 0 ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netProfitToday)}
          </motion.span>
        </div>

        {/* Clean Unboxed Metadata Row: Gross & Costs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
          <span>
            Faturamento bruto:{' '}
            <strong className="font-semibold text-emerald-400 font-mono-num">
              {formatCurrency(totalIncomeToday)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Custos e combustível:{' '}
            <strong
              className={`font-semibold font-mono-num ${
                totalCostsToday > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {formatCurrency(totalCostsToday)}
            </strong>
          </span>
        </div>

        {/* Platform breakdown */}
        {(platformBreakdown.Uber > 0 ||
          platformBreakdown['99'] > 0 ||
          platformBreakdown.InDrive > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-white/[0.05]">
            {platformBreakdown.Uber > 0 && (
              <span className="inline-flex items-center gap-1.5 font-mono-num">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Uber {formatCurrency(platformBreakdown.Uber)}</span>
              </span>
            )}
            {platformBreakdown['99'] > 0 && (
              <span className="inline-flex items-center gap-1.5 font-mono-num">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>99 {formatCurrency(platformBreakdown['99'])}</span>
              </span>
            )}
            {platformBreakdown.InDrive > 0 && (
              <span className="inline-flex items-center gap-1.5 font-mono-num">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>InDrive {formatCurrency(platformBreakdown.InDrive)}</span>
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* 3. Tabular Telemetry Strip (Time · Distance · Hourly Rate) */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08, ease: EASE_OUT }}
        className="grid grid-cols-3 divide-x divide-white/[0.06] bg-[#0B0E14] border border-white/[0.08] rounded-xl py-3.5 px-2 text-center"
      >
        <div className="px-2">
          <span className="text-[11px] text-slate-400 block mb-0.5">Tempo hoje</span>
          <span className="text-xs sm:text-sm font-bold text-white font-mono-num truncate block">
            {formatDuration(combinedDurationMinutes)}
          </span>
        </div>
        <div className="px-2">
          <span className="text-[11px] text-slate-400 block mb-0.5">Distância</span>
          <span className="text-xs sm:text-sm font-bold text-white font-mono-num truncate block">
            {formatKm(combinedDistanceKm)}
          </span>
        </div>
        <div className="px-2">
          <span className="text-[11px] text-slate-400 block mb-0.5">Média/hora</span>
          <span
            className={`text-xs sm:text-sm font-bold font-mono-num truncate block ${
              combinedDurationMinutes >= 2 && hourlyRateToday > 0
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {combinedDurationMinutes >= 2 && hourlyRateToday > 0
              ? `${formatCurrency(hourlyRateToday)}/h`
              : '—'}
          </span>
        </div>
      </motion.div>

      {/* 4. Daily Goal Progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12, ease: EASE_OUT }}
        className="bg-[#0B0E14] border border-white/[0.08] rounded-xl p-4"
      >
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Meta diária</span>
          </span>
          <span className="font-mono-num text-slate-300 text-xs">
            <strong className="text-white font-bold">{formatCurrency(totalIncomeToday)}</strong> /{' '}
            {formatCurrency(dailyGoal)}
          </span>
        </div>

        <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goalProgressPercent}%` }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
          <span className="font-mono-num">{goalProgressPercent}% concluído</span>
          {goalProgressPercent >= 100 ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Meta batida
            </span>
          ) : (
            <span className="font-mono-num">
              Faltam {formatCurrency(Math.max(0, dailyGoal - totalIncomeToday))}
            </span>
          )}
        </div>
      </motion.div>

      {/* 5. Primary Operational Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16, ease: EASE_OUT }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
      >
        {isJourneyActive ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onStartOrViewJourney}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/20 transition-all flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[11px] font-semibold text-emerald-400">Turno em andamento</p>
                <p className="text-white font-bold text-sm font-mono-num">
                  {Math.floor(elapsedSeconds / 3600)}h {Math.floor((elapsedSeconds % 3600) / 60)}m{' '}
                  {elapsedSeconds % 60}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <span>Ver turno</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartOrViewJourney}
            className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Iniciar Turno (GPS)</span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsSimulatorOpen(true)}
          className="w-full min-h-[48px] py-3.5 px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.12] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span>Calcular / Lançar Corrida</span>
        </motion.button>
      </motion.div>

      {/* 6. Floating Overlay & Restricted Permission Quick Unlock */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: EASE_OUT }}
        className="bg-[#0B0E14] border border-white/[0.08] rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                overlayPref.isEnabled && hasOverlayPermission ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-xs font-bold text-white">
              Copiloto Flutuante sobre Uber, 99 e InDrive
            </span>
          </div>

          {onNavigateToCopilot && (
            <button
              onClick={onNavigateToCopilot}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>Central Copiloto</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Direct 2-Step Unlock Banner when Overlay Permission is not yet granted on Android */}
        {!hasOverlayPermission && (
          <div className="p-3.5 rounded-xl bg-amber-500/[0.07] border border-amber-500/25 space-y-2.5">
            <p className="text-xs text-slate-200 leading-relaxed">
              <strong className="text-amber-300">Android 13, 14 ou 15 bloqueou a sobreposição?</strong>{' '}
              Se aparecer <em>"Acesso negado ao app / permissão restrita"</em>, desbloqueie primeiro
              nas Informações do App (menu ⋮ no topo direito) e depois ative a chave:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => nativeBridge.openAppDetailsSettings()}
                className="min-h-[40px] py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/35 text-amber-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
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
          </div>
        )}

        {/* Recent Evaluated Ride */}
        {lastAnalyzedRide && (
          <div
            onClick={() => setIsRideAnalysisModalOpen(true)}
            className="p-3 rounded-xl bg-black/40 border border-white/[0.06] hover:border-white/[0.12] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
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
                <span className="text-xs font-medium text-white truncate block">
                  {lastAnalyzedRide.platform} · {formatCurrency(lastAnalyzedRide.offeredValue)}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium truncate block font-mono-num">
                  Lucro líq. {formatCurrency(lastAnalyzedRide.netProfit)} · R${' '}
                  {lastAnalyzedRide.netPerKm.toFixed(2)}/km
                </span>
              </div>
            </div>
            <span className="text-[11px] text-slate-300 font-medium shrink-0 ml-2">
              Ver ficha →
            </span>
          </div>
        )}

        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={async () => {
              if (isNativeAndroid() && !hasOverlayPermission) {
                setIsOverlayPermissionModalOpen(true);
                return;
              }
              toggleOverlay();
              if (isNativeAndroid() && !overlayPref.isEnabled) {
                await nativeBridge.startFloatingOverlay();
              }
            }}
            className={`min-h-[40px] py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              overlayPref.isEnabled && hasOverlayPermission
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.06] text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              {overlayPref.isEnabled && hasOverlayPermission ? 'Bolha Ativa' : 'Ativar Bolha'}
            </span>
          </button>

          <button
            onClick={() => setIsFuelModalOpen(true)}
            className="min-h-[40px] py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Abastecer</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="min-h-[40px] py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Despesa</span>
          </button>

          <button
            onClick={toggleDrivingMode}
            className="min-h-[40px] py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Velocímetro</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
