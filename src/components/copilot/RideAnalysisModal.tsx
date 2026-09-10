import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
  Navigation,
  Car,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Volume2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { RideOpportunity } from '../../types';
import { useDriveWise } from '../../context/DriveWiseContext';
import { speakCopilotMessage, playCopilotSound } from '../../utils/copilotCalculations';
import { formatCurrency } from '../../utils/calculations';

interface RideAnalysisModalProps {
  ride: RideOpportunity | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RideAnalysisModal: React.FC<RideAnalysisModalProps> = ({
  ride,
  isOpen,
  onClose,
}) => {
  const { acceptRideOpportunity, rejectRideOpportunity, activeVehicleProfile } = useDriveWise();
  const [showCostBreakdown, setShowCostBreakdown] = useState(false);
  const [showRejectOptions, setShowRejectOptions] = useState(false);

  if (!isOpen || !ride) return null;

  const getScoreColor = (tier: string) => {
    switch (tier) {
      case 'Excelente':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          badge: 'bg-emerald-500 text-slate-950 font-black',
          glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]',
        };
      case 'Boa':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          badge: 'bg-amber-500 text-slate-950 font-black',
          glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]',
        };
      case 'Regular':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          badge: 'bg-orange-500 text-slate-950 font-black',
          glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]',
        };
      default:
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          badge: 'bg-rose-500 text-slate-950 font-black',
          glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]',
        };
    }
  };

  const getPlatformBadge = (platform: string) => {
    switch (platform) {
      case 'Uber':
        return 'bg-zinc-800 text-white border-zinc-700';
      case '99':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'InDrive':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    }
  };

  const style = getScoreColor(ride.scoreTier);

  const handleAccept = () => {
    acceptRideOpportunity(ride.id);
    onClose();
  };

  const handleReject = (reason: string) => {
    rejectRideOpportunity(ride.id, reason);
    setShowRejectOptions(false);
    onClose();
  };

  const handleVoiceReadout = () => {
    const text = `Nota ${ride.score}. ${ride.scoreTier}. Valor de ${ride.offeredValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Lucro estimado de ${ride.netProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. ${ride.recommendation || ride.scoreReason}`;
    speakCopilotMessage(text);
  };

  const rejectReasons = [
    'Valor baixo',
    'Longe do passageiro',
    'Trânsito',
    'Região ruim',
    'Horário ruim',
    'Outro motivo',
  ];

  return (
    <div
      id="ride-analysis-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="ride-analysis-modal-card"
        className="w-full max-w-lg bg-[#0C0C0D] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-[#07080A]">
          <div className="flex items-center gap-2.5">
            <span
              id="copilot-platform-badge"
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${getPlatformBadge(
                ride.platform
              )}`}
            >
              {ride.platform}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              DRIVEWISE Copilot
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-voice-readout"
              onClick={handleVoiceReadout}
              className="p-1.5 text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-colors border border-white/[0.06]"
              title="Ouvir análise por voz"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              id="btn-close-analysis-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-colors border border-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Main Score & Recommendation Card */}
          <div
            id="score-hero-card"
            className={`p-4 rounded-xl border ${style.bg} ${style.glow} flex flex-col gap-2 relative overflow-hidden`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider opacity-80 font-mono">
                  DRIVEWISE Ride Score
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight font-mono-num">
                    {ride.score}
                  </span>
                  <span className="text-sm font-semibold opacity-70 font-mono">/ 100</span>
                  <span
                    className={`ml-2 px-2.5 py-0.5 rounded-md text-xs uppercase font-mono font-bold ${style.badge}`}
                  >
                    {ride.scoreTier}
                  </span>
                </div>
              </div>

              {/* Offered Value Large */}
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block uppercase">
                  Valor Ofertado
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white font-mono-num">
                  {formatCurrency(ride.offeredValue)}
                </span>
                {ride.surgeMultiplier > 1.0 && (
                  <span className="inline-block mt-0.5 text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    Dinâmico {ride.surgeMultiplier}x
                  </span>
                )}
              </div>
            </div>

            {/* Recommendation line */}
            <div className="mt-2 pt-2 border-t border-white/[0.08] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
              <p className="text-sm font-medium text-slate-100 leading-snug">
                {ride.recommendation || ride.scoreReason}
              </p>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                Lucro Líquido
              </span>
              <span
                className={`text-lg font-extrabold mt-0.5 block font-mono-num ${
                  ride.netProfit > 15 ? 'text-emerald-400' : 'text-slate-200'
                }`}
              >
                {formatCurrency(ride.netProfit)}
              </span>
              <span className="text-[10px] text-slate-500 block">Após custos e desgaste</span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                R$ / KM Líquido
              </span>
              <span className="text-lg font-extrabold text-white mt-0.5 block font-mono-num">
                {formatCurrency(ride.netPerKm)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono-num">
                Bruto: {formatCurrency(ride.grossPerKm)}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                R$ / Hora Líquida
              </span>
              <span className="text-lg font-extrabold text-white mt-0.5 block font-mono-num">
                {formatCurrency(ride.netPerHour)}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono-num">
                Bruto: {formatCurrency(ride.grossPerHour)}
              </span>
            </div>

            <div className="bg-white/[0.03] border border-white/[0.06] p-3 rounded-xl">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide block">
                Deslocamento Vazio
              </span>
              <span
                className={`text-lg font-extrabold mt-0.5 block font-mono-num ${
                  ride.deadheadPercent > 30 ? 'text-rose-400' : 'text-slate-200'
                }`}
              >
                {ride.deadheadPercent}%
              </span>
              <span className="text-[10px] text-slate-400 block font-mono-num">
                {ride.distanceToPassengerKm} km até cliente
              </span>
            </div>
          </div>

          {/* Route & Distance Breakdown */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-white/[0.06]">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                Trajeto da Corrida
              </span>
              <span className="font-mono-num text-[11px]">
                Total: {(ride.distanceToPassengerKm + ride.estimatedTripDistanceKm).toFixed(1)} km •{' '}
                {ride.estimatedTimeToPassengerMin + ride.estimatedTripTimeMin} min
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
                  <span className="text-slate-300">
                    Até o passageiro: <strong className="text-white font-mono-num">{ride.distanceToPassengerKm} km</strong> ({ride.estimatedTimeToPassengerMin} min)
                  </span>
                </div>
                {ride.pickupAddress && (
                  <span className="text-slate-500 truncate max-w-[180px] text-right">
                    {ride.pickupAddress}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                  <span className="text-slate-300">
                    Viagem com cliente: <strong className="text-white font-mono-num">{ride.estimatedTripDistanceKm} km</strong> ({ride.estimatedTripTimeMin} min)
                  </span>
                </div>
                {ride.dropoffAddress && (
                  <span className="text-slate-500 truncate max-w-[180px] text-right">
                    {ride.dropoffAddress}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rule Alerts */}
          {ride.ruleAlerts && ride.ruleAlerts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
                Critérios e Alertas
              </span>
              <div className="space-y-1">
                {ride.ruleAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vehicle Cost Details Accordion */}
          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              id="btn-toggle-cost-breakdown"
              type="button"
              onClick={() => setShowCostBreakdown(!showCostBreakdown)}
              className="w-full px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-400" />
                Custos Operacionais ({activeVehicleProfile.name})
              </span>
              {showCostBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showCostBreakdown && (
              <div className="p-3.5 bg-[#080A0E] text-xs text-slate-400 space-y-2 border-t border-white/[0.06] animate-fadeIn">
                <div className="flex justify-between font-mono-num">
                  <span>Custo total estimado da viagem:</span>
                  <span className="text-slate-200 font-semibold">
                    {formatCurrency(ride.offeredValue - ride.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between font-mono-num">
                  <span>Consumo estimado de combustível:</span>
                  <span className="text-slate-200 font-semibold">
                    {(
                      (ride.distanceToPassengerKm + ride.estimatedTripDistanceKm) /
                      (activeVehicleProfile.avgConsumptionKmPerLiter || 10)
                    ).toFixed(2)}{' '}
                    L (~
                    {formatCurrency(
                      ((ride.distanceToPassengerKm + ride.estimatedTripDistanceKm) /
                        (activeVehicleProfile.avgConsumptionKmPerLiter || 10)) *
                        (activeVehicleProfile.avgFuelPrice || 5.89)
                    )}
                    )
                  </span>
                </div>
                <div className="flex justify-between font-mono-num">
                  <span>Manutenção + pneus + depreciação:</span>
                  <span className="text-slate-200 font-semibold">
                    {formatCurrency(
                      (ride.distanceToPassengerKm + ride.estimatedTripDistanceKm) *
                        ((activeVehicleProfile.perKmVariableCosts?.maintenancePerKm || 0.12) +
                          (activeVehicleProfile.perKmVariableCosts?.tiresPerKm || 0.08) +
                          (activeVehicleProfile.perKmVariableCosts?.depreciationPerKm || 0.15))
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-white/[0.06]">
                  Valores calculados com base no seu perfil de veículo ativo no DRIVEWISE.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-[#07080A] space-y-2">
          {!showRejectOptions ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-modal-reject-ride"
                type="button"
                onClick={() => setShowRejectOptions(true)}
                className="py-3.5 px-4 rounded-xl bg-white/[0.06] hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 font-bold text-sm border border-white/[0.08] hover:border-rose-500/30 transition-all flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Recusar Corrida
              </button>

              <button
                id="btn-modal-accept-ride"
                type="button"
                onClick={handleAccept}
                className="py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aceitar Corrida
              </button>
            </div>
          ) : (
            <div className="space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                  Motivo da Recusa:
                </span>
                <button
                  type="button"
                  onClick={() => setShowRejectOptions(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {rejectReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => handleReject(reason)}
                    className="p-2 text-xs font-medium rounded-lg bg-white/[0.06] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/40 transition-colors truncate"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
