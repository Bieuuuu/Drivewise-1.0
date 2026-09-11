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
} from 'lucide-react';

interface HomeDashboardProps {
  onStartOrViewJourney: () => void;
  onNavigateToReports: () => void;
  onNavigateToHistory: () => void;
  onNavigateToCopilot?: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onStartOrViewJourney,
  onNavigateToReports,
  onNavigateToHistory,
  onNavigateToCopilot,
}) => {
  const {
    user,
    sessions,
    expenses,
    isJourneyActive,
    elapsedSeconds,
    currentGpsDistance,
    currentDateStr,
    insights,
    lastAnalyzedRide,
    setIsSimulatorOpen,
    setIsRideAnalysisModalOpen,
    setIsOnboardingOpen,
    toggleDrivingMode,
    isMinimalistMode,
    firebaseUser,
  } = useDriveWise();

  // Metrics for today
  const todayMetrics = getMetricsForDate(sessions, expenses, currentDateStr);

  // Live minutes & distance if journey is running
  const liveMinutes = isJourneyActive ? Math.floor(elapsedSeconds / 60) : 0;
  const combinedDurationMinutes = todayMetrics.totalDurationMinutes + liveMinutes;
  const combinedDistanceKm =
    todayMetrics.totalDistanceKm + (isJourneyActive ? currentGpsDistance : 0);
  const totalIncomeToday = todayMetrics.totalIncome;
  const netProfitToday = totalIncomeToday - todayMetrics.totalExpenses;

  // Hourly rate - exclude outlier if less than 5 minutes
  const hourlyRateToday =
    combinedDurationMinutes >= 5 ? (totalIncomeToday / combinedDurationMinutes) * 60 : 0;

  // Daily goal progress
  const dailyGoal = user.dailyGoal || 400;
  const goalProgressPercent = Math.min(100, Math.round((totalIncomeToday / dailyGoal) * 100));

  // Platform breakdown for today
  const platformBreakdown = {
    Uber: todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.Uber || 0), 0),
    '99': todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.['99'] || 0), 0),
    InDrive: todayMetrics.sessions.reduce((sum, s) => sum + (s.platformEarnings?.InDrive || 0), 0),
  };

  // Top smart highlight
  const primaryInsight = insights[0] || {
    title: 'Produtividade em alta',
    message: 'Seu ganho por hora está 18% acima da sua média nas últimas 2 semanas.',
  };

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
                <span className="text-xs font-mono font-bold text-white">Cockpit & Guia Inteligente</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Calibre o custo real por KM e os alertas em viva-voz
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
            {getGreeting()}, {user.name || firebaseUser?.displayName || firebaseUser?.email?.split('@')[0] || 'Motorista'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isMinimalistMode ? 'Painel Essencial' : 'Visão geral do seu dia'}
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
          Lucro líquido de hoje
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
            Bruto:{' '}
            <strong className="font-semibold text-slate-200 font-mono-num">
              {formatCurrency(totalIncomeToday)}
            </strong>
          </span>
          <span className="text-slate-400">•</span>
          <span>
            Custos:{' '}
            <strong
              className={`font-semibold font-mono-num ${
                todayMetrics.totalExpenses > 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {formatCurrency(todayMetrics.totalExpenses)}
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
            Tempo
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
              combinedDurationMinutes >= 5 && hourlyRateToday > 0
                ? 'text-emerald-400'
                : 'text-slate-400'
            }`}
          >
            {combinedDurationMinutes >= 5 && hourlyRateToday > 0
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

        {/* Fine Progress Bar */}
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

      {/* 5. Single Primary CTA: Iniciar Jornada / Jornada em Andamento */}
      <div>
        {isJourneyActive ? (
          <button
            onClick={onStartOrViewJourney}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:scale-[0.99] transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-emerald-400">
                  Jornada em andamento
                </p>
                <p className="text-white font-bold text-sm font-mono-num">
                  {Math.floor(elapsedSeconds / 3600)}h {Math.floor((elapsedSeconds % 3600) / 60)}min{' '}
                  {elapsedSeconds % 60}s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <span>Painel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        ) : (
          <button
            onClick={onStartOrViewJourney}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-sm tracking-wide shadow-md shadow-emerald-950/30 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>INICIAR JORNADA</span>
          </button>
        )}
      </div>

      {/* 6. Copilot Card (Only essential info in Minimalist Mode) */}
      {(!isMinimalistMode || lastAnalyzedRide) && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-bold text-white">Copiloto de corridas</span>
            </div>

            {onNavigateToCopilot && (
              <button
                onClick={onNavigateToCopilot}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                <span>Abrir</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* If there's a recent ride analyzed */}
          {lastAnalyzedRide && (
            <div
              onClick={() => setIsRideAnalysisModalOpen(true)}
              className="mt-3 p-2.5 rounded-lg bg-black/40 border border-white/[0.05] hover:border-white/[0.1] flex items-center justify-between cursor-pointer transition-colors"
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
                    Lucro est.: {formatCurrency(lastAnalyzedRide.netProfit)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-medium shrink-0 ml-2">Ver →</span>
            </div>
          )}

          {/* Secondary discrete action buttons (hidden in Minimalist Mode) */}
          {!isMinimalistMode && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/[0.05]">
              <button
                onClick={() => setIsSimulatorOpen(true)}
                className="py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Simular corrida</span>
              </button>

              <button
                onClick={toggleDrivingMode}
                className="py-2 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Gauge className="w-3.5 h-3.5 text-slate-400" />
                <span>Modo direção</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 7. Highlight of the Day (Clean text, hidden in Minimalist Mode) */}
      {!isMinimalistMode && (
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-slate-200">Destaque do dia</p>
            <p className="text-slate-400 mt-0.5">{primaryInsight.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

