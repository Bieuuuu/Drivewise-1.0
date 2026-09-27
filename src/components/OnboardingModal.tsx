import React, { useState } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Fuel,
  Volume2,
  Bell,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Gauge,
  LogIn,
  Check,
  Zap,
  Activity,
  Car,
  Layers,
  Sliders,
  AlertTriangle,
  X,
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
    hasAccessibilityPermission,
    grantOverlayPermission,
    grantAccessibilityPermission,
    requestMobileRuntimePermissions,
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
    updateUser({ hasCompletedOnboarding: true });
    onClose();
  };

  const requestGps = () => {
    requestMobileRuntimePermissions().catch(() => {});
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
    { num: 2, title: 'Eficiência Operacional', sub: 'Redução de KM morto' },
    { num: 3, title: 'Calibração Veicular', sub: 'Seu custo técnico por KM' },
    { num: 4, title: 'Telemetria & Áudio', sub: 'Alertas em viva-voz' },
    { num: 5, title: 'Ativação & Backup', sub: 'Calibração concluída' },
  ];

  return (
    <div
      id="onboarding-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl overflow-y-auto"
    >
      <div className="relative w-full max-w-xl bg-[#08090C] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-gradient-to-b from-white/[0.04] to-transparent blur-xl pointer-events-none" />

        {/* Top Header & Trackers */}
        <div className="relative pt-5 px-6 pb-4 border-b border-white/[0.08] bg-[#0A0C0F]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DriveWiseLogo size={28} className="rounded-xl border border-white/[0.14]" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-wider text-white uppercase">
                    DriveWise OS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {stepMeta[step - 1].title} • {stepMeta[step - 1].sub}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">Etapa</span>
                <span className="text-xs font-mono font-bold text-white">0{step} / 0{totalSteps}</span>
              </div>
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
                title="Pular calibração"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stepper Progress Indicator */}
          <div className="grid grid-cols-5 gap-1.5">
            {stepMeta.map((s) => (
              <button
                key={s.num}
                type="button"
                className="h-1 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  backgroundColor:
                    s.num === step
                      ? '#FFFFFF'
                      : s.num < step
                      ? 'rgba(255, 255, 255, 0.45)'
                      : 'rgba(255, 255, 255, 0.08)',
                }}
                onClick={() => setStep(s.num)}
                aria-label={`Ir para etapa ${s.num}`}
              />
            ))}
          </div>
        </div>

        {/* Dynamic Content Container */}
        <div className="relative p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* STEP 1: O Semáforo em 2 Segundos - Estilo Minimalista de Alto Contraste */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Telemetria em Tempo Real
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Avaliação instantânea de rentabilidade
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
                  O DriveWise processa instantaneamente o valor da chamada, trajeto de busca, tempo no trânsito e o custo por quilômetro do seu carro.
                </p>
              </div>

              {/* HUD Cards Comparison (Refined Minimalist Contrast) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                
                {/* ACEITAR - LUCRO REAL */}
                <div className="rounded-2xl bg-[#0C0E14] border border-emerald-500/30 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      ACEITAR • ROTA LUCRATIVA
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                      UberX • 14 min
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Valor Bruto</span>
                      <span className="text-lg font-mono font-bold text-white">R$ 38,50</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 bg-[#08090C] p-2.5 rounded-xl border border-white/[0.06]">
                      <div>
                        <div className="text-[9px] uppercase font-semibold text-slate-500">Líquido / KM</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">R$ 2,75</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-semibold text-slate-500">Líquido / Hora</div>
                        <div className="text-sm font-mono font-bold text-emerald-400">R$ 68,20</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="text-slate-400">Lucro Líquido Real:</span>
                    <span className="font-mono font-bold text-emerald-400">+ R$ 28,10</span>
                  </div>
                </div>

                {/* RECUSAR - PREJUÍZO */}
                <div className="rounded-2xl bg-[#0F0C0D] border border-rose-500/30 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      RECUSAR • PREJUÍZO OCULTO
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded border border-white/[0.08]">
                      99Pop • 25 min
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-slate-400">Valor Bruto</span>
                      <span className="text-lg font-mono font-bold text-white">R$ 11,20</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#08090C] p-2.5 rounded-xl border border-white/[0.06]">
                      <div>
                        <div className="text-[9px] uppercase font-semibold text-slate-500">Líquido / KM</div>
                        <div className="text-sm font-mono font-bold text-rose-400">R$ 1,42</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-semibold text-slate-500">Líquido / Hora</div>
                        <div className="text-sm font-mono font-bold text-rose-400">R$ 22,10</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs">
                    <span className="text-slate-400">Saldo Após Custos:</span>
                    <span className="font-mono font-bold text-rose-400">- R$ 1,40</span>
                  </div>
                </div>

              </div>

              {/* Technical Precision Notice */}
              <div className="p-3 bg-[#0B0D12] border border-white/[0.08] rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                  <Sliders className="w-4 h-4 text-white" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Critérios personalizáveis:</strong> Defina seu piso mínimo por km e por hora nas configurações do sistema a qualquer momento.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Inteligência Operacional */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  Eficiência Operacional
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Mais resultado rodando menos quilômetros
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Rodar sem parâmetro acelera a depreciação de pneus, pastilhas de freio, óleo e motor. O copiloto preserva seu patrimônio.
                </p>
              </div>

              {/* Data Benchmarks (Minimalist Dark Cards) */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">KM Morto</span>
                  <div className="text-xl font-mono font-bold text-white my-1">-32%</div>
                  <span className="text-[10px] text-slate-500">Menos deslocamento inútil</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Média/Hora</span>
                  <div className="text-xl font-mono font-bold text-emerald-400 my-1">R$ 62</div>
                  <span className="text-[10px] text-slate-500">Em corridas filtradas</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex flex-col justify-between">
                  <span className="text-[10px] font-semibold uppercase text-slate-400">Meta Diária</span>
                  <div className="text-xl font-mono font-bold text-white my-1">3h Antes</div>
                  <span className="text-[10px] text-slate-500">Menos horas na rua</span>
                </div>
              </div>

              {/* Technical Operating Principles */}
              <div className="space-y-2 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-bold text-xs text-white shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Cálculo de Deslocamento de Busca</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Corridas longas para buscar o passageiro reduzem drasticamente sua margem real. O copiloto soma a busca ao trajeto total.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center font-bold text-xs text-white shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Detecção de Regiões de Retorno Vazio</h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Alertas automáticos quando a chamada leva para áreas sem demanda de volta, evitando que você volte sem passageiro.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cockpit de Calibração Veicular Real */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  <Gauge className="w-3 h-3 text-white" />
                  Calibração Técnica
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Custo real por quilômetro rodado
                </h2>
                <p className="text-xs text-slate-400">
                  Insira os dados do seu veículo para calibrar a margem matemática do copiloto.
                </p>
              </div>

              {/* Interactive Vehicle Telemetry Inputs */}
              <div className="space-y-3.5 bg-[#0B0D12] p-4 sm:p-5 rounded-2xl border border-white/[0.08]">
                
                {/* Vehicle Model & Fuel Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Modelo do Carro
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Ex: Chevrolet Onix 1.0"
                        className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-white transition-colors"
                      />
                      <Car className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                      Combustível Atual
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value as FuelType)}
                      className="w-full bg-[#101217] border border-white/[0.1] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors"
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-300">Consumo Médio</label>
                      <span className="text-xs font-mono font-bold text-white">{consumption} km/L</span>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      min="3"
                      max="30"
                      value={consumption}
                      onChange={(e) => setConsumption(Number(e.target.value))}
                      className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-slate-300">Preço do Litro / m³</label>
                      <span className="text-xs font-mono font-bold text-white">R$ {fuelPrice.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      min="1"
                      max="15"
                      value={fuelPrice}
                      onChange={(e) => setFuelPrice(Number(e.target.value))}
                      className="w-full bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-white transition-colors"
                    />
                  </div>
                </div>

                {/* Daily Target Slider */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-300">Meta Diária de Faturamento</span>
                    <span className="text-xs font-mono font-bold text-white bg-white/[0.06] px-2.5 py-0.5 rounded-lg border border-white/[0.08]">
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
                    className="w-full accent-white h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>R$ 120/dia (Parcial)</span>
                    <span>R$ 350/dia (Padrão)</span>
                    <span>R$ 600/dia (Intensivo)</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Telemetry Calculation Display */}
              <div className="p-4 rounded-2xl bg-[#0E1118] border border-white/[0.1] flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Custo Operacional Total</div>
                  <div className="text-base font-mono font-bold text-white mt-0.5">
                    R$ {totalCostPerKm.toFixed(2)} <span className="text-xs text-slate-400 font-normal">/ km rodado</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    R$ {fuelCostPerKm.toFixed(2)} combustível + R$ {estimatedMaintenancePerKm.toFixed(2)} manutenção
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-semibold uppercase text-slate-400">Piso Mínimo Sugerido</div>
                  <div className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                    ≥ R$ {suggestedMinPerKm.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ~{profitMarginPercent}% margem líquida
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Telemetria & Permissões do Sistema */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  <Volume2 className="w-3 h-3 text-white" />
                  Operação Hands-Free
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Feedback sonoro e telemetria
                </h2>
                <p className="text-xs text-slate-400">
                  Mantenha a atenção na direção. O copiloto sintetiza o parecer de cada corrida em áudio para você não precisar tocar no celular.
                </p>
              </div>

              {/* System Switches (Monochrome & Refined) */}
              <div className="space-y-2.5">
                
                {/* Voice & Sound Alerts */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Alertas em Viva-Voz na Cabine</div>
                      <div className="text-[11px] text-slate-400">Emite aviso sonoro e sintetiza o parecer da corrida</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSoundEnabled(!soundEnabled);
                      setVoiceEnabled(!voiceEnabled);
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                      soundEnabled ? 'bg-white' : 'bg-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        soundEnabled ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Background Notifications */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Notificações em Segundo Plano</div>
                      <div className="text-[11px] text-slate-400">Avisos de meta batida e alertas de fadiga</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifsEnabled(!notifsEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-1 cursor-pointer ${
                      notifsEnabled ? 'bg-white' : 'bg-white/[0.1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform ${
                        notifsEnabled ? 'translate-x-5 bg-slate-950' : 'translate-x-0 bg-white'
                      }`}
                    />
                  </button>
                </div>

                {/* Overlay Permission / Floating Bubble */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Sobreposição de Tela (HUD Fora do App)</div>
                      <div className="text-[11px] text-slate-400">Permite o semáforo flutuar sobre a Uber, 99 e InDrive</div>
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
                    className={`min-h-[34px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hasOverlayPermission && overlayPref.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white hover:bg-slate-200 text-slate-950 shadow-sm'
                    }`}
                  >
                    {hasOverlayPermission && overlayPref.isEnabled ? 'Permitido ✓' : 'Permitir no Celular'}
                  </button>
                </div>

                {/* Accessibility Ride Reader Permission */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Leitor Automático (Acessibilidade)</div>
                      <div className="text-[11px] text-slate-400">Lê automaticamente valor R$ e KM das chamadas</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => grantAccessibilityPermission()}
                    className={`min-h-[34px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hasAccessibilityPermission
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.15]'
                    }`}
                  >
                    {hasAccessibilityPermission ? 'Ativo ✓' : 'Ativar no Celular'}
                  </button>
                </div>

                {/* GPS Location Tracking */}
                <div className="p-3.5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Odômetro Digital (GPS)</div>
                      <div className="text-[11px] text-slate-400">Registra quilometragem real percorrida na jornada</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={requestGps}
                    className={`min-h-[34px] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      gpsRequested
                        ? 'bg-white/[0.1] text-white border border-white/[0.2]'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] text-slate-200 border border-white/[0.1]'
                    }`}
                  >
                    {gpsRequested ? 'Ativo ✓' : 'Calibrar'}
                  </button>
                </div>

              </div>

              {/* Practical Advice Box */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-slate-400 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  <strong>Operação Local:</strong> Todas as permissões funcionam em tempo real no seu dispositivo sem envio de telemetria a terceiros.
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: Conclusão & Sincronização */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Pronto para Rodar
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Seu copiloto está calibrado
                </h2>
                <p className="text-xs text-slate-400">
                  Todas as regras e custos operacionais foram sincronizados com seu perfil de trabalho.
                </p>
              </div>

              {/* Feature Checklist Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0D12] border border-white/[0.08] space-y-2.5">
                <div className="text-[11px] uppercase font-semibold text-slate-400 tracking-wider mb-2">
                  Configuração Aplicada:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Semáforo de Decisão Ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Custo do {fuelType} Calibrado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Piso mínimo: ≥ R$ {suggestedMinPerKm.toFixed(2)}/km</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Meta diária: R$ {dailyGoal},00</span>
                  </div>
                </div>
              </div>

              {/* Cloud Account Link */}
              {firebaseUser ? (
                <div className="p-3.5 rounded-2xl bg-[#0E1118] border border-white/[0.1] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Sincronização Ativa</div>
                      <div className="text-[11px] font-mono text-slate-400">{firebaseUser.email}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-white/[0.06] text-slate-300 px-2.5 py-1 rounded border border-white/[0.08]">
                    Conectado
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isAuthenticating}
                  className="w-full min-h-[44px] p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.99] border border-white/[0.1] text-xs font-bold text-white flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-slate-300" />
                  <span>{isAuthenticating ? 'Conectando...' : 'Salvar Calibração na Nuvem com Conta Google'}</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Bottom Navigation & Controls */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#0A0C0F] flex items-center justify-between gap-3">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
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
            className="min-h-[40px] px-6 py-2 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-xs font-bold text-slate-950 flex items-center gap-2 shadow-sm transition-all ml-auto cursor-pointer"
          >
            <span>{step === totalSteps ? 'Acessar Cockpit' : 'Avançar'}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </div>

      </div>
    </div>
  );
};
