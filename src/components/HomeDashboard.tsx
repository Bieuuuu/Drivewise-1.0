import React from 'react';
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
  Zap,
  Target,
  Sparkles,
  Gauge,
  CheckCircle2,
  Calculator,
  Layers,
  Fuel,
  PlusCircle,
} from 'lucide-react';
import { isNativeAndroid, nativeBridge } from '../services/nativeBridge';

interface HomeDashboardProps {
  onStartOrViewJourney: () => void;
  onNavigateToReports: () => void;
  onNavigateToHistory: () => void;
  onNavigateToCopilot?: () => void;
}

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

  // Dynamic greeting based on current hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-xl mx-auto">
      {/* 0. Cockpit Telemetry Quick Access Bar (Hidden in Minimalist Mode) */}
      {!isMinimalistMode && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/50 via-[#0A0D10] to-[#0E1015] border border-emerald-500/40 p-3.5 flex items-center justify-between shadow-lg shadow-black/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white">
                  Custo Calibrado: R$ {costPerKm.toFixed(2)}/km
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Meta R$ {minNetPerKm.toFixed(2)}/km líq
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Ajuste o consumo do seu veículo e regras do semáforo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 text-xs font-mono font-bold transition-all shadow-md shadow-emerald-500/25 flex items-center gap-1.5 shrink-0"
          >
            <span>Calibrar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Greeting Header */}
      <div className="pt-1 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {getGreeting()},{' '}
            {user.name ||
              firebaseUser?.displayName ||
              firebaseUser?.email?.split('@')[0] ||
              'Motorista'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isMinimalistMode ? 'Painel Essencial' : 'Resumo financeiro em tempo real'}
          </p>
        </div>
        {isMinimalistMode && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            MINIMALISTA
          </span>
        )}
      </div>

      {/* 2. Main Metric: Today's Net Profit & Secondary Gross/Costs */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 shadow-lg shadow-black/40">
        <span className="text-xs font-medium text-slate-400 block mb-1">
          Lucro líquido de hoje (já descontando combustível e custos)
        </span>

        <div className="flex items-baseline gap-2 mb-2">
          <span
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight font-mono-num ${
              netProfitToday >= 0 ? 'text-white' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netProfitToday)}
          </span>
        </div>

        {/* Secondary line: Gross and Costs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 pt-3 border-t border-white/[0.06]">
          <span>
            Faturamento Bruto:{' '}
            <strong className="font-semibold text-emerald-400 font-mono-num">
              {formatCurrency(totalIncomeToday)}
            </strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Custos + Combustível:{' '}
            <strong
              className={`font-semibold font-mono-num ${
                totalCostsToday > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {formatCurrency(totalCostsToday)}
            </strong>
          </span>
        </div>

        {/* Platform breakdown as small clean dots */}
        {(platformBreakdown.Uber > 0 ||
          platformBreakdown['99'] > 0 ||
          platformBreakdown.InDrive > 0) && (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/[0.04]">
            {platformBreakdown.Uber > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>Uber: {formatCurrency(platformBreakdown.Uber)}</span>
              </span>
            )}
            {platformBreakdown['99'] > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>99: {formatCurrency(platformBreakdown['99'])}</span>
              </span>
            )}
            {platformBreakdown.InDrive > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>InDrive: {formatCurrency(platformBreakdown.InDrive)}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Compact Horizontal Indicators Line (Time • Km • Rate/h) */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] bg-[#0C0C0D] border border-white/[0.08] rounded-xl py-3 px-2 text-center">
        <div className="px-2">
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">
            Tempo Hoje
          </span>
          <span className="text-xs sm:text-sm font-bold text-white font-mono-num truncate block">
            {formatDuration(combinedDurationMinutes)}
          </span>
        </div>
        <div className="px-2">
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">
            Distância
          </span>
          <span className="text-xs sm:text-sm font-bold text-white font-mono-num truncate block">
            {formatKm(combinedDistanceKm)}
          </span>
        </div>
        <div className="px-2">
          <span className="text-[10px] text-slate-400 block uppercase tracking-wider mb-0.5">
            Média/hora
          </span>
          <span
            className={`text-xs sm:text-sm font-bold font-mono-num truncate block ${
              combinedDurationMinutes >= 2 && hourlyRateToday > 0
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {combinedDurationMinutes >= 2 && hourlyRateToday > 0
              ? `${formatCurrency(hourlyRateToday)}/h`
              : '-'}
          </span>
        </div>
      </div>

      {/* 4. Fine Daily Goal Bar */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-3.5">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            Meta diária
          </span>
          <span className="font-mono-num text-slate-300 text-xs">
            <strong className="text-white font-bold">{formatCurrency(totalIncomeToday)}</strong> /{' '}
            {formatCurrency(dailyGoal)}
          </span>
        </div>

        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.05]">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${goalProgressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
          <span>{goalProgressPercent}% concluído</span>
          {goalProgressPercent >= 100 ? (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Meta batida!
            </span>
          ) : (
            <span>Faltam {formatCurrency(Math.max(0, dailyGoal - totalIncomeToday))}</span>
          )}
        </div>
      </div>

      {/* 5. Primary Operational Actions (Iniciar Jornada + Calcular/Lançar Corrida) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {isJourneyActive ? (
          <button
            onClick={onStartOrViewJourney}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
                  Turno Ativo
                </p>
                <p className="text-white font-bold text-sm font-mono-num">
                  {Math.floor(elapsedSeconds / 3600)}h {Math.floor((elapsedSeconds % 3600) / 60)}m{' '}
                  {elapsedSeconds % 60}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <span>Ver Turno</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ) : (
          <button
            onClick={onStartOrViewJourney}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-emerald-950/30 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>INICIAR TURNO (GPS)</span>
          </button>
        )}

        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-slate-950 font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-amber-950/30 transition-all flex items-center justify-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          <span>CALCULAR / LANÇAR CORRIDA</span>
        </button>
      </div>

      {/* 6. Floating Overlay & Quick Financial Controls */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
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
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              <span>Central Copiloto</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Recent Evaluated Ride */}
        {lastAnalyzedRide && (
          <div
            onClick={() => setIsRideAnalysisModalOpen(true)}
            className="p-2.5 rounded-lg bg-black/40 border border-white/[0.05] hover:border-white/[0.1] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`px-1.5 py-0.5 rounded text-[11px] font-black shrink-0 ${
                  lastAnalyzedRide.scoreTier === 'Excelente'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : lastAnalyzedRide.scoreTier === 'Boa'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {lastAnalyzedRide.score}
              </span>
              <div className="min-w-0">
                <span className="text-xs font-medium text-white truncate block">
                  {lastAnalyzedRide.platform} • {formatCurrency(lastAnalyzedRide.offeredValue)}
                </span>
                <span className="text-[11px] text-emerald-400 font-medium truncate block font-mono-num">
                  Lucro líq.: {formatCurrency(lastAnalyzedRide.netProfit)} (R${' '}
                  {lastAnalyzedRide.netPerKm.toFixed(2)}/km)
                </span>
              </div>
            </div>
            <span className="text-[11px] text-amber-400 font-medium shrink-0 ml-2">Ficha →</span>
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
            className={`py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
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
            className="py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Fuel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Abastecer</span>
          </button>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate">Despesa</span>
          </button>

          <button
            onClick={toggleDrivingMode}
            className="py-2 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Gauge className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">Velocímetro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
