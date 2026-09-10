import React, { useState } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Fuel,
  Volume2,
  Bell,
  MapPin,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Gauge,
  HelpCircle,
  LogIn,
  Check,
  Smartphone,
  Star,
  Zap,
  Activity,
  Car,
  Compass,
  Lock,
  ChevronRight,
  Sliders,
  Award,
  Layers,
} from 'lucide-react';
import { DriveWiseLogo } from './DriveWiseLogo';
import { FuelType } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    updateUser,
    activeVehicleProfile,
    updateVehicleProfile,
    decisionRules,
    updateDecisionRules,
    drivingMode,
    updateDrivingMode,
    overlayPref,
    updateOverlayPref,
    firebaseUser,
    loginWithGoogle,
    hasOverlayPermission,
    grantOverlayPermission,
  } = useDriveWise();

  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // Local form states for step 3 (Calibração do Carro)
  const [vehicleModel, setVehicleModel] = useState(user.vehicleModel || 'Chevrolet Onix 1.0');
  const [fuelType, setFuelType] = useState<FuelType>(user.fuelType || 'Etanol');
  const [consumption, setConsumption] = useState<number>(user.avgConsumptionKmPerLiter || 9.5);
  const [fuelPrice, setFuelPrice] = useState<number>(user.avgFuelPrice || 3.89);
  const [dailyGoal, setDailyGoal] = useState<number>(user.dailyGoal || 280);
  const [minKmPrice, setMinKmPrice] = useState<number>(decisionRules.minNetPerKm || 2.2);

  // Sound and notification toggles for step 4
  const [soundEnabled, setSoundEnabled] = useState(drivingMode.soundAlerts);
  const [voiceEnabled, setVoiceEnabled] = useState(drivingMode.voiceAlerts);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [gpsRequested, setGpsRequested] = useState(false);

  // Cloud action state for step 5
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [cloudSuccess, setCloudSuccess] = useState(false);

  if (!isOpen) return null;

  // Real-time calculation of fuel cost per km
  const fuelCostPerKm = consumption > 0 ? fuelPrice / consumption : 0.41;
  const estimatedMaintenancePerKm = activeVehicleProfile?.perKmVariableCosts?.maintenancePerKm || 0.22;
  const totalCostPerKm = fuelCostPerKm + estimatedMaintenancePerKm;
  const suggestedMinPerKm = Math.max(1.8, +(totalCostPerKm * 2.1).toFixed(2));
  const profitMarginPercent = totalCostPerKm > 0 ? Math.round(((suggestedMinPerKm - totalCostPerKm) / suggestedMinPerKm) * 100) : 50;

  const handleNextStep = () => {
    if (step === 3) {
      updateUser({
        vehicleModel,
        fuelType,
        avgConsumptionKmPerLiter: Number(consumption),
        avgFuelPrice: Number(fuelPrice),
        dailyGoal: Number(dailyGoal),
      });

      updateVehicleProfile(activeVehicleProfile.id, {
        fuelType,
        avgFuelPrice: Number(fuelPrice),
        avgConsumptionKmPerLiter: Number(consumption),
      });

      updateDecisionRules({
        minNetPerKm: Number(minKmPrice),
        costPerKm: +(fuelCostPerKm + estimatedMaintenancePerKm).toFixed(2),
      });
    }

    if (step === 4) {
      updateDrivingMode({
        soundAlerts: soundEnabled,
        voiceAlerts: voiceEnabled,
      });
      updateOverlayPref({
        enableSoundAlerts: soundEnabled,
        enableVoiceAlerts: voiceEnabled,
      });
    }

    if (step < totalSteps) {
      setStep((prev) => prev + 1);
    } else {
      handleFinishOnboarding();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      setIsAuthenticating(true);
      const res = await loginWithGoogle();
      setIsAuthenticating(false);
      if (res.success) {
        setCloudSuccess(true);
      }
    } catch {
      setIsAuthenticating(false);
    }
  };

  const handleFinishOnboarding = () => {
    try {
      localStorage.setItem('drivewise_cockpit_onboarding_v3', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  const requestGps = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsRequested(true),
        () => setGpsRequested(true)
      );
    } else {
      setGpsRequested(true);
    }
  };

  const stepMeta = [
    { num: 1, title: 'Inteligência Semafórica', sub: 'Decisão em 2 segundos' },
    { num: 2, title: 'Eficiência Financeira', sub: 'Redução de KM morto' },
    { num: 3, title: 'Calibração do Cockpit', sub: 'Seu custo real por KM' },
    { num: 4, title: 'Telemetria & Áudio', sub: 'Alertas em viva-voz' },
    { num: 5, title: 'Ativação & Backup', sub: '7 dias VIP sem cartão' },
  ];

  return (
    <div
      id="onboarding-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-[#0C0E12] border border-white/[0.12] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Subtle Ambient Accent Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent blur-2xl pointer-events-none" />

        {/* Top Header & Trackers */}
        <div className="relative pt-5 px-6 pb-4 border-b border-white/[0.07] bg-[#0A0C0F]/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center p-1.5 shadow-inner">
                <DriveWiseLogo size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-slate-100 uppercase">
                    DriveWise OS
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                    v3.2 PRO
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {stepMeta[step - 1].title} — {stepMeta[step - 1].sub}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Etapa</span>
                <span className="text-xs font-mono font-bold text-emerald-400">0{step} / 0{totalSteps}</span>
              </div>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-lg border border-transparent hover:border-white/[0.08]"
              >
                Pular
              </button>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="grid grid-cols-5 gap-1.5">
            {stepMeta.map((s) => (
              <div
                key={s.num}
                className="relative flex flex-col gap-1 cursor-pointer"
                onClick={() => setStep(s.num)}
              >
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    s.num === step
                      ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                      : s.num < step
                      ? 'bg-emerald-500/40'
                      : 'bg-white/[0.08]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Content Container */}
        <div className="relative p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* STEP 1: O Semáforo em 2 Segundos - Estilo HUD de Corrida */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Copiloto de Decisão em Tempo Real
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Filtre corridas lucrativas sem desviar a atenção da pista
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                  O DriveWise processa instantaneamente o valor da chamada, tempo estimado, trajeto de busca e custo de combustível do seu carro.
                </p>
              </div>

              {/* HUD Cards Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                
                {/* VERDE - ACEITE */}
                <div className="relative rounded-2xl bg-gradient-to-b from-[#0F1E16] to-[#0A130E] border border-emerald-500/40 p-3.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      ACEITAR • ALTO LUCRO
                    </span>
                    <span className="text-[10px] font-mono text-emerald-300/80 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                      UberX • 14 min
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Valor Bruto</span>
                      <span className="text-lg font-mono font-bold text-white">R$ 38,50</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-2 rounded-xl border border-emerald-500/20">
                      <div>
                        <div className="text-[9px] font-mono uppercase text-slate-500">Rentabilidade</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">R$ 2,75<span className="text-[9px] text-slate-400 font-normal">/km</span></div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono uppercase text-slate-500">Ganho/Hora</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">R$ 68,20<span className="text-[9px] text-slate-400 font-normal">/h</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lucro Líquido Real:</span>
                    <span className="font-mono font-bold text-emerald-300">+ R$ 28,10</span>
                  </div>
                </div>

                {/* VERMELHO - RECUSE */}
                <div className="relative rounded-2xl bg-gradient-to-b from-[#1C0E11] to-[#12080A] border border-rose-500/40 p-3.5 flex flex-col justify-between shadow-[0_8px_24px_rgba(244,63,94,0.08)]">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-extrabold uppercase tracking-wider text-rose-400">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      RECUSAR • PREJUÍZO
                    </span>
                    <span className="text-[10px] font-mono text-rose-300/80 bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                      99Pop • 25 min
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">Valor Bruto</span>
                      <span className="text-lg font-mono font-bold text-white">R$ 11,20</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 bg-black/40 p-2 rounded-xl border border-rose-500/20">
                      <div>
                        <div className="text-[9px] font-mono uppercase text-slate-500">Rentabilidade</div>
                        <div className="text-sm font-mono font-bold text-rose-400">R$ 1,42<span className="text-[9px] text-slate-400 font-normal">/km</span></div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono uppercase text-slate-500">Ganho/Hora</div>
                        <div className="text-sm font-mono font-bold text-rose-400">R$ 22,10<span className="text-[9px] text-slate-400 font-normal">/h</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Lucro Líquido Real:</span>
                    <span className="font-mono font-bold text-rose-300">- R$ 1,40</span>
                  </div>
                </div>

              </div>

              {/* Technical Precision Footer */}
              <div className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Critérios configuráveis: Você define o valor mínimo aceitável por quilômetro e por hora nas configurações.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Inteligência Financeira e Prova Social */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <TrendingUp className="w-3 h-3 text-sky-400" />
                  Métricas de Eficiência Operacional
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Mais lucro com menos quilômetros rodados
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rodar sem critério destrói o carro em pneus, trocas de óleo e desvalorização. O DriveWise atua como seu diretor financeiro no banco do passageiro.
                </p>
              </div>

              {/* Data Benchmarks */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Economia Combustível</span>
                  <div className="text-xl font-mono font-bold text-emerald-400 my-1">-32%</div>
                  <span className="text-[10px] text-slate-400">Menos deslocamento inútil</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Média/Hora</span>
                  <div className="text-xl font-mono font-bold text-sky-400 my-1">R$ 62</div>
                  <span className="text-[10px] text-slate-400">Em corridas filtradas</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col justify-between">
                  <span className="text-[10px] font-mono uppercase text-slate-500">Meta Batida</span>
                  <div className="text-xl font-mono font-bold text-amber-400 my-1">3h Antes</div>
                  <span className="text-[10px] text-slate-400">Mais tempo com a família</span>
                </div>
              </div>

              {/* Driver Community Feedback */}
              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.06] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-mono text-xs font-bold text-emerald-400 shrink-0">
                    MS
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Marcio Souza • São Paulo (SP)</span>
                      <div className="flex text-amber-400 text-[10px]">★★★★★</div>
                    </div>
                    <p className="text-[11px] text-slate-400 italic leading-relaxed">
                      "Eu achava que R$ 1,80/km era bom até o app me mostrar que meu custo era R$ 0,65. Passei a só pegar acima de R$ 2,50 e meu faturamento líquido subiu R$ 1.400 no mês."
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.06] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center font-mono text-xs font-bold text-sky-400 shrink-0">
                    RC
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200">Rodrigo Camargo • Curitiba (PR)</span>
                      <div className="flex text-amber-400 text-[10px]">★★★★★</div>
                    </div>
                    <p className="text-[11px] text-slate-400 italic leading-relaxed">
                      "A sincronização com o carro calibrado é outro nível. Não é uma régua burra de app genérico, ele calcula de acordo com o meu consumo no Etanol."
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: O GRANDE DIFERENCIAL - Cockpit de Calibração Real */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Gauge className="w-3 h-3 text-emerald-400" />
                  Calibração Automotiva
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Qual é o custo real do seu veículo por quilômetro?
                </h2>
                <p className="text-xs text-slate-400">
                  Insira os dados da sua máquina para calibrar os limites matemáticos do copiloto.
                </p>
              </div>

              {/* Interactive Vehicle Telemetry Inputs */}
              <div className="space-y-3.5 bg-[#090B0E] p-4 rounded-2xl border border-white/[0.07]">
                
                {/* Vehicle Model & Fuel Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Modelo do Carro
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Ex: Chevrolet Onix 1.0"
                        className="w-full bg-white/[0.03] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                      />
                      <Car className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Combustível Atual
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as FuelType)}
                      className="w-full bg-[#121418] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60 transition-colors"
                    >
                      <option value="Etanol">Etanol (Álcool)</option>
                      <option value="Gasolina">Gasolina Comum / Aditivada</option>
                      <option value="GNV">Gás Natural Veicular (GNV)</option>
                      <option value="Diesel">Diesel S10</option>
                      <option value="Eletricidade">100% Elétrico / Híbrido</option>
                    </select>
                  </div>
                </div>

                {/* Efficiency & Fuel Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Consumo Urbano</label>
                      <span className="text-[11px] font-mono font-bold text-slate-300">{consumption} km/L</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      max="30"
                      value={consumption}
                      onChange={(e) => setConsumption(Number(e.target.value))}
                      className="w-full bg-white/[0.03] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-mono uppercase text-slate-400">Preço do Litro</label>
                      <span className="text-[11px] font-mono font-bold text-slate-300">R$ {fuelPrice.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      min="1"
                      max="15"
                      value={fuelPrice}
                      onChange={(e) => setFuelPrice(Number(e.target.value))}
                      className="w-full bg-white/[0.03] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>
                </div>

                {/* Daily Target Slider */}
                <div className="pt-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase text-slate-400">Meta Diária de Faturamento</span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      R$ {dailyGoal},00 / dia
                    </span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="600"
                    step="20"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(Number(e.target.value))}
                    className="w-full accent-emerald-400 h-1.5 bg-white/[0.08] rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                    <span>R$ 120/dia (Part-time)</span>
                    <span>R$ 350/dia (Padrão)</span>
                    <span>R$ 600/dia (Intenso)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Telemetry Calculation Display */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase text-emerald-400 font-semibold">Custo Operacional Total</div>
                  <div className="text-base font-mono font-bold text-white mt-0.5">
                    R$ {totalCostPerKm.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ km rodado</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    R$ {fuelCostPerKm.toFixed(2)} combustível + R$ {estimatedMaintenancePerKm.toFixed(2)} desgaste
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-slate-400">KM Mínimo Sugerido</div>
                  <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                    ≥ R$ {suggestedMinPerKm.toFixed(2)}
                  </div>
                  <span className="inline-block text-[9px] font-mono font-semibold text-emerald-300 bg-emerald-500/20 px-1.5 py-0.2 rounded">
                    ~{profitMarginPercent}% margem líquida
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Telemetria & Permissões do Sistema */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Volume2 className="w-3 h-3 text-purple-400" />
                  Cabine Hands-Free
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Feedback Sonoro e Odômetro Digital
                </h2>
                <p className="text-xs text-slate-400">
                  Mantenha a atenção na direção. O copiloto sintetiza o parecer de cada corrida em áudio para você não precisar tocar no celular.
                </p>
              </div>

              {/* System Switches */}
              <div className="space-y-2.5">
                
                {/* Voice & Sound Alerts */}
                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Alertas em Viva-Voz na Cabine</div>
                      <div className="text-[11px] text-slate-400">Emite bipe e fala "Aceite: R$ 2,80 por KM"</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      setVoiceEnabled(!voiceEnabled);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      soundEnabled ? 'bg-emerald-500' : 'bg-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Background Notifications */}
                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Notificações em Segundo Plano</div>
                      <div className="text-[11px] text-slate-400">Avisos de meta batida e alertas de fadiga</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifsEnabled(!notifsEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 ${
                      notifsEnabled ? 'bg-emerald-500' : 'bg-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        notifsEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Overlay Permission / Floating Bubble (Gigo Style) */}
                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Sobreposição de Tela (Círculo Flutuante)</div>
                      <div className="text-[11px] text-slate-400">Bolha estilo Gigo arrastável sobre Uber e 99</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasOverlayPermission) {
                        grantOverlayPermission();
                      } else {
                        updateOverlayPref({ isEnabled: !overlayPref.isEnabled });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      hasOverlayPermission && overlayPref.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                    }`}
                  >
                    {hasOverlayPermission && overlayPref.isEnabled ? 'Permitido ✓' : 'Ativar'}
                  </button>
                </div>

                {/* GPS Location Tracking */}
                <div className="p-3.5 rounded-2xl bg-[#090B0E] border border-white/[0.07] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">Odômetro de Precisão (GPS)</div>
                      <div className="text-[11px] text-slate-400">Registra KM total rodado na jornada de trabalho</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestGps}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      gpsRequested
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08]'
                    }`}
                  >
                    {gpsRequested ? 'Ativo ✓' : 'Calibrar'}
                  </button>
                </div>

              </div>

              {/* Practical Android/iOS Advice */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Dica de bateria:</strong> Mantenha o DriveWise conectado ao carregador veicular durante o turno de trabalho.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: Ativação VIP & Sincronização em Nuvem */}
          {step === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Pronto para Rodar
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Seu copiloto está calibrado e ativo
                </h2>
                <p className="text-xs text-slate-400">
                  Inicie seu período de teste VIP de 7 dias com todos os módulos e telemetria liberados.
                </p>
              </div>

              {/* Feature Checklist Box */}
              <div className="p-4 rounded-2xl bg-[#090B0E] border border-white/[0.08] space-y-2.5">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Módulos Ativos na sua Instância:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Semáforo R$/KM & R$/Hora</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Custo real ({fuelType} calibrado)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Alertas sonoros e voz ativa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Simulador de Corridas integrado</span>
                  </div>
                </div>
              </div>

              {/* Cloud Account Link */}
              {firebaseUser ? (
                <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Sincronização em Nuvem Ativa</div>
                      <div className="text-[10px] font-mono text-emerald-400">{firebaseUser.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                    Conectado
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isAuthenticating}
                  className="w-full p-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/[0.1] text-xs font-bold text-white flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4 text-sky-400" />
                  <span>{isAuthenticating ? 'Conectando...' : 'Salvar Calibração na Nuvem com Conta Google'}</span>
                </button>
              )}

              <div className="text-center text-[10px] font-mono text-slate-500">
                Sem necessidade de cadastrar cartão. Cancelamento automático após os 7 dias de avaliação.
              </div>
            </div>
          )}

        </div>

        {/* Bottom Navigation & Controls */}
        <div className="p-4 sm:p-5 border-t border-white/[0.07] bg-[#0A0C0F] flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNextStep}
            className="px-6 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] text-xs font-mono font-bold text-slate-950 flex items-center gap-2 shadow-[0_4px_20px_rgba(52,211,153,0.3)] transition-all ml-auto"
          >
            <span>{step === totalSteps ? 'Ir para o Cockpit' : 'Próxima Etapa'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
