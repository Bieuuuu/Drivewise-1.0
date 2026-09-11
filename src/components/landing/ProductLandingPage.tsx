import React, { useState, useEffect, useId } from 'react';
import {
  Zap,
  TrendingUp,
  ShieldCheck,
  Smartphone,
  Navigation,
  Fuel,
  CheckCircle2,
  XCircle,
  Car,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Download,
  AlertTriangle,
  Flame,
  Volume2,
  Lock,
  Layers,
  Award,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { AndroidLogo, AppleLogo } from '../BrandLogos';
import { formatCurrency } from '../../utils/calculations';

interface ProductLandingPageProps {
  onEnterApp?: () => void;
  onInstallPWA?: () => void;
}

type ScenarioType = 'profitable' | 'loss' | 'battle';

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  onEnterApp,
  onInstallPWA,
}) => {
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('profitable');
  const [dailyKm, setDailyKm] = useState<number>(140);
  const [workDaysWeek, setWorkDaysWeek] = useState<number>(6);
  const [fuelType, setFuelType] = useState<'gasolina' | 'etanol' | 'gnv'>('gasolina');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios'>('android');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  // Accessible IDs for inputs
  const dailyKmInputId = useId();
  const workDaysInputId = useId();

  // PWA install listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    try {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        if (window.matchMedia('(display-mode: standalone)').matches) {
          setIsInstalled(true);
        }
      }
    } catch {
      // ignore
    }

    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      } catch {
        // ignore
      }
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      });
    } else if (onInstallPWA) {
      onInstallPWA();
    } else {
      const element = document.getElementById('instalacao');
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Real-world operational financial model
  const fuelPriceMap = {
    gasolina: { price: 6.15, kmL: 11.5, label: 'Gasolina Comum' },
    etanol: { price: 4.19, kmL: 8.2, label: 'Etanol Hidratado' },
    gnv: { price: 4.85, kmL: 13.5, label: 'GNV (m³)' },
  };

  const currentFuel = fuelPriceMap[fuelType];
  const monthlyKm = dailyKm * workDaysWeek * 4.33;
  const fuelCostPerKm = currentFuel.price / currentFuel.kmL;
  const maintenanceAndDeprecPerKm = 0.38; // Technical base: tires, oil, brakes, vehicle depreciation
  const totalCostPerKm = fuelCostPerKm + maintenanceAndDeprecPerKm;
  const monthlySavedProfit = monthlyKm * 0.18 * 1.85;
  const annualSavedProfit = monthlySavedProfit * 12;

  return (
    <div className="min-h-screen bg-[#060709] text-slate-100 font-sans selection:bg-emerald-500/25 selection:text-emerald-300">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <aside aria-label="Versão Oficial do App" className="bg-[#0A0D12] border-b border-white/[0.08] px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[11px] sm:text-xs whitespace-nowrap">
            <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> VERSÃO 2.5
          </span>
          <span className="text-xs sm:text-sm">
            Disponível para <strong>Android</strong> e <strong>iOS</strong> com Copiloto Flutuante.
          </span>
          <button
            type="button"
            onClick={handleInstallClick}
            className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-4 inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
          >
            Baixar grátis <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>
      </aside>

      {/* 2. STICKY NAVBAR - FOCUSED SOLELY ON DOWNLOAD */}
      <header className="sticky top-0 z-50 bg-[#060709]/95 backdrop-blur-xl border-b border-white/[0.08] px-3 sm:px-6 py-3 sm:py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <DriveWiseLogo size={34} className="rounded-xl shadow-md shrink-0 sm:w-9 sm:h-9" />
            <div className="flex flex-col">
              <span className="font-black text-white text-base sm:text-lg tracking-wider leading-none">
                DRIVEWISE
              </span>
              <span className="text-[10px] sm:text-xs text-emerald-400 font-semibold tracking-wide mt-0.5">
                COPILOTO VEICULAR
              </span>
            </div>
          </div>

          {/* Section Anchor Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-300">
            <a href="#copiloto" className="hover:text-emerald-400 transition-colors">
              Copiloto
            </a>
            <a href="#simulador" className="hover:text-emerald-400 transition-colors">
              Calculadora
            </a>
            <a href="#comparativo" className="hover:text-emerald-400 transition-colors">
              Comparativo
            </a>
            <a href="#instalacao" className="hover:text-emerald-400 transition-colors">
              Como Baixar
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              Dúvidas
            </a>
          </nav>

          {/* Action Buttons: App Access & Download */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="min-h-[42px] sm:min-h-[44px] px-3 sm:px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-bold text-xs sm:text-sm border border-white/[0.1] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <span>Acessar Painel</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            )}
            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[42px] sm:min-h-[44px] px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-extrabold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 text-black shrink-0" />
              <span className="hidden xs:inline sm:inline">Baixar Aplicativo Grátis</span>
              <span className="xs:hidden sm:hidden">Baixar Grátis</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION - RIGOROUS SCALE & VEHICULAR EMPATHY */}
      <section className="relative pt-10 sm:pt-14 pb-14 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle Ambient Atmosphere */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[540px] h-[260px] sm:h-[320px] bg-emerald-500/10 blur-[100px] sm:blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Target Audience Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-slate-300 mb-5 sm:mb-6 shadow-sm max-w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Exclusivo para motoristas Uber, 99 e InDrive</span>
          </div>

          {/* Impact Headline */}
          <h1 className="text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.2] sm:leading-[1.14]">
            Chega de pagar para trabalhar.{' '}
            <span className="text-emerald-400 block sm:inline mt-1 sm:mt-0">
              Transforme seu carro em lucro real.
            </span>
          </h1>

          {/* Focused Subheadline */}
          <p className="mt-4 sm:mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            O único <strong>Copiloto Veicular em tempo real</strong> que calcula o lucro líquido por km e por hora, analisa disputas simultâneas da Uber e 99 e bloqueia chamadas no prejuízo antes de você aceitar.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto min-h-[50px] px-6 sm:px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5 fill-black shrink-0" />
              <span>Baixar App Grátis</span>
            </button>
            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full sm:w-auto min-h-[50px] px-6 sm:px-7 py-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:scale-[0.98] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 border border-white/[0.12] transition-all cursor-pointer"
              >
                <span>Acessar Painel Web</span>
                <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
              </button>
            )}
          </div>

          {/* Operational Reassurance Badges */}
          <div className="mt-6 sm:mt-7 grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2.5 sm:gap-5 text-xs sm:text-sm text-slate-400 font-medium">
            <span className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-lg bg-white/[0.02] sm:bg-transparent border border-white/[0.04] sm:border-transparent">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> 10 Dias Grátis
            </span>
            <span className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-lg bg-white/[0.02] sm:bg-transparent border border-white/[0.04] sm:border-transparent">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> R$ 9,99/mês (Promoção)
            </span>
            <span className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-lg bg-white/[0.02] sm:bg-transparent border border-white/[0.04] sm:border-transparent">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" /> Sem banimento
            </span>
            <span className="flex items-center justify-center sm:justify-start gap-1.5 p-1.5 rounded-lg bg-white/[0.02] sm:bg-transparent border border-white/[0.04] sm:border-transparent">
              <Smartphone className="w-4 h-4 text-sky-400 shrink-0" /> PWA Leve (1.8 MB)
            </span>
          </div>

          {/* Metrics Proof Bar */}
          <div className="mt-10 sm:mt-14 grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-xl sm:text-3xl font-black text-emerald-400 font-mono">
                +R$ 1.450
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Economia média mensal
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-xl sm:text-3xl font-black text-white font-mono">
                2 seg
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Decisão no trânsito
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-xl sm:text-3xl font-black text-amber-400 font-mono">
                100%
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Controle de custo por km
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]">
              <div className="text-xl sm:text-3xl font-black text-sky-400 font-mono">
                4.9 ★
              </div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight">
                Avaliação no asfalto
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE PHONE SIMULATOR */}
      <section id="copiloto" className="py-12 sm:py-16 px-4 sm:px-6 bg-[#090C10] border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              EXPERIÊNCIA INTERATIVA AO VIVO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Veja como o Copiloto avalia as chamadas na sua tela
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              O DriveWise flutua de forma discreta sobre a Uber e a 99. Teste os 3 cenários reais abaixo:
            </p>

            {/* Scenario Selector Tabs */}
            <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-xl mx-auto p-1.5 rounded-2xl bg-black/70 border border-white/[0.1]">
              <button
                type="button"
                onClick={() => setActiveScenario('profitable')}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScenario === 'profitable'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>🔥 Corrida Lucrativa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScenario('loss')}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScenario === 'loss'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>⚠️ Corrida Cilada</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveScenario('battle')}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeScenario === 'battle'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <span>⚔️ Disputa Simultânea</span>
              </button>
            </div>
          </div>

          {/* SIMULATOR SCREEN - RESPONSIVE CONTAINER */}
          <div className="max-w-md mx-auto">
            <div className="relative sm:rounded-[44px] sm:p-3 sm:bg-gradient-to-b sm:from-slate-700 sm:via-slate-800 sm:to-slate-900 sm:shadow-2xl sm:border sm:border-slate-700/70">
              {/* Dynamic Island on Desktop */}
              <div className="hidden sm:block absolute top-5 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30" />

              {/* Inner Screen */}
              <div className="relative rounded-2xl sm:rounded-[36px] overflow-hidden bg-[#0A0C10] border border-white/[0.1] sm:border-white/[0.08] min-h-[480px] sm:min-h-[580px] flex flex-col justify-between p-3 sm:p-5 shadow-2xl">
                {/* Simulated Street Map Grid */}
                <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

                {/* Top Phone Status */}
                <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 px-1 pt-0.5 font-medium">
                  <span className="font-semibold text-white">14:32</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>GPS 5G Conectado</span>
                  </div>
                </div>

                {/* BACKGROUND APP SIMULATION */}
                <div className="relative z-10 mt-2 sm:mt-3 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-black/80 border border-white/[0.08] text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white tracking-wide text-xs sm:text-sm">
                      {activeScenario === 'battle' ? 'DISPUTA DE APPS' : activeScenario === 'loss' ? '99 POP' : 'UBER X'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 font-mono font-semibold">
                      Em Espera
                    </span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-normal">
                    {activeScenario === 'battle'
                      ? 'Duas chamadas tocaram simultaneamente no seu aparelho.'
                      : 'Chamada recebida. DriveWise calculando lucratividade líquida...'}
                  </div>
                </div>

                {/* DRIVEWISE FLOATING CARD */}
                <div className="relative z-20 my-3 sm:my-auto">
                  {activeScenario === 'profitable' && (
                    <div className="rounded-xl sm:rounded-2xl p-3.5 sm:p-5 bg-[#0E131A] border-2 border-emerald-500/60 shadow-2xl shadow-emerald-500/20">
                      <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2.5 py-0.5 sm:py-1 rounded-lg bg-black font-extrabold text-xs text-white border border-white/10">
                            UBER
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> RECOMENDADA
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40">
                          <span className="text-[10px] sm:text-xs font-black text-emerald-400">NOTA</span>
                          <span className="text-xs sm:text-sm font-black text-white font-mono">9.5</span>
                        </div>
                      </div>

                      <div className="my-3 sm:my-4 flex items-baseline justify-between gap-2">
                        <div>
                          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">VALOR OFERTADO</div>
                          <div className="text-2xl sm:text-3xl font-black text-white font-mono">R$ 38,40</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] sm:text-xs text-emerald-400 font-bold uppercase tracking-wider">LUCRO LIMPO</div>
                          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">+R$ 26,18</div>
                        </div>
                      </div>

                      {/* Metric Tiles */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Preço / Km</div>
                          <div className="font-black text-emerald-400 font-mono mt-0.5 text-xs sm:text-sm">R$ 2,70</div>
                        </div>
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Ganho / Hora</div>
                          <div className="font-black text-white font-mono mt-0.5 text-xs sm:text-sm">R$ 88,60</div>
                        </div>
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Distância</div>
                          <div className="font-black text-slate-200 font-mono mt-0.5 text-xs sm:text-sm">14.2 km</div>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] sm:text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>Excelente! Destino em área de alta demanda e baixo deslocamento.</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="min-h-[42px] sm:min-h-[44px] py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold"
                        >
                          Ignorar
                        </button>
                        <button
                          type="button"
                          className="min-h-[42px] sm:min-h-[44px] py-2 rounded-xl bg-emerald-500 text-black text-xs font-black shadow-md"
                        >
                          Aceitar Corrida
                        </button>
                      </div>
                    </div>
                  )}

                  {activeScenario === 'loss' && (
                    <div className="rounded-xl sm:rounded-2xl p-3.5 sm:p-5 bg-[#140E10] border-2 border-rose-500/70 shadow-2xl shadow-rose-500/20">
                      <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-white/[0.08]">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="px-2.5 py-0.5 sm:py-1 rounded-lg bg-amber-500 font-extrabold text-xs text-black">
                            99
                          </span>
                          <span className="text-[11px] sm:text-xs font-bold text-rose-400 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> CORRIDA CILADA
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-xl bg-rose-500/20 border border-rose-500/40">
                          <span className="text-[10px] sm:text-xs font-black text-rose-400">NOTA</span>
                          <span className="text-xs sm:text-sm font-black text-rose-400 font-mono">2.1</span>
                        </div>
                      </div>

                      <div className="my-3 sm:my-4 flex items-baseline justify-between gap-2">
                        <div>
                          <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">VALOR OFERTADO</div>
                          <div className="text-2xl sm:text-3xl font-black text-white font-mono">R$ 14,20</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] sm:text-xs text-rose-400 font-bold uppercase tracking-wider">PREJUÍZO REAL</div>
                          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">-R$ 1,10</div>
                        </div>
                      </div>

                      {/* Metric Tiles */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Preço / Km</div>
                          <div className="font-black text-rose-400 font-mono mt-0.5 text-xs sm:text-sm">R$ 0,80</div>
                        </div>
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Ganho / Hora</div>
                          <div className="font-black text-slate-300 font-mono mt-0.5 text-xs sm:text-sm">R$ 24,30</div>
                        </div>
                        <div className="p-2 sm:p-2.5 rounded-lg bg-black/60 border border-white/[0.06]">
                          <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Distância</div>
                          <div className="font-black text-rose-400 font-mono mt-0.5 text-xs sm:text-sm">17.8 km</div>
                        </div>
                      </div>

                      <div className="mt-3 p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] sm:text-xs text-rose-300 flex items-center gap-2">
                        <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                        <span>Prejuízo! Embarque a 6 km e retorno vazio. Custo supera o valor.</span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          className="min-h-[42px] sm:min-h-[44px] py-2 rounded-xl bg-rose-500 text-white text-xs font-black shadow-md"
                        >
                          Rejeitar Chamada
                        </button>
                        <button
                          type="button"
                          className="min-h-[42px] sm:min-h-[44px] py-2 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold"
                        >
                          Detalhes
                        </button>
                      </div>
                    </div>
                  )}

                  {activeScenario === 'battle' && (
                    <div className="rounded-xl sm:rounded-2xl p-3.5 sm:p-5 bg-[#14120D] border-2 border-amber-500/60 shadow-2xl shadow-amber-500/20">
                      <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                          <Flame className="w-4 h-4" /> DISPUTA SIMULTÂNEA
                        </span>
                        <span className="text-[11px] sm:text-xs text-slate-400 font-medium">
                          Melhor escolha
                        </span>
                      </div>

                      {/* Opponent 1: Uber (Winner) */}
                      <div className="mt-2.5 p-2.5 sm:p-3 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/60">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-black text-white text-[11px] sm:text-xs font-bold">
                            UBER X (Vencedora)
                          </span>
                          <span className="text-xs font-black text-emerald-400 font-mono">R$ 2,42 / km</span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between text-xs">
                          <span className="text-slate-300 text-[11px] sm:text-xs">R$ 21,50 • 8,9 km • 16 min</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs sm:text-sm">+R$ 13,85 limpo</span>
                        </div>
                      </div>

                      {/* Opponent 2: 99 */}
                      <div className="mt-2 p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/[0.06] opacity-75">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[11px] sm:text-xs font-bold">
                            99 POP
                          </span>
                          <span className="text-xs font-bold text-slate-400 font-mono">R$ 1,32 / km</span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between text-xs">
                          <span className="text-slate-400 text-[11px] sm:text-xs">R$ 16,00 • 12,1 km • 24 min</span>
                          <span className="font-mono text-slate-400 text-xs sm:text-sm">+R$ 5,60 limpo</span>
                        </div>
                      </div>

                      <div className="mt-2.5 text-[11px] sm:text-xs text-amber-300 font-medium text-center">
                        ⚡ Uber gera <strong>+147% de lucro líquido</strong> pelo mesmo tempo.
                      </div>

                      <button
                        type="button"
                        className="mt-3 w-full min-h-[42px] sm:min-h-[44px] py-2 rounded-xl bg-emerald-500 text-black text-xs font-black shadow-md"
                      >
                        Aceitar Uber e Descartar 99
                      </button>
                    </div>
                  )}
                </div>

                {/* Bottom Voice / Safe Alert Bar */}
                <div className="relative z-10 p-2.5 sm:p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
                    <span className="text-[11px] sm:text-xs text-slate-200">
                      {activeScenario === 'profitable'
                        ? 'Voz: "Nota 9.5. R$ 38. Recomendada."'
                        : activeScenario === 'loss'
                        ? 'Voz: "Alerta de prejuízo. R$ 0,80 o km."'
                        : 'Voz: "Uber é R$ 8 mais vantajosa."'}
                    </span>
                  </div>
                  <span className="text-[11px] sm:text-xs text-emerald-400 font-bold whitespace-nowrap">Copiloto Ativo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE PROFIT LOSS CALCULATOR */}
      <section id="simulador" className="py-14 sm:py-20 px-4 sm:px-6 bg-[#060709]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              CALCULADORA DE RENTABILIDADE VEICULAR
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Quanto dinheiro você está deixando no asfalto?
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              Ajuste seus números reais e descubra o impacto de filtrar corridas no prejuízo:
            </p>
          </div>

          {/* Outer Box */}
          <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0B0E14] border border-white/[0.09] shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
              {/* Sliders & Inputs */}
              <div className="space-y-5 sm:space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <label htmlFor={dailyKmInputId} className="font-bold text-slate-200 text-xs sm:text-sm">
                      Quilômetros rodados por dia
                    </label>
                    <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">{dailyKm} km/dia</span>
                  </div>
                  <input
                    id={dailyKmInputId}
                    type="range"
                    min="40"
                    max="350"
                    step="10"
                    value={dailyKm}
                    onChange={(e) => setDailyKm(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg touch-pan-y"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
                    <span>40 km</span>
                    <span>200 km</span>
                    <span>350 km</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <label htmlFor={workDaysInputId} className="font-bold text-slate-200 text-xs sm:text-sm">
                      Dias trabalhados por semana
                    </label>
                    <span className="font-mono font-black text-emerald-400 text-sm sm:text-base">{workDaysWeek} dias</span>
                  </div>
                  <input
                    id={workDaysInputId}
                    type="range"
                    min="3"
                    max="7"
                    step="1"
                    value={workDaysWeek}
                    onChange={(e) => setWorkDaysWeek(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2.5 bg-slate-800 rounded-lg touch-pan-y"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1 font-medium">
                    <span>3 dias</span>
                    <span>5 dias</span>
                    <span>7 dias</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-bold text-slate-200 block mb-2">
                    Combustível Principal do Veículo
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                    {(['gasolina', 'etanol', 'gnv'] as const).map((fuel) => (
                      <button
                        key={fuel}
                        type="button"
                        onClick={() => setFuelType(fuel)}
                        className={`min-h-[44px] p-2 sm:p-2.5 rounded-xl text-xs sm:text-sm font-bold capitalize transition-all border cursor-pointer ${
                          fuelType === fuel
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-white/[0.04] text-slate-300 border-white/[0.08] hover:text-white'
                        }`}
                      >
                        {fuel}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 mt-2 font-medium">
                    Base: {currentFuel.label} (~{currentFuel.kmL} km/L • R$ {currentFuel.price.toFixed(2)})
                  </div>
                </div>
              </div>

              {/* Live Output Card */}
              <div className="p-4 sm:p-7 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#0B1510] to-black border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] sm:text-xs font-bold uppercase text-slate-400 tracking-wider">
                    SEU CUSTO REAL POR KM RODADO
                  </div>
                  <div className="text-2xl sm:text-4xl font-black text-white font-mono mt-1 sm:mt-1.5">
                    {formatCurrency(totalCostPerKm)} <span className="text-xs font-normal text-slate-400">/ km</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Combustível ({formatCurrency(fuelCostPerKm)}) + Desgaste e Manutenção ({formatCurrency(maintenanceAndDeprecPerKm)})
                  </div>

                  <div className="my-4 sm:my-6 border-t border-white/[0.08]" />

                  <div className="text-[11px] sm:text-xs font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> LUCRO RESGATADO COM DRIVEWISE
                  </div>
                  <div className="text-2xl sm:text-4xl font-black text-emerald-400 font-mono mt-1 sm:mt-1.5">
                    +{formatCurrency(monthlySavedProfit)}
                    <span className="text-xs font-medium text-slate-400 ml-1">/ mês</span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Projeção anual de <strong>+{formatCurrency(annualSavedProfit)}</strong> no seu bolso evitando corridas ruins por turno.
                  </div>
                </div>

                {/* Direct Download Call to Action */}
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="mt-5 sm:mt-6 w-full min-h-[48px] py-3.5 px-5 sm:px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-black shrink-0" />
                  <span>Baixar App e Garantir Esse Lucro</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPARISON SECTION: COM VS SEM DRIVEWISE */}
      <section id="comparativo" className="py-12 sm:py-20 px-4 sm:px-6 bg-[#090C10] border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
              TABELA COMPARATIVA
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              A diferença entre rodar no escuro ou com inteligência
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* SEM DRIVEWISE */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-rose-950/20 border border-rose-500/30">
              <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-rose-500/20">
                <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white">Rodando Sem o DriveWise</h3>
              </div>

              <ul className="mt-4 sm:mt-5 space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Aceita corridas pelo valor bruto no susto sem saber o custo real por km.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Fica na dúvida quando Uber e 99 tocam ao mesmo tempo e perde as duas chamadas.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Gasta combustível em deslocamentos longos para buscar passageiro que cancela.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Descobre o lucro só no fim do mês quando vê a fatura do cartão ou do posto.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>Roda 12 horas por dia com cansaço extremo e pouco dinheiro de sobra.</span>
                </li>
              </ul>
            </div>

            {/* COM DRIVEWISE */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-emerald-950/20 border border-emerald-500/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 sm:px-4 py-0.5 sm:py-1 rounded-bl-xl sm:rounded-bl-2xl bg-emerald-500 text-black text-[10px] sm:text-xs font-black tracking-wider uppercase">
                RECOMENDADO
              </div>

              <div className="flex items-center gap-2.5 pb-3 sm:pb-4 border-b border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-white">Rodando Com o DriveWise</h3>
              </div>

              <ul className="mt-4 sm:mt-5 space-y-3 sm:space-y-4 text-xs sm:text-sm text-slate-200">
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Decisão matemática em 2 segundos com nota de 0 a 10 e lucro líquido em reais.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Comparativo imediato da disputa Uber vs 99 com seleção da mais rentável.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Alertas sonoros e narração por voz sem tirar os olhos do trânsito.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Registro automático de turnos por GPS com consumo em km/L e metas diárias.</span>
                </li>
                <li className="flex items-start gap-2.5 sm:gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Menos horas no volante e mais faturamento líquido garantido no bolso.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ALL FEATURES BENTO GRID */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#060709]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              RECURSOS COMPLETOS DO APLICATIVO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Tudo o que você precisa no suporte do seu carro
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
            {/* Feature 1 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-emerald-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 sm:mb-4">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Copiloto Flutuante (Overlay)</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Flutua sobre a Uber, 99 e InDrive com nota instantânea, lucro em reais e alertas sonoros configuráveis.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-amber-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 sm:mb-4">
                <Flame className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Disputa Uber vs 99</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Tocou as duas ao mesmo tempo? O app aponta a vencedora instantaneamente e descarta a menos lucrativa.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-sky-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3 sm:mb-4">
                <Navigation className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Controle de Jornada com GPS</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Cronômetro de turno, odômetro com GPS, soma automática de faturamentos e resumo do dia em 1 clique.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-rose-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-3 sm:mb-4">
                <Fuel className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Gestão de Abastecimento</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Consumo real em km/L, cálculo de custo por km atualizado a cada tanque e alertas de despesas fixas.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-indigo-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 sm:mb-4">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Nuvem Google Firebase</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Seus dados salvos com criptografia na nuvem. Troque de celular sem perder nenhum histórico ou relatório.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] hover:border-teal-500/40 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3 sm:mb-4">
                <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">Modo Seguro com Narração</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 sm:mt-2 leading-relaxed">
                Fontes grandes para visualização rápida no suporte veicular e sintetizador de voz nativo sem distrações.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. INSTALLATION GUIDE (PWA & GOOGLE PLAY) */}
      <section id="instalacao" className="py-12 sm:py-20 px-4 sm:px-6 bg-[#090C10] border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              INSTALAÇÃO RÁPIDA EM 10 SEGUNDOS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Instale agora no seu celular sem complicação
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              O DriveWise funciona como aplicativo nativo (PWA), ocupa menos de 2 MB de memória e roda liso em qualquer aparelho:
            </p>

            {/* Platform Segmented Control */}
            <div className="mt-6 sm:mt-8 grid grid-cols-2 sm:inline-flex p-1 sm:p-1.5 rounded-2xl bg-[#0B0E14] border border-white/[0.12] shadow-2xl gap-1.5 max-w-xs sm:max-w-none mx-auto">
              <button
                type="button"
                onClick={() => setInstallDeviceTab('android')}
                className={`min-h-[44px] sm:min-h-[48px] px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                  installDeviceTab === 'android'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <AndroidLogo
                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${
                    installDeviceTab === 'android' ? 'text-slate-950' : 'text-emerald-400'
                  }`}
                />
                <span>Android</span>
              </button>

              <button
                type="button"
                onClick={() => setInstallDeviceTab('ios')}
                className={`min-h-[44px] sm:min-h-[48px] px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
                  installDeviceTab === 'ios'
                    ? 'bg-white text-slate-950 shadow-lg shadow-white/20 ring-1 ring-white'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <AppleLogo
                  className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-colors ${
                    installDeviceTab === 'ios' ? 'text-slate-950' : 'text-white'
                  }`}
                />
                <span>iOS</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-8 rounded-2xl sm:rounded-3xl bg-[#0B0E14] border border-white/[0.09] shadow-xl">
            {installDeviceTab === 'android' ? (
              <div className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      1
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Acesse o Link</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Abra <strong>drivewise.com.br</strong> no navegador Chrome do seu celular Android.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      2
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Toque no Menu (⋮)</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Toque nos 3 pontos e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 text-emerald-400 font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      3
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Pronto no Celular</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      O ícone do DriveWise será fixado na sua tela inicial como qualquer app nativo.
                    </p>
                  </div>
                </div>

                <div className="pt-4 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-white/[0.08]">
                  <div className="text-xs text-slate-300 text-center sm:text-left">
                    {isInstalled ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                        <CheckCircle2 className="w-4 h-4 shrink-0" /> Aplicativo já instalado neste dispositivo!
                      </span>
                    ) : (
                      <span>Clique no botão ao lado para iniciar o download direto no Android.</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] px-6 sm:px-8 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer whitespace-nowrap"
                  >
                    <AndroidLogo className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 shrink-0" />
                    <span>Baixar para Android Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      1
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Acesse o Link</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Abra <strong>drivewise.com.br</strong> no navegador Safari do seu iPhone.
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      2
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Toque em Compartilhar</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Toque no ícone de compartilhamento (o quadrado com uma seta para cima).
                    </p>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 transition-colors">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white font-black mx-auto flex items-center justify-center text-xs sm:text-sm mb-2.5 sm:mb-3.5">
                      3
                    </div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Adicionar à Tela de Início</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Role o menu para baixo e selecione <strong>"Adicionar à Tela de Início"</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-4 sm:pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-t border-white/[0.08]">
                  <div className="text-xs text-slate-300 text-center sm:text-left">
                    <span>Instalação instantânea no iOS sem necessidade de App Store ou cartão de crédito.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] px-6 sm:px-8 py-3 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-white/10 cursor-pointer whitespace-nowrap"
                  >
                    <AppleLogo className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950 shrink-0" />
                    <span>Instalar no iOS Agora</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 9. DRIVER TESTIMONIALS */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#060709]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              DEPOIMENTOS REAIS DE QUEM USA NO ASFALTO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Aprovado por motoristas de capitais brasileiras
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "Parei de rodar por menos de R$ 2 o km. No primeiro mês aumentei minha receita líquida em R$ 1.620 só rejeitando as corridas ciladas que a 99 mandava."
              </p>
              <div className="mt-4 sm:mt-6 flex items-center gap-3 pt-3 sm:pt-4 border-t border-white/[0.08]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400 text-xs sm:text-sm">
                  MS
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">Marcos Silveira</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">São Paulo • 4 anos de Uber</div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "A disputa Uber vs 99 é surreal de boa. Eu sempre ficava desesperado pra escolher antes do timer acabar. Agora olho a bolha do DriveWise e já sei qual dá mais lucro."
              </p>
              <div className="mt-4 sm:mt-6 flex items-center gap-3 pt-3 sm:pt-4 border-t border-white/[0.08]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xs sm:text-sm">
                  RM
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">Rodrigo Mendes</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Rio de Janeiro • Uber & 99</div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-black/50 border border-white/[0.08] flex flex-col justify-between">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "O copiloto narrando por voz a nota da corrida e o lucro líquido salvou minha vida. Consigo dirigir com calma, sem precisar forçar a vista no suporte veicular."
              </p>
              <div className="mt-4 sm:mt-6 flex items-center gap-3 pt-3 sm:pt-4 border-t border-white/[0.08]">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-sky-500/20 border border-sky-500/30 flex items-center justify-center font-black text-sky-400 text-xs sm:text-sm">
                  DF
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-white">Daniela Freitas</div>
                  <div className="text-[11px] sm:text-xs text-slate-400">Belo Horizonte • InDrive e Uber</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ SECTION */}
      <section id="faq" className="py-12 sm:py-20 px-4 sm:px-6 bg-[#090C10] border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <span className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
              TIRE SUAS DÚVIDAS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            {[
              {
                q: 'O DriveWise pode causar banimento na Uber ou na 99?',
                a: 'Não. O DriveWise opera como um assistente de produtividade veicular e cálculo financeiro local. Ele não injeta código nos servidores das plataformas nem altera o funcionamento dos aplicativos de corrida. É 100% seguro e legal.',
              },
              {
                q: 'Como funciona o período gratuito e o plano de assinatura?',
                a: 'O DriveWise oferece 10 dias de degustação gratuita sem cobrança antecipada e com acesso completo ao Copiloto PRO. Após esse período de validação, você tem acesso à Super Promoção de Lançamento por apenas R$ 9,99/mês (via Pix ou cartão de crédito), podendo cancelar quando quiser sem qualquer fidelidade.',
              },
              {
                q: 'Como ele sabe o custo real do meu carro?',
                a: 'Você informa seu consumo médio (km/L) e o preço do combustível. O DriveWise soma automaticamente a depreciação veicular e o desgaste de pneus e pastilhas (base técnica padrão de R$ 0,38/km, personalizável nas configurações), gerando o custo exato por km percorrido.',
              },
              {
                q: 'O Copiloto funciona em qualquer celular Android e iPhone?',
                a: 'Sim! O DriveWise foi desenvolvido com tecnologia PWA de ponta. No Android ele flutua em segundo plano sobre os apps, e no iPhone você tem acesso ao painel de bordo completo, simulador e relatórios com alto contraste.',
              },
              {
                q: 'Preciso de internet o tempo todo?',
                a: 'O app possui arquitetura offline-first. Se você passar por um túnel ou área sem sinal, os cálculos e registros continuam funcionando normalmente na memória do aparelho e sincronizam na nuvem assim que a conexão retornar.',
              },
              {
                q: 'Meus dados ficam salvos se eu trocar de celular?',
                a: 'Sim! Conectando com sua conta Google pelo botão de Nuvem Firebase, todo o seu histórico de jornadas, abastecimentos e configurações do Copiloto são armazenados com segurança criptografada na nuvem Google.',
              },
            ].map((faq, index) => (
              <div
                key={faq.q}
                className="rounded-xl sm:rounded-2xl bg-black/60 border border-white/[0.08] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full min-h-[48px] sm:min-h-[52px] p-3.5 sm:p-5 text-left flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                >
                  <span className="font-bold text-xs sm:text-base text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-emerald-400 shrink-0 transition-transform duration-200 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="px-3.5 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/[0.04] pt-2.5 sm:pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FINAL CTA BOX */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-[#060709]">
        <div className="max-w-4xl mx-auto rounded-2xl sm:rounded-3xl p-6 sm:p-12 bg-gradient-to-br from-[#0A1610] via-[#090D12] to-black border-2 border-emerald-500/40 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] sm:text-xs font-bold mb-3 sm:mb-4">
            🚀 PRONTO PARA AS RUAS
          </span>

          <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Pare de rodar no prejuízo hoje mesmo.
          </h2>

          <p className="mt-3 sm:mt-4 text-slate-300 text-xs sm:text-base max-w-xl mx-auto leading-relaxed">
            Junte-se a milhares de motoristas que usam matemática e tecnologia para faturar mais com menos horas ao volante.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] px-6 sm:px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-black text-xs sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-black shrink-0" />
              <span>Baixar o DriveWise Agora Grátis</span>
            </button>

            <a
              href="#instalacao"
              className="w-full sm:w-auto min-h-[46px] sm:min-h-[48px] px-5 sm:px-6 py-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/[0.14] transition-all cursor-pointer whitespace-nowrap"
            >
              <span>Ver Passo a Passo de Instalação</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
            </a>
          </div>

          <div className="mt-5 sm:mt-6 text-[11px] sm:text-xs text-slate-400 font-medium">
            Download instantâneo • Sem burocracia • Seguro e criptografado
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#030406] py-8 sm:py-12 px-4 sm:px-6 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <DriveWiseLogo size={32} className="rounded-xl shadow shrink-0" />
            <div>
              <div className="font-black text-white text-sm tracking-wider">DRIVEWISE</div>
              <div className="text-[11px] sm:text-xs text-slate-400">
                Copiloto de Rentabilidade para Motoristas de Aplicativo
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
            >
              Política de Privacidade
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors underline underline-offset-4 cursor-pointer"
            >
              Termos de Uso
            </button>
            <a
              href="#instalacao"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Como Instalar
            </a>
            <button
              type="button"
              onClick={handleInstallClick}
              className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
            >
              Baixar App
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-400">
            © {new Date().getFullYear()} DriveWise. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* 13. PRIVACY & TERMS MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C0F14] border border-white/[0.12] rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Política de Privacidade & Termos do DriveWise</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <h4 className="font-bold text-sm sm:text-base text-white">1. Visão Geral</h4>
              <p>
                O DriveWise é um aplicativo focado na privacidade do motorista. Não comercializamos, transferimos ou compartilhamos informações pessoais, dados de localização ou métricas financeiras com terceiros para fins de publicidade.
              </p>

              <h4 className="font-bold text-sm sm:text-base text-white">2. Coleta e Uso de Localização (GPS)</h4>
              <p>
                A permissão de localização geográfica é solicitada exclusivamente para medir a distância real percorrida durante as jornadas de trabalho ativas e calcular o custo operacional do veículo em tempo real. A localização não é rastreada quando a jornada está finalizada.
              </p>

              <h4 className="font-bold text-sm sm:text-base text-white">3. Armazenamento e Criptografia em Nuvem</h4>
              <p>
                Os dados de jornadas, abastecimentos e configurações são sincronizados via Google Firebase Firestore sob autenticação segura. Todas as transmissões utilizam criptografia SSL/TLS em trânsito.
              </p>

              <h4 className="font-bold text-sm sm:text-base text-white">4. Exclusão de Dados</h4>
              <p>
                O motorista tem total controle e pode apagar todos os registros da memória e da nuvem a qualquer momento nas configurações do perfil pelo botão "Limpar Todos os Dados".
              </p>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs sm:text-sm cursor-pointer"
              >
                Entendi e Concordo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
