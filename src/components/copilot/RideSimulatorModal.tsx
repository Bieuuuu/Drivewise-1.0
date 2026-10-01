import React, { useState } from 'react';
import {
  X,
  Zap,
  Calculator,
  CheckCircle2,
  XCircle,
  Navigation,
} from 'lucide-react';
import { PlatformType } from '../../types';
import { useDriveWise } from '../../context/DriveWiseContext';
import {
  evaluateRideOpportunity,
  RideEvaluationInput,
} from '../../utils/copilotCalculations';

interface RideSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RideSimulatorModal: React.FC<RideSimulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    decisionRules,
    activeVehicleProfile,
    addRideOpportunity,
    updateOverlayPref,
    user,
    sessions,
    activeSession,
    currentDateStr,
  } = useDriveWise();

  const [platform, setPlatform] = useState<PlatformType>('Uber');
  const [offeredValueInput, setOfferedValueInput] = useState<string>('');
  const [distanceToPassengerInput, setDistanceToPassengerInput] = useState<string>('1.0');
  const [estimatedTimeToPassengerInput, setEstimatedTimeToPassengerInput] = useState<string>('3');
  const [estimatedTripDistanceInput, setEstimatedTripDistanceInput] = useState<string>('6.0');
  const [estimatedTripTimeInput, setEstimatedTripTimeInput] = useState<string>('15');
  const [extraCostsInput, setExtraCostsInput] = useState<string>('0');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [dropoffAddress, setDropoffAddress] = useState<string>('');

  if (!isOpen) return null;

  const offeredValue = Math.max(0, parseFloat(offeredValueInput.replace(',', '.')) || 0);
  const distanceToPassengerKm = Math.max(0, parseFloat(distanceToPassengerInput.replace(',', '.')) || 0);
  const estimatedTimeToPassengerMin = Math.max(0, parseInt(estimatedTimeToPassengerInput, 10) || 0);
  const estimatedTripDistanceKm = Math.max(0.1, parseFloat(estimatedTripDistanceInput.replace(',', '.')) || 0.1);
  const estimatedTripTimeMin = Math.max(1, parseInt(estimatedTripTimeInput, 10) || 1);
  const extraCosts = Math.max(0, parseFloat(extraCostsInput.replace(',', '.')) || 0);

  const input: RideEvaluationInput = {
    platform,
    offeredValue,
    distanceToPassengerKm,
    estimatedTimeToPassengerMin,
    estimatedTripDistanceKm,
    estimatedTripTimeMin,
    surgeMultiplier: 1.0,
    extraCosts,
    pickupAddress: pickupAddress.trim() || `Corrida ${platform}`,
    dropoffAddress:
      dropoffAddress.trim() ||
      `${(distanceToPassengerKm + estimatedTripDistanceKm).toFixed(1)} km totais`,
  };

  const todayEarnings =
    sessions
      .filter((s) => s.date === currentDateStr && s.status === 'completed')
      .reduce((a, b) => a + b.income, 0) + (activeSession ? activeSession.income : 0);

  const evalResult = evaluateRideOpportunity(
    input,
    decisionRules,
    activeVehicleProfile,
    todayEarnings,
    user.dailyGoal || 400
  );

  const buildRidePayload = (status: 'accepted' | 'completed' | 'rejected') => ({
    userId: user.email || 'user-1',
    workSessionId: activeSession?.id,
    platform,
    status,
    offeredValue,
    finalValue: status === 'completed' || status === 'accepted' ? offeredValue : undefined,
    distanceToPassengerKm,
    estimatedTripDistanceKm,
    actualTripDistanceKm: status === 'completed' ? estimatedTripDistanceKm : undefined,
    estimatedTimeToPassengerMin,
    estimatedTripTimeMin,
    actualTripTimeMin: status === 'completed' ? estimatedTripTimeMin : undefined,
    surgeMultiplier: 1.0,
    extraCosts,
    estimatedProfit: evalResult.netProfit,
    netProfit: evalResult.netProfit,
    grossPerKm: evalResult.grossPerKm,
    netPerKm: evalResult.netPerKm,
    grossPerHour: evalResult.grossPerHour,
    netPerHour: evalResult.netPerHour,
    deadheadPercent: evalResult.deadheadPercent,
    score: evalResult.score,
    scoreTier: evalResult.scoreTier,
    scoreReason: evalResult.scoreReason,
    recommendation: evalResult.recommendation,
    ruleAlerts: evalResult.ruleAlerts,
    decisionReason: status === 'rejected' ? 'Recusada após análise na calculadora' : undefined,
    pickupAddress: input.pickupAddress,
    dropoffAddress: input.dropoffAddress,
    timestamp: new Date().toISOString(),
  });

  const handleSaveCompletedRide = () => {
    if (offeredValue <= 0) return;
    addRideOpportunity(buildRidePayload('completed'));
    setOfferedValueInput('');
    onClose();
  };

  const handleStartInRouteRide = () => {
    if (offeredValue <= 0) return;
    addRideOpportunity(buildRidePayload('accepted'));
    updateOverlayPref({ isEnabled: true, isExpanded: true });
    setOfferedValueInput('');
    onClose();
  };

  const handleSaveRejectedRide = () => {
    if (offeredValue <= 0) return;
    addRideOpportunity(buildRidePayload('rejected'));
    setOfferedValueInput('');
    onClose();
  };

  const getScoreColor = (tier: string) => {
    switch (tier) {
      case 'Excelente':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Boa':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'Regular':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      default:
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div
      id="ride-simulator-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="ride-simulator-modal-card"
        className="w-full max-w-xl bg-[#0C0E14] border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Calculadora e Registro Real de Corrida
              </h2>
              <p className="text-xs text-slate-400">
                Calcule o lucro líquido real da chamada ou lance uma viagem no seu turno
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Platform Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Plataforma da Corrida
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Uber', '99', 'InDrive', 'Outros'] as PlatformType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(p)}
                  className={`py-2.5 text-xs font-bold rounded-xl border transition-colors ${
                    platform === p
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:bg-white/[0.08]'
                  }`}
                >
                  {p === 'Outros' ? 'Particular' : p}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Ride Numbers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Offered Value */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-emerald-400 block mb-1">
                Valor da Corrida Ofertado (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">R$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.50"
                  placeholder="Ex: 24,50"
                  value={offeredValueInput}
                  onChange={(e) => setOfferedValueInput(e.target.value)}
                  autoFocus
                  className="w-full bg-black/50 border-2 border-emerald-500/40 focus:border-emerald-400 rounded-xl pl-10 pr-4 py-2.5 text-lg text-white font-mono font-extrabold focus:outline-none"
                />
              </div>
            </div>

            {/* Trip Distance with Passenger */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Distância da viagem (km)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                value={estimatedTripDistanceInput}
                onChange={(e) => setEstimatedTripDistanceInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Trip Time */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tempo da viagem (min)
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                value={estimatedTripTimeInput}
                onChange={(e) => setEstimatedTripTimeInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Pickup Distance */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Distância até passageiro (km)
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.2"
                value={distanceToPassengerInput}
                onChange={(e) => setDistanceToPassengerInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Pickup Time */}
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Tempo até passageiro (min)
              </label>
              <input
                type="number"
                inputMode="numeric"
                step="1"
                value={estimatedTimeToPassengerInput}
                onChange={(e) => setEstimatedTimeToPassengerInput(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Optional Origin / Destination / Extra Costs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Bairro Origem (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Centro"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Bairro Destino (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Aeroporto"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Pedágio / Taxa Extra (R$)
              </label>
              <input
                type="number"
                step="0.5"
                value={extraCostsInput}
                onChange={(e) => setExtraCostsInput(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* LIVE PROFITABILITY VERDICT */}
          {offeredValue > 0 ? (
            <div
              id="simulation-live-result"
              className={`p-4 rounded-2xl border ${getScoreColor(evalResult.scoreTier)} space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-3xl font-mono font-black">{evalResult.score}</span>
                  <div>
                    <span className="text-xs uppercase font-extrabold block">
                      {evalResult.scoreTier === 'Excelente'
                        ? '🟢 COMPENSA ACEITAR'
                        : evalResult.scoreTier === 'Boa' || evalResult.scoreTier === 'Regular'
                        ? '🟡 ATENÇÃO (MARGEM MÉDIA)'
                        : '🔴 NÃO COMPENSA'}
                    </span>
                    <span className="text-[11px] opacity-80 block">
                      Total: {(distanceToPassengerKm + estimatedTripDistanceKm).toFixed(1)} km •{' '}
                      {estimatedTimeToPassengerMin + estimatedTripTimeMin} min
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                    Lucro Líquido Real
                  </span>
                  <span className="text-2xl font-mono font-black">
                    {evalResult.netProfit >= 0 ? '+' : ''}
                    {evalResult.netProfit.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-200 bg-black/40 p-2.5 rounded-xl border border-white/[0.06]">
                {evalResult.recommendation}
              </p>

              {/* Rates */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="bg-black/40 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 uppercase block">R$/km Líq</span>
                  <span className="font-extrabold text-white">
                    R$ {evalResult.netPerKm.toFixed(2)}
                  </span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 uppercase block">R$/Hora Líq</span>
                  <span className="font-extrabold text-white">
                    R$ {evalResult.netPerHour.toFixed(0)}
                  </span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 uppercase block">Km Busca</span>
                  <span
                    className={`font-extrabold ${
                      evalResult.deadheadPercent > 30 ? 'text-rose-400' : 'text-slate-200'
                    }`}
                  >
                    {evalResult.deadheadPercent}%
                  </span>
                </div>
                <div className="bg-black/40 p-2 rounded-xl border border-white/[0.06]">
                  <span className="text-[9px] text-slate-400 uppercase block">Custo Real</span>
                  <span className="font-extrabold text-rose-300">
                    -R$ {evalResult.estimatedTripCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-slate-400">
              Digite o <strong>Valor da Corrida (R$)</strong> acima para ver instantaneamente o lucro líquido descontando combustível e manutenção.
            </div>
          )}
        </div>

        {/* Footer Real Operational Actions */}
        <div className="p-4 border-t border-white/[0.08] bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            disabled={offeredValue <= 0}
            onClick={handleSaveRejectedRide}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Registrar Recusa</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-trigger-overlay"
              type="button"
              disabled={offeredValue <= 0}
              onClick={handleStartInRouteRide}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 text-sky-300 border border-sky-500/35 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Aceitar (Em Rota)</span>
            </button>
            <button
              id="btn-trigger-copilot"
              type="button"
              disabled={offeredValue <= 0}
              onClick={handleSaveCompletedRide}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Concluir e Somar no Dia</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
