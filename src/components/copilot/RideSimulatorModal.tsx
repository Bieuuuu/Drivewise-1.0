import React, { useState } from 'react';
import {
  X,
  Play,
  Sparkles,
  Zap,
  TrendingUp,
  Navigation,
  Clock,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
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
    setIsRideAnalysisModalOpen,
    updateOverlayPref,
    triggerSimultaneousRides,
    user,
    sessions,
    activeSession,
    currentDateStr,
  } = useDriveWise();

  const [platform, setPlatform] = useState<PlatformType>('Uber');
  const [offeredValue, setOfferedValue] = useState<number>(34.5);
  const [distanceToPassengerKm, setDistanceToPassengerKm] = useState<number>(1.4);
  const [estimatedTimeToPassengerMin, setEstimatedTimeToPassengerMin] = useState<number>(4);
  const [estimatedTripDistanceKm, setEstimatedTripDistanceKm] = useState<number>(11.2);
  const [estimatedTripTimeMin, setEstimatedTripTimeMin] = useState<number>(22);
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.2);
  const [extraCosts, setExtraCosts] = useState<number>(0);
  const [pickupAddress, setPickupAddress] = useState<string>('R. Oscar Freire, 1100');
  const [dropoffAddress, setDropoffAddress] = useState<string>('Av. Paulista, 1578 (Masp)');

  if (!isOpen) return null;

  // Real-time evaluation calculation
  const input: RideEvaluationInput = {
    platform,
    offeredValue,
    distanceToPassengerKm,
    estimatedTimeToPassengerMin,
    estimatedTripDistanceKm,
    estimatedTripTimeMin,
    surgeMultiplier,
    extraCosts,
    pickupAddress,
    dropoffAddress,
  };

  const todayEarnings = sessions
    .filter((s) => s.date === currentDateStr && s.status === 'completed')
    .reduce((a, b) => a + b.income, 0) + (activeSession ? activeSession.income : 0);

  const evalResult = evaluateRideOpportunity(
    input,
    decisionRules,
    activeVehicleProfile,
    todayEarnings,
    user.dailyGoal || 400
  );

  // Presets
  const applyPreset = (presetKey: 'lucrativa' | 'dinamico_longe' | 'ilusoria' | 'padrao') => {
    if (presetKey === 'lucrativa') {
      setPlatform('Uber');
      setOfferedValue(38.0);
      setDistanceToPassengerKm(0.8);
      setEstimatedTimeToPassengerMin(3);
      setEstimatedTripDistanceKm(9.5);
      setEstimatedTripTimeMin(18);
      setSurgeMultiplier(1.3);
      setExtraCosts(0);
      setPickupAddress('Av. Brig. Faria Lima, 3477');
      setDropoffAddress('Vila Nova Conceição');
    } else if (presetKey === 'dinamico_longe') {
      setPlatform('99');
      setOfferedValue(26.0);
      setDistanceToPassengerKm(4.8);
      setEstimatedTimeToPassengerMin(14);
      setEstimatedTripDistanceKm(6.0);
      setEstimatedTripTimeMin(16);
      setSurgeMultiplier(1.5);
      setExtraCosts(0);
      setPickupAddress('Bela Vista / Bixiga');
      setDropoffAddress('Liberdade');
    } else if (presetKey === 'ilusoria') {
      setPlatform('InDrive');
      setOfferedValue(75.0);
      setDistanceToPassengerKm(3.5);
      setEstimatedTimeToPassengerMin(10);
      setEstimatedTripDistanceKm(42.0);
      setEstimatedTripTimeMin(65);
      setSurgeMultiplier(1.0);
      setExtraCosts(0);
      setPickupAddress('Centro de São Paulo');
      setDropoffAddress('Mogi das Cruzes (Sem retorno)');
    } else if (presetKey === 'padrao') {
      setPlatform('Uber');
      setOfferedValue(24.5);
      setDistanceToPassengerKm(1.2);
      setEstimatedTimeToPassengerMin(4);
      setEstimatedTripDistanceKm(8.0);
      setEstimatedTripTimeMin(19);
      setSurgeMultiplier(1.0);
      setExtraCosts(0);
      setPickupAddress('Pinheiros');
      setDropoffAddress('Itaim Bibi');
    }
  };

  const handleLaunchToCopilot = () => {
    const newRide = addRideOpportunity({
      userId: user.email,
      platform,
      status: 'received',
      offeredValue,
      distanceToPassengerKm,
      estimatedTripDistanceKm,
      estimatedTimeToPassengerMin,
      estimatedTripTimeMin,
      surgeMultiplier,
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
      pickupAddress,
      dropoffAddress,
      timestamp: new Date().toISOString(),
    });

    onClose();
    setIsRideAnalysisModalOpen(true);
  };

  const handleLaunchToOverlay = () => {
    addRideOpportunity({
      userId: user.email,
      platform,
      status: 'received',
      offeredValue,
      distanceToPassengerKm,
      estimatedTripDistanceKm,
      estimatedTimeToPassengerMin,
      estimatedTripTimeMin,
      surgeMultiplier,
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
      pickupAddress,
      dropoffAddress,
      timestamp: new Date().toISOString(),
    });

    updateOverlayPref({ isEnabled: true, isExpanded: true });
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        id="ride-simulator-modal-card"
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Calculadora e Teste de Corrida</h2>
              <p className="text-xs text-slate-400">
                Avalie qualquer proposta de corrida e calcule o lucro líquido real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Quick Presets */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Cenários de Teste Rápidos
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('lucrativa')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-emerald-950/30 border border-slate-700 hover:border-emerald-500/40 text-left transition-colors"
              >
                <span className="text-xs font-bold text-emerald-400 block">🟢 Lucrativa</span>
                <span className="text-[11px] text-slate-400 block truncate">Faria Lima curta</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('dinamico_longe')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-amber-950/30 border border-slate-700 hover:border-amber-500/40 text-left transition-colors"
              >
                <span className="text-xs font-bold text-amber-400 block">🟠 Dinâmico Longe</span>
                <span className="text-[11px] text-slate-400 block truncate">Passageiro 4.8 km</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ilusoria')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-500/40 text-left transition-colors"
              >
                <span className="text-xs font-bold text-rose-400 block">🔴 Ilusória</span>
                <span className="text-[11px] text-slate-400 block truncate">R$ 75,00 mas 42 km</span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset('padrao')}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-950/30 border border-slate-700 hover:border-cyan-500/40 text-left transition-colors"
              >
                <span className="text-xs font-bold text-cyan-400 block">🟡 Padrão Média</span>
                <span className="text-[11px] text-slate-400 block truncate">Viagem típica 8 km</span>
              </button>
            </div>

            {/* Special Multi-App Interceptor Simulator */}
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300">
                  <Zap className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <span className="text-xs font-mono font-bold text-white block">
                    Modo Interceptador: Uber & 99 Simultâneas
                  </span>
                  <span className="text-[11px] text-slate-300 block">
                    Dispara 2 chamadas concorrentes para testar a seleção por abas no Copiloto.
                  </span>
                </div>
              </div>
              <button
                type="button"
                id="btn-simulate-dual-dispute"
                onClick={() => {
                  triggerSimultaneousRides();
                  onClose();
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-mono font-black transition-all shadow-md shadow-amber-400/20 whitespace-nowrap"
              >
                ⚡ Disparar Disputa p/ Overlay
              </button>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Platform Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Plataforma de Aplicativo
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['Uber', '99', 'InDrive', 'Outros'] as PlatformType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      platform === p
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Offered Value */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Valor Ofertado na Tela (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400">R$</span>
                <input
                  type="number"
                  step="0.50"
                  value={offeredValue}
                  onChange={(e) => setOfferedValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Distance to Passenger */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Distância até o passageiro (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={distanceToPassengerKm}
                onChange={(e) => setDistanceToPassengerKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Time to Passenger */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tempo até o passageiro (min)
              </label>
              <input
                type="number"
                step="1"
                value={estimatedTimeToPassengerMin}
                onChange={(e) => setEstimatedTimeToPassengerMin(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Trip Distance */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Distância da viagem com cliente (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={estimatedTripDistanceKm}
                onChange={(e) => setEstimatedTripDistanceKm(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Trip Time */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tempo estimado da viagem (min)
              </label>
              <input
                type="number"
                step="1"
                value={estimatedTripTimeMin}
                onChange={(e) => setEstimatedTripTimeMin(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Surge Multiplier */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Tarifa Dinâmica (Multiplicador)
              </label>
              <select
                value={surgeMultiplier}
                onChange={(e) => setSurgeMultiplier(parseFloat(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
              >
                <option value={1.0}>1.0x (Normal)</option>
                <option value={1.1}>1.1x (+10%)</option>
                <option value={1.2}>1.2x (+20%)</option>
                <option value={1.3}>1.3x (+30%)</option>
                <option value={1.4}>1.4x (+40%)</option>
                <option value={1.5}>1.5x (+50%)</option>
                <option value={1.8}>1.8x (+80%)</option>
                <option value={2.0}>2.0x (2x)</option>
              </select>
            </div>

            {/* Extra costs */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Custos Extras / Pedágio (R$)
              </label>
              <input
                type="number"
                step="1"
                value={extraCosts}
                onChange={(e) => setExtraCosts(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Ponto de Partida
              </label>
              <input
                type="text"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Ponto de Destino
              </label>
              <input
                type="text"
                value={dropoffAddress}
                onChange={(e) => setDropoffAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* LIVE SIMULATION RESULT BOX */}
          <div
            id="simulation-live-result"
            className={`p-4 rounded-xl border ${getScoreColor(
              evalResult.scoreTier
            )} space-y-3`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black">{evalResult.score}</span>
                <div>
                  <span className="text-xs uppercase font-extrabold block">
                    {evalResult.scoreTier}
                  </span>
                  <span className="text-[11px] opacity-80 block">Score em Tempo Real</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase text-slate-400 font-semibold block">
                  Lucro Líquido Estimado
                </span>
                <span className="text-2xl font-black">
                  +{' '}
                  {evalResult.netProfit.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </span>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-200 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              {evalResult.recommendation}
            </p>

            {/* Rates */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">R$/km Líq</span>
                <span className="font-extrabold text-white">R$ {evalResult.netPerKm.toFixed(2)}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">R$/Hora Líq</span>
                <span className="font-extrabold text-white">R$ {evalResult.netPerHour.toFixed(0)}</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Km Vazio</span>
                <span
                  className={`font-extrabold ${
                    evalResult.deadheadPercent > 30 ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {evalResult.deadheadPercent}%
                </span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Custo Total</span>
                <span className="font-extrabold text-slate-300">
                  R$ {evalResult.estimatedTripCost.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs text-slate-400 hover:text-white"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              id="btn-trigger-overlay"
              type="button"
              onClick={handleLaunchToOverlay}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
            >
              Disparar p/ Overlay
            </button>
            <button
              id="btn-trigger-copilot"
              type="button"
              onClick={handleLaunchToCopilot}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              Ver Análise Completa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
