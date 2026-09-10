import React, { useState, useEffect } from 'react';
import {
  Shield,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  XCircle,
  Zap,
  Navigation,
  Clock,
  DollarSign,
  Gauge,
  Target,
  ArrowLeft,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { speakCopilotMessage, playCopilotSound } from '../../utils/copilotCalculations';

export const DrivingSafeMode: React.FC = () => {
  const {
    drivingMode,
    updateDrivingMode,
    toggleDrivingMode,
    lastAnalyzedRide,
    acceptRideOpportunity,
    rejectRideOpportunity,
    activeSession,
    elapsedSeconds,
    user,
    sessions,
    currentDateStr,
  } = useDriveWise();

  const [simulatedSpeed, setSimulatedSpeed] = useState(42);

  // Speedometer fluctuation for realism in demo
  useEffect(() => {
    if (!drivingMode.isActive) return;
    const interval = setInterval(() => {
      setSimulatedSpeed((prev) => {
        const delta = Math.floor(Math.random() * 9) - 4;
        return Math.max(25, Math.min(68, prev + delta));
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [drivingMode.isActive]);

  if (!drivingMode.isActive) return null;

  const ride = lastAnalyzedRide;

  // Format elapsed time
  const formatTime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  // Today's total earnings
  const todayEarnings = sessions
    .filter((s) => s.date === currentDateStr && s.status === 'completed')
    .reduce((acc, s) => acc + s.income, 0) + (activeSession ? activeSession.income : 0);

  const goalProgress = Math.min(100, Math.round((todayEarnings / (user.dailyGoal || 400)) * 100));

  const handleVoice = () => {
    if (!ride) return;
    const text = `Nota ${ride.score}. ${ride.scoreTier}. Valor de ${ride.offeredValue.toFixed(0)} reais. Lucro estimado de ${ride.netProfit.toFixed(0)} reais. ${ride.recommendation || ''}`;
    speakCopilotMessage(text);
  };

  const handleAccept = () => {
    if (!ride) return;
    acceptRideOpportunity(ride.id);
  };

  const handleReject = () => {
    if (!ride) return;
    rejectRideOpportunity(ride.id, 'Recusado no Modo Direção Segura');
  };

  const getScoreBorder = (tier: string) => {
    switch (tier) {
      case 'Excelente':
        return 'border-emerald-500 bg-emerald-950/30 text-emerald-400';
      case 'Boa':
        return 'border-amber-500 bg-amber-950/30 text-amber-400';
      case 'Regular':
        return 'border-orange-500 bg-orange-950/30 text-orange-400';
      default:
        return 'border-rose-500 bg-rose-950/30 text-rose-400';
    }
  };

  return (
    <div
      id="driving-safe-mode-screen"
      className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-4 sm:p-6 overflow-hidden select-none"
    >
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-black uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            Modo Direção Segura
          </div>
          <span className="text-slate-400 text-xs hidden sm:inline">
            Interface otimizada para suporte veicular
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => updateDrivingMode({ voiceAlerts: !drivingMode.voiceAlerts })}
            className={`p-2.5 rounded-xl border text-sm font-bold flex items-center gap-1.5 transition-colors ${
              drivingMode.voiceAlerts
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-xs">Voz</span>
          </button>

          <button
            id="btn-exit-driving-mode"
            onClick={toggleDrivingMode}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Sair do Modo</span>
          </button>
        </div>
      </div>

      {/* Mid Dash Statistics (Speedometer & Daily Progress) */}
      <div className="grid grid-cols-3 gap-3 my-2">
        {/* Speedometer */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs uppercase font-bold tracking-wider">
            <Gauge className="w-4 h-4 text-cyan-400" />
            Velocidade
          </div>
          <span className="text-4xl sm:text-5xl font-black text-white font-mono mt-1">
            {simulatedSpeed}
          </span>
          <span className="text-xs text-slate-500 font-semibold uppercase">km / h</span>
        </div>

        {/* Shift Duration */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs uppercase font-bold tracking-wider">
            <Clock className="w-4 h-4 text-amber-400" />
            Em Turno
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white font-mono mt-1">
            {formatTime(elapsedSeconds || 16320)}
          </span>
          <span className="text-xs text-slate-500 font-semibold uppercase">tempo ativo</span>
        </div>

        {/* Today's Earnings & Goal */}
        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-slate-400 text-xs uppercase font-bold tracking-wider">
            <Target className="w-4 h-4 text-emerald-400" />
            Meta ({goalProgress}%)
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
            R$ {todayEarnings.toFixed(0)}
          </span>
          <span className="text-xs text-slate-500 font-semibold uppercase">
            de R$ {user.dailyGoal || 400}
          </span>
        </div>
      </div>

      {/* Primary Ride Opportunity Card (Giant Layout) */}
      {ride ? (
        <div
          className={`flex-1 flex flex-col justify-between p-5 rounded-3xl border-4 ${getScoreBorder(
            ride.scoreTier
          )} relative shadow-2xl my-2`}
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-6xl sm:text-7xl font-black tracking-tight text-white font-mono">
                {ride.score}
              </span>
              <div>
                <span className="text-sm uppercase font-black tracking-widest text-slate-400 block">
                  {ride.platform} • {ride.scoreTier}
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  DRIVEWISE Ride Score
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold uppercase text-slate-400 block">Valor</span>
              <span className="text-4xl sm:text-5xl font-black text-white font-mono">
                R$ {ride.offeredValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Core Rates Row (Giant readable fonts) */}
          <div className="grid grid-cols-3 gap-3 my-3 text-center">
            <div className="bg-black/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold uppercase text-slate-400 block">Lucro Líq.</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                +R$ {ride.netProfit.toFixed(1)}
              </span>
            </div>

            <div className="bg-black/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold uppercase text-slate-400 block">R$ / KM Líq</span>
              <span className="text-2xl sm:text-3xl font-black text-white">
                R$ {ride.netPerKm.toFixed(2)}
              </span>
            </div>

            <div className="bg-black/60 p-3 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold uppercase text-slate-400 block">R$ / Hora</span>
              <span className="text-2xl sm:text-3xl font-black text-white">
                R$ {ride.netPerHour.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Quick Route & Passenger Distance */}
          <div className="flex items-center justify-between text-sm sm:text-base font-bold bg-black/40 p-3 rounded-xl border border-slate-800 text-slate-200">
            <span className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-amber-400" />
              Até cliente: <strong className="text-white text-lg">{ride.distanceToPassengerKm} km</strong> ({ride.estimatedTimeToPassengerMin} min)
            </span>
            <span>
              Viagem: <strong className="text-white text-lg">{ride.estimatedTripDistanceKm} km</strong> ({ride.estimatedTripTimeMin} min)
            </span>
          </div>

          {/* Honest recommendation banner */}
          <div className="mt-2 text-sm sm:text-base font-semibold text-slate-300 italic px-2">
            "{ride.recommendation || ride.scoreReason}"
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-dashed border-slate-800 my-2 text-center">
          <Zap className="w-12 h-12 text-slate-600 mb-2" />
          <h3 className="text-xl font-bold text-slate-300">Aguardando chamada de corrida...</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Assim que a Uber, 99 ou InDrive enviar uma oferta, a análise em alta velocidade aparecerá aqui.
          </p>
        </div>
      )}

      {/* Bottom GIANT Action Controls (Designed for 1-tap thumb reach) */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button
          id="btn-driver-reject"
          onClick={handleReject}
          className="h-16 sm:h-20 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-lg sm:text-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/40"
        >
          <XCircle className="w-7 h-7" />
          Recusar
        </button>

        <button
          id="btn-driver-voice"
          onClick={handleVoice}
          className="h-16 sm:h-20 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-cyan-300 border-2 border-cyan-500/50 font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
        >
          <Volume2 className="w-6 h-6" />
          Ouvir
        </button>

        <button
          id="btn-driver-accept"
          onClick={handleAccept}
          className="h-16 sm:h-20 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-lg sm:text-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/40"
        >
          <CheckCircle2 className="w-7 h-7" />
          Aceitar
        </button>
      </div>
    </div>
  );
};
