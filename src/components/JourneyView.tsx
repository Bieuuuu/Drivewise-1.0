import React, { useState, useEffect } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  getMetricsForDate,
} from '../utils/calculations';
import {
  Play,
  Square,
  Navigation,
  Clock,
  Car,
  AlertTriangle,
  Check,
  Edit3,
  Sparkles,
  ShieldCheck,
  Fuel,
  Info,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const JourneyView: React.FC = () => {
  const {
    user,
    sessions,
    expenses,
    activeSession,
    isJourneyActive,
    elapsedSeconds,
    currentGpsDistance,
    isSimulatingMovement,
    gpsStatus,
    gpsAccuracy,
    toggleMovementSimulation,
    startJourney,
    endJourney,
    cancelActiveJourney,
    currentDateStr,
    isMinimalistMode,
  } = useDriveWise();

  // Dialog states
  const [isFinishingDialog, setIsFinishingDialog] = useState(false);
  const [isCorrectionDialog, setIsCorrectionDialog] = useState(false);
  const [manualDistanceInput, setManualDistanceInput] = useState<string>('');

  // End journey form inputs
  const [usePlatformDetails, setUsePlatformDetails] = useState(false);
  const [totalIncomeInput, setTotalIncomeInput] = useState('');
  const [uberIncome, setUberIncome] = useState('');
  const [ninetyNineIncome, setNinetyNineIncome] = useState('');
  const [inDriveIncome, setInDriveIncome] = useState('');
  const [outrosIncome, setOutrosIncome] = useState('');
  const [journeyNotes, setJourneyNotes] = useState('');

  // Post-journey summary modal state
  const [showPostSummary, setShowPostSummary] = useState(false);
  const [completedSummaryData, setCompletedSummaryData] = useState<{
    durationMinutes: number;
    distanceKm: number;
    income: number;
    hourlyRate: number;
    kmRate: number;
    fuelCost: number;
    netProfit: number;
    benchmarkMessage: string;
  } | null>(null);

  // Today's summary
  const todayMetrics = getMetricsForDate(sessions, expenses, currentDateStr);
  const nextShiftNumber = todayMetrics.sessions.length + 1;

  // Format active time
  const formatLiveStopwatch = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Open finishing flow
  const handleOpenFinishModal = () => {
    setManualDistanceInput(currentGpsDistance.toString());
    if (activeSession && activeSession.income > 0) {
      setTotalIncomeInput(activeSession.income.toFixed(2));
      const ub = activeSession.platformEarnings?.Uber || 0;
      const nn = activeSession.platformEarnings?.['99'] || 0;
      const ind = activeSession.platformEarnings?.InDrive || 0;
      const out = activeSession.platformEarnings?.Outros || 0;

      setUberIncome(ub > 0 ? ub.toFixed(2) : '');
      setNinetyNineIncome(nn > 0 ? nn.toFixed(2) : '');
      setInDriveIncome(ind > 0 ? ind.toFixed(2) : '');
      setOutrosIncome(out > 0 ? out.toFixed(2) : '');

      if (ub > 0 || nn > 0 || ind > 0 || out > 0) {
        setUsePlatformDetails(true);
      } else {
        setUsePlatformDetails(false);
      }
    } else {
      setTotalIncomeInput('');
      setUberIncome('');
      setNinetyNineIncome('');
      setInDriveIncome('');
      setOutrosIncome('');
      setUsePlatformDetails(false);
    }
    setJourneyNotes('');
    setIsFinishingDialog(true);
  };

  // Submit finish journey
  const handleConfirmFinish = (e: React.FormEvent) => {
    e.preventDefault();

    let finalIncome = 0;
    let platforms = {
      Uber: 0,
      '99': 0,
      InDrive: 0,
      Outros: 0,
    };

    if (usePlatformDetails) {
      platforms = {
        Uber: parseFloat(uberIncome.replace(',', '.')) || 0,
        '99': parseFloat(ninetyNineIncome.replace(',', '.')) || 0,
        InDrive: parseFloat(inDriveIncome.replace(',', '.')) || 0,
        Outros: parseFloat(outrosIncome.replace(',', '.')) || 0,
      };
      finalIncome = platforms.Uber + platforms['99'] + platforms.InDrive + platforms.Outros;
    } else {
      finalIncome = parseFloat(totalIncomeInput.replace(',', '.')) || 0;
      // If entered as single total, assign to Uber/Principal by default
      platforms.Uber = finalIncome;
    }

    const correctedKm = manualDistanceInput
      ? parseFloat(manualDistanceInput.replace(',', '.'))
      : undefined;

    const completed = endJourney({
      income: finalIncome,
      platformEarnings: platforms,
      distanceKm: currentGpsDistance,
      manualCorrection: correctedKm,
      notes: journeyNotes,
    });

    setIsFinishingDialog(false);

    // Compute metrics for post-journey modal
    const effectiveKm = correctedKm !== undefined ? correctedKm : currentGpsDistance;
    const durationMin = completed.durationMinutes;
    const hourly = durationMin > 0 ? (finalIncome / durationMin) * 60 : 0;
    const kmRate = effectiveKm > 0 ? finalIncome / effectiveKm : 0;
    const fuelCost = completed.estimatedFuelCost || 0;
    const profit = finalIncome - fuelCost;

    // Benchmark message
    const isAboveAverage = hourly >= (todayMetrics.avgHourlyRate || 55);
    const benchmarkMessage = isAboveAverage
      ? 'Hoje você ganhou acima da sua média habitual!'
      : 'Boa jornada! O descanso e combustível foram calculados no seu lucro.';

    setCompletedSummaryData({
      durationMinutes: durationMin,
      distanceKm: effectiveKm,
      income: finalIncome,
      hourlyRate: hourly,
      kmRate,
      fuelCost,
      netProfit: profit,
      benchmarkMessage,
    });

    setShowPostSummary(true);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // safe fallback
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-2xl mx-auto">
      {/* Title & Shift Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Controle de Jornada</h1>
          <p className="text-xs text-slate-400">
            {isJourneyActive
              ? `${activeSession?.shiftNumber || 1}º turno em andamento`
              : `Próximo: ${nextShiftNumber}º turno do dia`}
          </p>
        </div>

        {/* GPS Sensor Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              gpsStatus === 'tracking'
                ? 'bg-emerald-400 animate-pulse'
                : gpsStatus === 'simulated'
                ? 'bg-amber-400'
                : 'bg-slate-400'
            }`}
          />
          <span>{gpsStatus === 'simulated' ? 'GPS Simulado' : 'GPS Ativo'}</span>
        </div>
      </div>

      {/* ACTIVE JOURNEY PANEL */}
      {isJourneyActive ? (
        <div className="bg-gradient-to-b from-[#111113] to-[#000000] border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl shadow-emerald-950/30 space-y-5">
          {/* Top Active Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Jornada em Andamento
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Iniciado às{' '}
              {activeSession?.startTime
                ? new Date(activeSession.startTime).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--'}
            </span>
          </div>

          {/* Giant Live Chronometer */}
          <div className="text-center py-2">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-1">
              Tempo de Trabalho
            </p>
            <div className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight font-mono-num drop-shadow-md">
              {formatLiveStopwatch(elapsedSeconds)}
            </div>
          </div>

          {/* Live GPS Distance Card */}
          <div className="bg-black/40 border border-white/[0.08] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-cyan-400" />
                Distância da jornada
              </span>
              <button
                onClick={() => {
                  setManualDistanceInput(currentGpsDistance.toString());
                  setIsCorrectionDialog(true);
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> Corrigir
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white font-mono-num">
                {currentGpsDistance.toFixed(2).replace('.', ',')}
              </span>
              <span className="text-slate-400 text-sm font-semibold">km</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Estimativa por GPS e sensores do aparelho (precisão ~{gpsAccuracy || 10}m)
            </p>
          </div>

          {/* Real-time Copilot Shift Captured Earnings */}
          {activeSession && activeSession.income > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Faturamento via Copiloto</span>
                </div>
                <div className="text-xl font-black text-white font-mono-num mt-0.5">
                  {formatCurrency(activeSession.income)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Uber: {formatCurrency(activeSession.platformEarnings?.Uber || 0)} • 99:{' '}
                  {formatCurrency(activeSession.platformEarnings?.['99'] || 0)}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Auto-somado
              </span>
            </div>
          )}

          {/* Desktop/Preview Simulation Toggle (Hidden in Minimalist Mode) */}
          {!isMinimalistMode && (
            <div className="bg-[#0C0C0D] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <div>
                  <p className="font-semibold text-slate-200">Simulador de Movimento</p>
                  <p className="text-[10px] text-slate-400">
                    {isSimulatingMovement ? 'Acumulando km (~35 km/h)' : 'Apenas GPS real do celular'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMovementSimulation}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSimulatingMovement
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-white/[0.05] text-slate-400 border border-white/[0.08]'
                }`}
              >
                {isSimulatingMovement ? 'Ativo' : 'Pausado'}
              </button>
            </div>
          )}

          {/* Action Buttons: Finish or Cancel */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleOpenFinishModal}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-base shadow-xl shadow-red-950/40 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>ENCERRAR JORNADA</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Deseja cancelar esta jornada sem salvar o registro?')) {
                  cancelActiveJourney();
                }
              }}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors text-center"
            >
              Descartar jornada sem salvar
            </button>
          </div>
        </div>
      ) : (
        /* INACTIVE JOURNEY PANEL */
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto flex items-center justify-center text-emerald-400">
            <Car className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Pronto para rodar?</h2>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
              O DriveWise registrará automaticamente seus horários, quilometragem via GPS e
              consolidará seus ganhos e consumo de combustível.
            </p>
          </div>

          <button
            onClick={startJourney}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-base tracking-wide shadow-xl shadow-emerald-950/50 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>INICIAR JORNADA ({nextShiftNumber}º TURNO)</span>
          </button>

          {/* Vehicle & fuel specs (hidden in Minimalist Mode) */}
          {!isMinimalistMode && (
            <div className="grid grid-cols-2 gap-2 pt-2 text-left border-t border-white/[0.06]">
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Veículo</p>
                <p className="text-xs font-semibold text-slate-200 truncate">{user.vehicleModel}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
                <p className="text-[10px] text-slate-400">Combustível</p>
                <p className="text-xs font-semibold text-slate-200">
                  {user.fuelType} (R$ {user.avgFuelPrice.toFixed(2)}/L)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MULTIPLE SHIFTS OF TODAY SUMMARY */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Resumo Consolidado do Dia
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {new Date(`${currentDateStr}T12:00:00`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
            })}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
          <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Total Ganho</p>
            <p className="text-sm font-bold text-emerald-400 font-mono-num">
              {formatCurrency(todayMetrics.totalIncome)}
            </p>
          </div>

          <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Total Horas</p>
            <p className="text-sm font-bold text-white font-mono-num">
              {formatDuration(todayMetrics.totalDurationMinutes)}
            </p>
          </div>

          <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Total Percorrido</p>
            <p className="text-sm font-bold text-white font-mono-num">
              {formatKm(todayMetrics.totalDistanceKm)}
            </p>
          </div>

          <div className="bg-black/30 rounded-lg p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Ganho Médio/h</p>
            <p className="text-sm font-bold text-emerald-400 font-mono-num">
              {formatCurrency(todayMetrics.avgHourlyRate)}/h
            </p>
          </div>
        </div>

        {/* Turnos details */}
        <div className="space-y-2 pt-2">
          <p className="text-[11px] font-semibold text-slate-400">Turnos registrados hoje:</p>
          {todayMetrics.sessions.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">Nenhum turno finalizado hoje.</p>
          ) : (
            todayMetrics.sessions.map((s) => (
              <div
                key={s.id}
                className="bg-black/40 border border-white/[0.04] rounded-lg p-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200">{s.shiftNumber}º turno</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}{' '}
                    →{' '}
                    {s.endTime ? new Date(s.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}{' '}
                    ({formatDuration(s.durationMinutes)})
                  </p>
                </div>
                <div className="text-right font-mono-num">
                  <p className="font-bold text-emerald-400">{formatCurrency(s.income)}</p>
                  <p className="text-[10px] text-slate-400">{formatKm(s.distanceKm)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* FINISH JOURNEY MODAL (Fechamento Expresso ou Detalhado) */}
      {isFinishingDialog && (() => {
        const effectiveDist = manualDistanceInput
          ? parseFloat(manualDistanceInput.replace(',', '.')) || currentGpsDistance
          : currentGpsDistance;
        const liveFuelCost =
          (effectiveDist / (user.avgConsumptionKmPerLiter || 11.5)) * (user.avgFuelPrice || 5.89);
        const liveIncome = usePlatformDetails
          ? (parseFloat(uberIncome.replace(',', '.')) || 0) +
            (parseFloat(ninetyNineIncome.replace(',', '.')) || 0) +
            (parseFloat(inDriveIncome.replace(',', '.')) || 0) +
            (parseFloat(outrosIncome.replace(',', '.')) || 0)
          : parseFloat(totalIncomeInput.replace(',', '.')) || 0;
        const liveNetProfit = Math.max(0, liveIncome - liveFuelCost);

        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0C0C0D] border border-white/[0.12] rounded-2xl p-5 max-w-md w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl">
              <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    Encerrar Turno
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Confirme o faturamento e a quilometragem do período.
                  </p>
                </div>
              </div>

              {/* Mode Switcher: Expresso vs Detalhado */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setUsePlatformDetails(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    !usePlatformDetails
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  Fechamento Expresso
                </button>
                <button
                  type="button"
                  onClick={() => setUsePlatformDetails(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    usePlatformDetails
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Detalhar por App
                </button>
              </div>

              <form onSubmit={handleConfirmFinish} className="space-y-4">
                {/* Distance summary & manual correction */}
                <div className="bg-black/40 rounded-xl p-3 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-medium">Distância via GPS</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono-num">
                      {currentGpsDistance.toFixed(1)} km
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Ajustar km (se odômetro do carro diferir):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={manualDistanceInput}
                        onChange={(e) => setManualDistanceInput(e.target.value)}
                        placeholder={currentGpsDistance.toFixed(1)}
                        className="flex-1 bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white font-mono-num font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const curr =
                            parseFloat(
                              (manualDistanceInput || currentGpsDistance.toString()).replace(',', '.')
                            ) || 0;
                          setManualDistanceInput(Math.max(0, curr - 1).toFixed(1));
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-xs font-bold text-slate-300 border border-white/[0.08]"
                      >
                        -1 km
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const curr =
                            parseFloat(
                              (manualDistanceInput || currentGpsDistance.toString()).replace(',', '.')
                            ) || 0;
                          setManualDistanceInput((curr + 1).toFixed(1));
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-xs font-bold text-slate-300 border border-white/[0.08]"
                      >
                        +1 km
                      </button>
                    </div>
                  </div>
                </div>

                {/* Earnings input section */}
                <div className="space-y-2">
                  {!usePlatformDetails ? (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-200">
                          Total Faturado no Turno (R$)
                        </label>
                        <span className="text-[11px] text-slate-400">1 toque / direto</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-slate-400 font-bold text-base">
                          R$
                        </span>
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          required
                          autoFocus
                          value={totalIncomeInput}
                          onChange={(e) => setTotalIncomeInput(e.target.value)}
                          placeholder="0,00"
                          className="w-full bg-[#000000] border border-white/[0.12] rounded-xl pl-11 pr-4 py-3 text-3xl font-black text-white font-mono-num focus:border-emerald-500 focus:outline-none tracking-tight"
                        />
                      </div>

                      {/* Quick preset amount chips */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                          Atalhos:
                        </span>
                        {[150, 200, 250, 300, 350, 400].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setTotalIncomeInput(val.toString())}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/[0.08] text-[11px] font-semibold text-slate-300 transition-all font-mono-num"
                          >
                            R$ {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-200 block mb-2">
                        Faturamento por Aplicativo
                      </label>
                      <div className="grid grid-cols-2 gap-2.5 bg-black/30 p-3 rounded-xl border border-white/[0.06]">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Uber (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={uberIncome}
                            onChange={(e) => setUberIncome(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#000000] border border-white/[0.08] rounded-xl p-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">99 (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={ninetyNineIncome}
                            onChange={(e) => setNinetyNineIncome(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#000000] border border-white/[0.08] rounded-xl p-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">inDrive (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={inDriveIncome}
                            onChange={(e) => setInDriveIncome(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#000000] border border-white/[0.08] rounded-xl p-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Outros / Particular (R$)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            value={outrosIncome}
                            onChange={(e) => setOutrosIncome(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-[#000000] border border-white/[0.08] rounded-xl p-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time Profit Preview Box */}
                {liveIncome > 0 && (
                  <div className="bg-[#000000] border border-emerald-500/30 rounded-xl p-3 space-y-1.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Faturamento informado:</span>
                      <span className="font-bold text-white font-mono-num">
                        {formatCurrency(liveIncome)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Combustível estimado ({effectiveDist.toFixed(1)} km):</span>
                      <span className="text-rose-400 font-mono-num">
                        -{formatCurrency(liveFuelCost)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.08]">
                      <span className="text-xs font-bold text-slate-200">Lucro Líquido Previsto:</span>
                      <span className="text-sm font-black text-emerald-400 font-mono-num">
                        {formatCurrency(liveNetProfit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Observações do Turno (opcional)
                  </label>
                  <input
                    type="text"
                    value={journeyNotes}
                    onChange={(e) => setJourneyNotes(e.target.value)}
                    placeholder="Ex: Muita chuva, trânsito pesado, dinâmica alta"
                    className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Buttons with generous touch targets (min 48px) */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFinishingDialog(false)}
                    className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-98 text-xs font-semibold text-slate-300 transition-all"
                  >
                    Continuar Rodando
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black text-xs font-black shadow-lg shadow-emerald-950/40 transition-all"
                  >
                    Salvar e Encerrar
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* POST-JOURNEY SUMMARY MODAL (Modo Pós-Jornada) */}
      {showPostSummary && completedSummaryData && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C0C0D] border border-emerald-500/30 rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Jornada Encerrada!</h3>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                {completedSummaryData.benchmarkMessage}
              </p>
            </div>

            {/* Metric grid */}
            <div className="bg-black/40 border border-white/[0.08] rounded-xl p-4 space-y-2.5 text-left text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">⏱ Duração total:</span>
                <span className="font-bold text-white font-mono-num">
                  {formatDuration(completedSummaryData.durationMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">🚗 Distância:</span>
                <span className="font-bold text-white font-mono-num">
                  {formatKm(completedSummaryData.distanceKm)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">💰 Ganho informado:</span>
                <span className="font-bold text-emerald-400 font-mono-num text-sm">
                  {formatCurrency(completedSummaryData.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">📈 Média horária:</span>
                <span className="font-bold text-emerald-400 font-mono-num">
                  {formatCurrency(completedSummaryData.hourlyRate)}/h
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2">
                <span className="text-slate-400">⛽ Combustível estimado:</span>
                <span className="text-rose-400 font-mono-num">
                  -{formatCurrency(completedSummaryData.fuelCost)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 font-bold text-sm">
                <span className="text-slate-200">💵 Lucro líquido est.:</span>
                <span className="text-emerald-400 font-mono-num">
                  {formatCurrency(completedSummaryData.netProfit)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowPostSummary(false)}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm transition-colors"
            >
              Concluir
            </button>
          </div>
        </div>
      )}

      {/* Manual correction mini-dialog while active */}
      {isCorrectionDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0C0D] border border-white/[0.12] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Corrigir Quilometragem GPS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O GPS registrou{' '}
              <strong className="text-emerald-400 font-mono-num">{currentGpsDistance.toFixed(1)} km</strong>.
              Caso seu odômetro marque diferente, ajuste abaixo:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={manualDistanceInput}
                onChange={(e) => setManualDistanceInput(e.target.value)}
                className="flex-1 bg-[#000000] border border-white/[0.12] rounded-xl px-3.5 py-3 text-lg font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const curr =
                    parseFloat(
                      (manualDistanceInput || currentGpsDistance.toString()).replace(',', '.')
                    ) || 0;
                  setManualDistanceInput(Math.max(0, curr - 1).toFixed(1));
                }}
                className="px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-xs font-bold text-slate-300 border border-white/[0.08]"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => {
                  const curr =
                    parseFloat(
                      (manualDistanceInput || currentGpsDistance.toString()).replace(',', '.')
                    ) || 0;
                  setManualDistanceInput((curr + 1).toFixed(1));
                }}
                className="px-3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 text-xs font-bold text-slate-300 border border-white/[0.08]"
              >
                +1
              </button>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setIsCorrectionDialog(false)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-98 text-xs font-semibold text-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => setIsCorrectionDialog(false)}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black text-xs font-black shadow-md transition-all"
              >
                Salvar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
