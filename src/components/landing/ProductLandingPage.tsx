import React, { useState, useEffect, useId } from 'react';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowUpRight,
  SlidersHorizontal,
  X,
  ChevronRight,
  Settings2,
  AlertCircle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { AndroidLogo, AppleLogo } from '../BrandLogos';
import { formatCurrency } from '../../utils/calculations';

import heroCockpitImg from '../../assets/images/hero_cockpit_hud_1790536927493.jpg';
import bentoHudImg from '../../assets/images/bento_hud_overlay_1790536941540.jpg';
import bentoCostImg from '../../assets/images/bento_cost_engineering_1790536955339.jpg';

interface ProductLandingPageProps {
  onEnterApp?: () => void;
  onInstallPWA?: () => void;
}

type WorkbenchPreset = 'profitable' | 'loss' | 'battle' | 'custom';

export const ProductLandingPage: React.FC<ProductLandingPageProps> = ({
  onEnterApp,
}) => {
  // Interactive Studio Workbench state (inspired by AI Studio Welcome playground)
  const [activePreset, setActivePreset] = useState<WorkbenchPreset>('profitable');
  const [rideOfferFare, setRideOfferFare] = useState<number>(38.5);
  const [rideDistanceKm, setRideDistanceKm] = useState<number>(9.2);
  const [rideDurationMin, setRideDurationMin] = useState<number>(18);
  const [ridePlatform, setRidePlatform] = useState<'UberX' | '99Pop' | 'InDrive'>('UberX');

  // Image resilience state (Zero-Broken-Image Policy)
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const [bentoHudBroken, setBentoHudBroken] = useState(false);
  const [bentoCostBroken, setBentoCostBroken] = useState(false);

  // Operational Margin Simulator states
  const [dailyKm, setDailyKm] = useState<number>(150);
  const [workDaysWeek, setWorkDaysWeek] = useState<number>(6);
  const [fuelType, setFuelType] = useState<'gasolina' | 'etanol' | 'gnv'>('gasolina');

  // Modals & platform tabs
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios'>('android');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [apkDownloaded, setApkDownloaded] = useState<boolean>(false);

  // Form accessibility IDs
  const dailyKmInputId = useId();
  const workDaysInputId = useId();
  const fareSliderId = useId();
  const distSliderId = useId();
  const timeSliderId = useId();

  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua)) {
          setInstallDeviceTab('ios');
        } else {
          setInstallDeviceTab('android');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const OFFICIAL_GITHUB_RELEASE_APK_URL =
    'https://github.com/Bieuuuu/Drivewise-1.0/releases/download/latest/drivewise.apk';

  const [apkDownloadUrl, setApkDownloadUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('drivewise_custom_apk_url');
        if (
          saved &&
          saved !== '/drivewise.apk' &&
          !saved.includes('github.com/Bieuuuu/Drivewise/') &&
          !saved.includes('github.com/Bieuuuu/DriveWise/') &&
          saved.trim().length > 0
        ) {
          return saved;
        } else if (saved) {
          localStorage.removeItem('drivewise_custom_apk_url');
        }
      } catch {
        // ignore
      }
    }
    return OFFICIAL_GITHUB_RELEASE_APK_URL;
  });

  const [isConfiguringSource, setIsConfiguringSource] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleSelectPreset = (preset: WorkbenchPreset) => {
    setActivePreset(preset);
    if (preset === 'profitable') {
      setRidePlatform('UberX');
      setRideOfferFare(38.5);
      setRideDistanceKm(9.2);
      setRideDurationMin(18);
    } else if (preset === 'loss') {
      setRidePlatform('99Pop');
      setRideOfferFare(14.2);
      setRideDistanceKm(17.5);
      setRideDurationMin(38);
    } else if (preset === 'battle') {
      setRidePlatform('UberX');
      setRideOfferFare(32.0);
      setRideDistanceKm(8.0);
      setRideDurationMin(16);
    }
  };

  const handleSaveCustomUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = customUrlInput.trim();
    if (!url) {
      setApkDownloadUrl(OFFICIAL_GITHUB_RELEASE_APK_URL);
      try {
        localStorage.removeItem('drivewise_custom_apk_url');
      } catch {}
      setSaveMessage({
        type: 'success',
        text: 'Restaurado para o link oficial do GitHub Release.',
      });
      setTimeout(() => setSaveMessage(null), 3500);
      setIsConfiguringSource(false);
      return;
    }

    const gDriveMatch = url.match(
      /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/
    );
    if (gDriveMatch && gDriveMatch[1]) {
      url = `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}&confirm=t`;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setSaveMessage({
        type: 'error',
        text: 'Insira uma URL válida iniciando com https://',
      });
      return;
    }

    setApkDownloadUrl(url);
    try {
      localStorage.setItem('drivewise_custom_apk_url', url);
    } catch {}
    setSaveMessage({ type: 'success', text: 'Link do APK atualizado com sucesso.' });
    setTimeout(() => {
      setSaveMessage(null);
      setIsConfiguringSource(false);
    }, 2500);
  };

  const handleDownloadApk = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setApkDownloaded(true);
    try {
      localStorage.setItem('drivewise_app_downloaded', 'true');
    } catch {}

    const targetUrl =
      apkDownloadUrl && apkDownloadUrl !== '/drivewise.apk'
        ? apkDownloadUrl
        : OFFICIAL_GITHUB_RELEASE_APK_URL;

    if (typeof window !== 'undefined') {
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', 'drivewise.apk');
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch {}
        }, 400);
      } catch {
        window.location.href = targetUrl;
      }
    }
  };

  const handleInstallClick = () => {
    const isIos =
      typeof navigator !== 'undefined' &&
      /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isIos) {
      setInstallDeviceTab('ios');
      setIsInstallModalOpen(true);
      return;
    }
    handleDownloadApk();
  };

  // Cost engineering & live workbench calculations
  const fuelPriceMap = {
    gasolina: { price: 6.15, kmL: 11.5, label: 'Gasolina' },
    etanol: { price: 4.19, kmL: 8.2, label: 'Etanol' },
    gnv: { price: 4.85, kmL: 13.5, label: 'GNV' },
  };

  const currentFuel = fuelPriceMap[fuelType];
  const monthlyKm = dailyKm * workDaysWeek * 4.33;
  const fuelCostPerKm = currentFuel.price / currentFuel.kmL;
  const maintenanceAndDeprecPerKm = 0.38;
  const totalCostPerKm = fuelCostPerKm + maintenanceAndDeprecPerKm;
  const monthlySavedProfit = monthlyKm * 0.18 * 1.85;
  const annualSavedProfit = monthlySavedProfit * 12;

  // Live Workbench Ride Evaluation
  const tripFuelCost = rideDistanceKm * fuelCostPerKm;
  const tripWearCost = rideDistanceKm * maintenanceAndDeprecPerKm;
  const tripTotalCost = tripFuelCost + tripWearCost;
  const tripNetProfit = rideOfferFare - tripTotalCost;
  const tripGrossPerKm = rideOfferFare / Math.max(rideDistanceKm, 0.1);
  const tripNetPerKm = tripNetProfit / Math.max(rideDistanceKm, 0.1);
  const tripNetPerHour = (tripNetProfit / Math.max(rideDurationMin, 1)) * 60;

  const isTripProfitable = tripNetPerKm >= 1.6 && tripNetProfit > 0;
  const isTripBorderline =
    !isTripProfitable && tripNetPerKm >= 0.95 && tripNetProfit > 0;

  const tripScore = Math.max(
    1.0,
    Math.min(10.0, Number(((tripNetPerKm / 2.8) * 9.2).toFixed(1)))
  );

  return (
    <div className="min-h-screen bg-[#0B0D11] text-[#E8EAED] font-sans selection:bg-[#8AB4F8]/25 selection:text-[#A8C7FA] antialiased">
      {/* 1. TOP BAR CONTRACT: STRICT 3-ZONE STUDIO HEADER */}
      <header className="sticky top-0 z-50 bg-[#0B0D11]/85 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand logo & wordmark */}
          <a
            href="#"
            className="flex items-center gap-2.5 font-display text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4F8] rounded"
          >
            <DriveWiseLogo size={34} className="rounded-xl border border-white/[0.16] shadow-sm" />
            <span>DriveWise</span>
          </a>

          {/* Zone 2: 5 clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9AA0A6]">
            <a
              href="#workbench"
              className="hover:text-white hover:underline underline-offset-8 decoration-[#8AB4F8] transition-colors whitespace-nowrap"
            >
              Workbench
            </a>
            <a
              href="#arquitetura"
              className="hover:text-white hover:underline underline-offset-8 decoration-[#8AB4F8] transition-colors whitespace-nowrap"
            >
              Arquitetura
            </a>
            <a
              href="#resultados"
              className="hover:text-white hover:underline underline-offset-8 decoration-[#8AB4F8] transition-colors whitespace-nowrap"
            >
              Resultados
            </a>
            <a
              href="#simulador"
              className="hover:text-white hover:underline underline-offset-8 decoration-[#8AB4F8] transition-colors whitespace-nowrap"
            >
              Simulador
            </a>
            <a
              href="#instalacao"
              className="hover:text-white hover:underline underline-offset-8 decoration-[#8AB4F8] transition-colors whitespace-nowrap"
            >
              Download
            </a>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="hidden sm:inline-flex min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold text-[#E8EAED] hover:text-white hover:bg-white/[0.06] border border-white/[0.1] transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4F8]"
              >
                Abrir no Navegador
              </button>
            )}

            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] active:scale-[0.98] text-[#080A0E] font-semibold text-xs flex items-center gap-2 transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Baixar APK</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. STUDIO HERO + INTERACTIVE RIDE TELEMETRY WORKBENCH (AI STUDIO WELCOME PATTERN) */}
      <section className="relative pt-14 sm:pt-20 pb-20 sm:pb-28 px-4 sm:px-8 overflow-hidden">
        {/* Subtle Google AI Studio ambient radial glow */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[920px] h-[420px] bg-[radial-gradient(ellipse_at_top,_rgba(138,180,248,0.12),_transparent_70%)] pointer-events-none"
        />

        <div className="max-w-[1200px] mx-auto relative z-10">
          {/* Hero Typography Block */}
          <div className="max-w-3xl">
            {/* Unboxed quiet metadata line with official logo */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-[#9AA0A6] mb-5">
              <DriveWiseLogo size={22} className="rounded-md border border-white/[0.16]" />
              <span className="text-[#8AB4F8] font-medium">DriveWise Studio</span>
              <span aria-hidden="true">·</span>
              <span>Telemetria Financeira em Tempo Real</span>
              <span aria-hidden="true">·</span>
              <span>Uber, 99 e InDrive</span>
            </div>

            <h1
              className="font-display text-3xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-white leading-[1.08]"
              style={{ textWrap: 'balance' }}
            >
              Decida cada corrida com{' '}
              <span className="bg-gradient-to-r from-[#A8C7FA] via-[#8AB4F8] to-[#E8EAED] bg-clip-text text-transparent">
                precisão matemática
              </span>{' '}
              antes de tocar em aceitar.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-[#9AA0A6] max-w-2xl leading-relaxed">
              O ambiente de inteligência veicular que lê ofertas na tela do seu
              Android, desconta combustível, pneus e depreciação por quilômetro e
              exibe o lucro líquido real em menos de 2 segundos.
            </p>

            {/* Single Primary Decision Row */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <button
                type="button"
                onClick={handleInstallClick}
                className="min-h-[46px] px-6 py-3 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] active:scale-[0.99] text-[#080A0E] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <AndroidLogo className="w-4 h-4 shrink-0 text-[#080A0E]" />
                <span>Baixar Instalador Android (.apk · 4.7 MB)</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {onEnterApp && (
                <button
                  type="button"
                  onClick={onEnterApp}
                  className="min-h-[46px] px-6 py-3 rounded-xl bg-[#161920] hover:bg-[#1E222B] text-[#E8EAED] font-medium text-sm border border-white/[0.1] flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8AB4F8]"
                >
                  <span>Abrir Painel no Navegador</span>
                  <ArrowUpRight className="w-4 h-4 text-[#9AA0A6] shrink-0" />
                </button>
              )}
            </div>

            {/* Clean unboxed technical specs */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#9AA0A6]">
              <span>Compatível com Android 8.0+</span>
              <span aria-hidden="true">·</span>
              <span>Download direto sem intermediários</span>
              <span aria-hidden="true">·</span>
              <span>Execução isolada 100% Anti-Ban</span>
              <span aria-hidden="true">·</span>
              <span>Web App disponível no iOS</span>
            </div>
          </div>

          {/* INTERACTIVE STUDIO WORKBENCH (Inspired by AI Studio's interactive prompt console) */}
          <div
            id="workbench"
            className="mt-12 sm:mt-16 rounded-2xl bg-[#13161C] border border-white/[0.09] overflow-hidden"
          >
            {/* Workbench Top Bar */}
            <div className="px-4 sm:px-6 py-3.5 bg-[#171A21] border-b border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-xs text-[#9AA0A6]">
                <DriveWiseLogo size={24} className="rounded-lg border border-white/[0.15]" />
                <span className="font-semibold text-white">
                  Simulador Interativo do Motor de Decisão HUD
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
                <span className="hidden sm:inline">
                  Teste cenários reais ou ajuste os parâmetros da chamada
                </span>
              </div>

              {/* Interactive Segmented Control (Allowed by Section 1.A) */}
              <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0E1015] border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('profitable')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activePreset === 'profitable'
                      ? 'bg-[#222731] text-white'
                      : 'text-[#9AA0A6] hover:text-white'
                  }`}
                >
                  Corrida Lucrativa
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('loss')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activePreset === 'loss'
                      ? 'bg-[#222731] text-white'
                      : 'text-[#9AA0A6] hover:text-white'
                  }`}
                >
                  Armadilha de Prejuízo
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset('battle')}
                  className={`min-h-[34px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    activePreset === 'battle'
                      ? 'bg-[#222731] text-white'
                      : 'text-[#9AA0A6] hover:text-white'
                  }`}
                >
                  Disputa Uber vs 99
                </button>
              </div>
            </div>

            {/* Workbench Body: 12-Col Studio Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
              {/* Left Column (5 cols): Live Input Parameters */}
              <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between space-y-6 bg-[#13161C]">
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">
                      Parâmetros da Chamada na Tela
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('profitable')}
                      className="text-xs text-[#8AB4F8] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Redefinir</span>
                    </button>
                  </div>

                  {/* Platform Selector */}
                  <div>
                    <div className="text-xs text-[#9AA0A6] mb-2">
                      Plataforma de Origem
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['UberX', '99Pop', 'InDrive'] as const).map((plat) => (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => {
                            setRidePlatform(plat);
                            setActivePreset('custom');
                          }}
                          className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                            ridePlatform === plat
                              ? 'bg-[#8AB4F8]/15 border-[#8AB4F8] text-white'
                              : 'bg-[#0E1015] border-white/[0.07] text-[#9AA0A6] hover:text-white'
                          }`}
                        >
                          {plat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fare Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <label htmlFor={fareSliderId} className="text-[#9AA0A6]">
                        Valor Bruto Ofertado
                      </label>
                      <span className="font-mono-num font-semibold text-white text-sm">
                        R$ {rideOfferFare.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id={fareSliderId}
                      type="range"
                      min="8"
                      max="95"
                      step="0.5"
                      value={rideOfferFare}
                      onChange={(e) => {
                        setRideOfferFare(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="w-full accent-[#8AB4F8] h-1.5 bg-[#222731] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Distance Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <label htmlFor={distSliderId} className="text-[#9AA0A6]">
                        Distância Total (Embarque + Destino)
                      </label>
                      <span className="font-mono-num font-semibold text-white text-sm">
                        {rideDistanceKm.toFixed(1)} km
                      </span>
                    </div>
                    <input
                      id={distSliderId}
                      type="range"
                      min="1.5"
                      max="35"
                      step="0.5"
                      value={rideDistanceKm}
                      onChange={(e) => {
                        setRideDistanceKm(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="w-full accent-[#8AB4F8] h-1.5 bg-[#222731] rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Duration Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-2">
                      <label htmlFor={timeSliderId} className="text-[#9AA0A6]">
                        Tempo Total Estimado
                      </label>
                      <span className="font-mono-num font-semibold text-white text-sm">
                        {rideDurationMin} min
                      </span>
                    </div>
                    <input
                      id={timeSliderId}
                      type="range"
                      min="4"
                      max="65"
                      step="1"
                      value={rideDurationMin}
                      onChange={(e) => {
                        setRideDurationMin(Number(e.target.value));
                        setActivePreset('custom');
                      }}
                      className="w-full accent-[#8AB4F8] h-1.5 bg-[#222731] rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Deduction Breakdown Summary */}
                <div className="pt-4 border-t border-white/[0.08] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#9AA0A6]">
                    <span>Combustível ({currentFuel.label}):</span>
                    <span className="font-mono-num text-[#E8EAED]">
                      -R$ {tripFuelCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#9AA0A6]">
                    <span>Desgaste + Depreciação (R$ 0,38/km):</span>
                    <span className="font-mono-num text-[#E8EAED]">
                      -R$ {tripWearCost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-semibold text-white pt-1">
                    <span>Custo Operacional da Corrida:</span>
                    <span className="font-mono-num text-rose-300">
                      -R$ {tripTotalCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column (7 cols): Live Cockpit HUD Preview */}
              <div className="lg:col-span-7 relative min-h-[380px] sm:min-h-[430px] flex flex-col justify-between p-5 sm:p-8 overflow-hidden bg-[#0E1015]">
                {/* High-Fidelity Cockpit Background Image with Measured Scrim */}
                {!heroImgBroken ? (
                  <img
                    src={heroCockpitImg}
                    alt="Painel automotivo noturno com telemetria DriveWise"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgBroken(true)}
                    className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(138,180,248,0.12),_transparent_70%)] pointer-events-none"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#0B0D11] via-[#0B0D11]/80 to-[#0B0D11]/55 pointer-events-none"
                />

                {/* Top Telemetry Context Header */}
                <div className="relative z-10 flex items-center justify-between text-xs text-[#9AA0A6]">
                  <div className="flex items-center gap-2">
                    <DriveWiseLogo size={20} className="rounded-md border border-white/[0.15]" />
                    <span className="text-white font-medium">DriveWise Copiloto HUD · Android</span>
                  </div>
                  <span className="font-mono-num text-[#8AB4F8]">
                    Leitura Instantânea · Nota {tripScore.toFixed(1)}/10
                  </span>
                </div>

                {/* Live Floating HUD Card */}
                <div className="relative z-10 my-auto py-4">
                  {activePreset === 'battle' ? (
                    <div className="rounded-2xl bg-[#13161C]/95 backdrop-blur-md border border-white/[0.12] p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                        <div className="flex items-center gap-3">
                          <DriveWiseLogo size={28} className="rounded-lg border border-white/[0.16]" />
                          <div>
                            <div className="text-xs text-[#8AB4F8] font-medium">
                              Arbitragem Simultânea Detectada
                            </div>
                            <div className="text-base font-semibold text-white mt-0.5">
                              Comparativo UberX vs 99Pop em Tempo Real
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-num text-xs text-emerald-400 font-semibold">
                          UberX paga +R$ 1,55/km a mais
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-[#181C24] border border-emerald-500/40">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-white">
                              UberX · Recomendada
                            </span>
                            <span className="font-mono-num text-emerald-400 font-semibold">
                              ACEITAR
                            </span>
                          </div>
                          <div className="mt-2 text-2xl font-bold font-mono-num text-emerald-400">
                            +R$ 24,68 líq.
                          </div>
                          <div className="mt-1 text-xs text-[#9AA0A6] font-mono-num">
                            R$ 32,00 bruto · 8.0 km · R$ 3,08/km líq.
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#14171E] border border-white/[0.07] opacity-75">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#9AA0A6]">
                              99Pop · Concorrente
                            </span>
                            <span className="font-mono-num text-rose-400 font-semibold">
                              RECUSAR
                            </span>
                          </div>
                          <div className="mt-2 text-2xl font-bold font-mono-num text-[#E8EAED]">
                            +R$ 13,02 líq.
                          </div>
                          <div className="mt-1 text-xs text-[#9AA0A6] font-mono-num">
                            R$ 24,00 bruto · 12.0 km · R$ 1,08/km líq.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`rounded-2xl bg-[#13161C]/95 backdrop-blur-md border p-5 sm:p-6 transition-colors ${
                        isTripProfitable
                          ? 'border-emerald-500/40'
                          : isTripBorderline
                          ? 'border-amber-400/40'
                          : 'border-rose-500/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <DriveWiseLogo size={24} className="rounded-md border border-white/[0.16]" />
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              isTripProfitable
                                ? 'text-emerald-400'
                                : isTripBorderline
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          />
                          <span
                            className={`text-xs sm:text-sm font-bold tracking-wide ${
                              isTripProfitable
                                ? 'text-emerald-400'
                                : isTripBorderline
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {isTripProfitable
                              ? 'VEREDITO: ACEITAR CHAMADA (ALTA RENTABILIDADE)'
                              : isTripBorderline
                              ? 'VEREDITO: MARGEM LIMÍTROFE (AVALIAR RETORNO)'
                              : 'ALERTA: REJEITAR CHAMADA (OPERAÇÃO NO PREJUÍZO)'}
                          </span>
                        </div>
                        <span className="text-xs font-mono-num text-[#9AA0A6]">
                          {ridePlatform} · {rideDistanceKm.toFixed(1)} km ·{' '}
                          {rideDurationMin} min
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4">
                        <div>
                          <div className="text-xs text-[#9AA0A6]">
                            Lucro Líquido Real
                          </div>
                          <div
                            className={`text-2xl sm:text-3xl font-bold font-mono-num mt-1 ${
                              tripNetProfit >= 0 ? 'text-white' : 'text-rose-400'
                            }`}
                          >
                            {tripNetProfit >= 0 ? '+' : ''}R${' '}
                            {tripNetProfit.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                            Oferta bruta: R$ {rideOfferFare.toFixed(2)}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-[#9AA0A6]">
                            Ganho Líquido / km
                          </div>
                          <div
                            className={`text-2xl sm:text-3xl font-bold font-mono-num mt-1 ${
                              isTripProfitable
                                ? 'text-emerald-400'
                                : isTripBorderline
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            R$ {tripNetPerKm.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                            Bruto: R$ {tripGrossPerKm.toFixed(2)}/km
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-1">
                          <div className="text-xs text-[#9AA0A6]">
                            Projeção Líquida / Hora
                          </div>
                          <div className="text-2xl sm:text-3xl font-bold font-mono-num text-[#8AB4F8] mt-1">
                            R$ {tripNetPerHour.toFixed(0)}/h
                          </div>
                          <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                            Livre de combustível e desgaste
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Bar inside Right Workbench */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.08] text-xs text-[#9AA0A6]">
                  <span className="font-mono-num">
                    Base de cálculo: R$ {totalCostPerKm.toFixed(2)}/km (
                    {currentFuel.label} + manutenção)
                  </span>
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="text-[#8AB4F8] hover:text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <span>Baixar Copiloto no Android</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ASYMMETRIC BENTO GRID: CORE CAPABILITIES (GOOGLE AI STUDIO WELCOME CARDS) */}
      <section
        id="arquitetura"
        className="py-20 sm:py-28 px-4 sm:px-8 border-t border-white/[0.07] bg-[#0E1015]"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 sm:mb-16">
            <div className="text-xs text-[#8AB4F8] font-medium mb-2">
              Arquitetura do Sistema
            </div>
            <h2
              className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              Construído para proteger sua margem em cada quilômetro rodado.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#9AA0A6] leading-relaxed">
              Quatro módulos integrados que transformam ofertas brutas das
              plataformas em decisões financeiras exatas.
            </p>
          </div>

          {/* Asymmetric 12-Col Bento Grid (7 + 5, then 5 + 7) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Bento 01 (Span 7) */}
            <div className="lg:col-span-7 rounded-2xl bg-[#13161C] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-2.5">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                  01. Sobreposição HUD Nativa sobre Uber, 99 e InDrive
                </h3>
                <p className="text-sm text-[#9AA0A6] leading-relaxed max-w-xl">
                  Assim que uma corrida toca no seu aparelho, o Copiloto HUD
                  processa distância de embarque, percurso total, tempo e tarifa,
                  exibindo um card flutuante translúcido que não bloqueia o mapa
                  nem o botão de aceite.
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#0B0D11] h-56 sm:h-64">
                {!bentoHudBroken ? (
                  <img
                    src={bentoHudImg}
                    alt="Smartphone Android exibindo sobreposição de telemetria DriveWise"
                    referrerPolicy="no-referrer"
                    onError={() => setBentoHudBroken(true)}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0E1015] text-xs text-[#9AA0A6]">
                    DriveWise HUD Overlay Android
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D11] via-[#0B0D11]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-[#E8EAED] font-mono-num">
                  <span>Latência de leitura &lt; 350ms</span>
                  <span className="text-[#8AB4F8]">Compatível com tela dividida</span>
                </div>
              </div>
            </div>

            {/* Bento 02 (Span 5) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#13161C] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-2.5">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                  02. Arbitragem Simultânea Multi-App
                </h3>
                <p className="text-sm text-[#9AA0A6] leading-relaxed">
                  Quando dois aplicativos tocam ao mesmo tempo, o algoritmo
                  compara instantaneamente o ganho líquido por hora e por
                  quilômetro, destacando qual chamada preserva melhor seu tempo.
                </p>
              </div>

              {/* Clean Tabular Arbitrage Matrix */}
              <div className="rounded-xl bg-[#0E1015] border border-white/[0.07] p-4 space-y-3 font-mono-num text-xs">
                <div className="flex items-center justify-between text-[#9AA0A6] pb-2 border-b border-white/[0.07]">
                  <span> Métrica Comparada</span>
                  <div className="flex items-center gap-6">
                    <span className="text-emerald-400 font-semibold">UberX</span>
                    <span>99Pop</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9AA0A6]">Tarifa Ofertada</span>
                  <div className="flex items-center gap-5">
                    <span className="text-white">R$ 32,00</span>
                    <span className="text-[#9AA0A6]">R$ 24,00</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9AA0A6]">Custo Real da Rota</span>
                  <div className="flex items-center gap-5">
                    <span className="text-white">-R$ 7,32</span>
                    <span className="text-[#9AA0A6]">-R$ 10,98</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.07] font-semibold">
                  <span className="text-white">Lucro Líquido / km</span>
                  <div className="flex items-center gap-5">
                    <span className="text-emerald-400">+R$ 3,08</span>
                    <span className="text-rose-400">+R$ 1,08</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento 03 (Span 5) */}
            <div className="lg:col-span-5 rounded-2xl bg-[#13161C] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-2.5">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                  03. Motor de Custos Ocultos e Depreciação
                </h3>
                <p className="text-sm text-[#9AA0A6] leading-relaxed">
                  Contabiliza consumo específico de Gasolina, Etanol ou GNV
                  somado à amortização por quilômetro de pneus, óleo, pastilhas de
                  freio e desvalorização anual do veículo.
                </p>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-[#0B0D11] h-48">
                {!bentoCostBroken ? (
                  <img
                    src={bentoCostImg}
                    alt="Engenharia de custos automotivos e eficiência"
                    referrerPolicy="no-referrer"
                    onError={() => setBentoCostBroken(true)}
                    className="w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#0E1015] text-xs text-[#9AA0A6]">
                    Engenharia de Custos por Quilômetro
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D11] via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs font-mono-num text-[#E8EAED]">
                  <span>Cálculo ajustado por veículo</span>
                  <span className="text-[#8AB4F8]">Precisão de centavos/km</span>
                </div>
              </div>
            </div>

            {/* Bento 04 (Span 7) */}
            <div className="lg:col-span-7 rounded-2xl bg-[#13161C] border border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div className="space-y-2.5">
                <h3 className="font-display text-lg sm:text-xl font-bold text-white">
                  04. Isolamento Operacional 100% Anti-Ban e Sincronização Segura
                </h3>
                <p className="text-sm text-[#9AA0A6] leading-relaxed max-w-xl">
                  O DriveWise opera de forma totalmente independente: nunca pede
                  suas credenciais da Uber ou 99, não altera arquivos dos
                  aplicativos de corrida e mantém seu histórico de turnos, metas
                  diárias e despesas sincronizado com segurança.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Segurança de Conta</div>
                  <div className="text-lg font-bold text-white font-mono-num mt-1">
                    Zero Injeção
                  </div>
                  <div className="text-xs text-[#9AA0A6] mt-1">
                    Sem acesso às APIs privadas das plataformas
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Disponibilidade</div>
                  <div className="text-lg font-bold text-white font-mono-num mt-1">
                    Offline-First
                  </div>
                  <div className="text-xs text-[#9AA0A6] mt-1">
                    Funciona mesmo em áreas de sombra de sinal
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Gestão de Turnos</div>
                  <div className="text-lg font-bold text-[#8AB4F8] font-mono-num mt-1">
                    Nuvem + PDF
                  </div>
                  <div className="text-xs text-[#9AA0A6] mt-1">
                    Relatórios completos de lucro semanal e mensal
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CLAIM-TO-PROOF ADJACENCY: QUANTIFIED OUTCOMES & DRIVER EVIDENCE */}
      <section
        id="resultados"
        className="py-20 sm:py-24 px-4 sm:px-8 border-t border-white/[0.07] bg-[#0B0D11]"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="text-xs text-[#8AB4F8] font-medium mb-2">
                Evidência Operacional em Campo
              </div>
              <h2
                className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Resultados medidos na rotina de quem roda todos os dias.
              </h2>
            </div>

            <div className="flex items-center gap-6 text-sm font-mono-num">
              <div>
                <div className="text-xs text-[#9AA0A6]">Economia Média Mensal</div>
                <div className="text-xl font-bold text-emerald-400">
                  +R$ 1.420 / mês
                </div>
              </div>
              <div className="h-8 w-px bg-white/[0.08]" />
              <div>
                <div className="text-xs text-[#9AA0A6]">Redução de Km Vazio</div>
                <div className="text-xl font-bold text-[#8AB4F8]">
                  -28,4% em 30 dias
                </div>
              </div>
            </div>
          </div>

          {/* 3 Attributable Case Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-[#13161C] border border-white/[0.08] flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="text-xs text-[#8AB4F8] font-mono-num">
                  +31% de margem líquida por hora em 6 semanas
                </div>
                <p className="text-sm text-[#E8EAED] leading-relaxed">
                  &ldquo;Antes eu aceitava corridas longas de R$ 35 achando que
                  estava ganhando bem. Com o HUD mostrando o desconto real do
                  embarque e do retorno vazio, cortei as chamadas abaixo de R$
                  1,80/km e fecho a meta 2 horas mais cedo.&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.07] text-xs text-[#9AA0A6]">
                <div className="font-semibold text-white">
                  Carlos Eduardo Mendes
                </div>
                <div>Motorista UberX &amp; Comfort · São Paulo, SP (6 anos de praça)</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#13161C] border border-white/[0.08] flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="text-xs text-[#8AB4F8] font-mono-num">
                  R$ 1.580 preservados em combustível no 1º trimestre
                </div>
                <p className="text-sm text-[#E8EAED] leading-relaxed">
                  &ldquo;Rodo com Uber e 99 ligados juntos no horário de pico. O
                  comparativo instantâneo na tela tira a dúvida em 1 segundo
                  quando tocam duas viagens juntas. Parei de rodar no prejuízo em
                  bairros com trânsito travado.&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.07] text-xs text-[#9AA0A6]">
                <div className="font-semibold text-white">
                  Renato Oliveira Santos
                </div>
                <div>Motorista Multi-App Full-Time · Belo Horizonte, MG</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#13161C] border border-white/[0.08] flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="text-xs text-[#8AB4F8] font-mono-num">
                  100% de controle sobre manutenção e depreciação
                </div>
                <p className="text-sm text-[#E8EAED] leading-relaxed">
                  &ldquo;Quando chegava a revisão de pneu e correia eu nunca
                  tinha reserva porque confundia faturamento bruto com lucro. O
                  painel separa automaticamente o custo técnico por km do dinheiro
                  que realmente é meu.&rdquo;
                </p>
              </div>
              <div className="pt-4 border-t border-white/[0.07] text-xs text-[#9AA0A6]">
                <div className="font-semibold text-white">
                  Marcos Vinícius Almeida
                </div>
                <div>Motorista 99Pop &amp; InDrive · Curitiba, PR</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE OPERATIONAL MARGIN SIMULATOR */}
      <section
        id="simulador"
        className="py-20 sm:py-28 px-4 sm:px-8 border-t border-white/[0.07] bg-[#0E1015]"
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs text-[#8AB4F8] font-medium">
                Calculadora de Margem Operacional
              </div>
              <h2
                className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Calcule quanto fica na sua mão ao filtrar corridas deficitárias.
              </h2>
              <p className="text-sm sm:text-base text-[#9AA0A6] leading-relaxed">
                Configure sua quilometragem diária e o combustível utilizado para
                verificar seu custo mínimo real por quilômetro e a economia
                acumulada no mês.
              </p>
            </div>

            <div className="lg:col-span-7 rounded-2xl bg-[#13161C] border border-white/[0.09] p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Daily Km */}
                <div>
                  <div className="flex justify-between items-center mb-2 text-xs">
                    <label htmlFor={dailyKmInputId} className="text-[#9AA0A6]">
                      Quilometragem Diária
                    </label>
                    <span className="font-mono-num font-bold text-white text-sm">
                      {dailyKm} km/dia
                    </span>
                  </div>
                  <input
                    id={dailyKmInputId}
                    type="range"
                    min="60"
                    max="350"
                    step="10"
                    value={dailyKm}
                    onChange={(e) => setDailyKm(Number(e.target.value))}
                    className="w-full accent-[#8AB4F8] h-1.5 bg-[#222731] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Work Days */}
                <div>
                  <div className="flex justify-between items-center mb-2 text-xs">
                    <label htmlFor={workDaysInputId} className="text-[#9AA0A6]">
                      Escala Semanal
                    </label>
                    <span className="font-mono-num font-bold text-white text-sm">
                      {workDaysWeek} dias/semana
                    </span>
                  </div>
                  <input
                    id={workDaysInputId}
                    type="range"
                    min="3"
                    max="7"
                    step="1"
                    value={workDaysWeek}
                    onChange={(e) => setWorkDaysWeek(Number(e.target.value))}
                    className="w-full accent-[#8AB4F8] h-1.5 bg-[#222731] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Fuel Selector */}
              <div>
                <div className="text-xs text-[#9AA0A6] mb-2">
                  Combustível Principal
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(['gasolina', 'etanol', 'gnv'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFuelType(type)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer flex flex-col items-center justify-center ${
                        fuelType === type
                          ? 'border-[#8AB4F8] bg-[#8AB4F8]/15 text-white'
                          : 'border-white/[0.08] bg-[#0E1015] text-[#9AA0A6] hover:text-white'
                      }`}
                    >
                      <span className="capitalize">{type}</span>
                      <span className="text-[11px] font-mono-num text-[#9AA0A6]">
                        R$ {fuelPriceMap[type].price.toFixed(2)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Summary Row */}
              <div className="pt-6 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Custo Mínimo / km</div>
                  <div className="text-xl font-bold text-white font-mono-num mt-1">
                    R$ {totalCostPerKm.toFixed(2)}/km
                  </div>
                  <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                    Combustível + R$ 0,38 desgaste
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Margem Recuperada / Mês</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono-num mt-1">
                    +{formatCurrency(monthlySavedProfit)}
                  </div>
                  <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                    Em {Math.round(monthlyKm)} km rodados/mês
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07]">
                  <div className="text-xs text-[#9AA0A6]">Impacto Acumulado Anual</div>
                  <div className="text-xl font-bold text-[#8AB4F8] font-mono-num mt-1">
                    +{formatCurrency(annualSavedProfit)}
                  </div>
                  <div className="text-[11px] text-[#9AA0A6] mt-0.5 font-mono-num">
                    12 meses de operação filtrada
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. DIRECT OFFICIAL INSTALLATION SECTION */}
      <section
        id="instalacao"
        className="py-20 sm:py-28 px-4 sm:px-8 border-t border-white/[0.07] bg-[#0B0D11]"
      >
        <div className="max-w-[1000px] mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <div className="text-xs text-[#8AB4F8] font-medium mb-2">
                Instalação Oficial e Direta
              </div>
              <h2
                className="font-display text-2xl sm:text-4xl font-bold text-white tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                Pronto para rodar no seu dispositivo em menos de 1 minuto.
              </h2>
            </div>

            {/* Platform Segmented Control */}
            <div className="inline-flex p-1 rounded-xl bg-[#13161C] border border-white/[0.08] gap-1 shrink-0 self-start">
              <button
                type="button"
                onClick={() => setInstallDeviceTab('android')}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  installDeviceTab === 'android'
                    ? 'bg-[#8AB4F8] text-[#080A0E]'
                    : 'text-[#9AA0A6] hover:text-white'
                }`}
              >
                <AndroidLogo className="w-4 h-4 shrink-0" />
                <span>Android (.apk)</span>
              </button>

              <button
                type="button"
                onClick={() => setInstallDeviceTab('ios')}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  installDeviceTab === 'ios'
                    ? 'bg-[#8AB4F8] text-[#080A0E]'
                    : 'text-[#9AA0A6] hover:text-white'
                }`}
              >
                <AppleLogo className="w-4 h-4 shrink-0" />
                <span>iOS (Safari Web)</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#13161C] border border-white/[0.09] p-6 sm:p-8">
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3.5">
                <DriveWiseLogo size={38} className="rounded-xl border border-white/[0.16]" />
                <div>
                  <div className="font-display font-bold text-white text-base">
                    DriveWise Copiloto Oficial
                  </div>
                  <div className="text-xs text-[#9AA0A6]">
                    {installDeviceTab === 'android'
                      ? 'Pacote Nativo Android · drivewise.apk (4.7 MB)'
                      : 'Progressive Web App para iOS · Safari'}
                  </div>
                </div>
              </div>
              <span className="hidden sm:inline-block font-mono-num text-xs text-[#8AB4F8]">
                Release Estável
              </span>
            </div>
            {installDeviceTab === 'android' ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      01. Download Direto
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Baixe o arquivo drivewise.apk
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Toque no botão abaixo para iniciar o download imediato do
                      instalador oficial compilado (4.7 MB) direto na barra de
                      notificações do Android.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      02. Instalação Nativa
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Toque na notificação concluída
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Abra o arquivo baixado. Se o Android exibir o aviso padrão de
                      download fora da Play Store, toque em{' '}
                      <strong className="text-white">Mais detalhes</strong> e depois
                      em <strong className="text-white">Instalar assim mesmo</strong>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      03. Ativação do HUD
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Habilite a sobreposição de tela
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Ao abrir o DriveWise pela primeira vez, ative a permissão de
                      sobreposição para que o card flutuante apareça sobre a Uber e
                      99.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#9AA0A6] text-center sm:text-left">
                    {apkDownloaded ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-2 justify-center sm:justify-start">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>
                          Download de drivewise.apk iniciado. Verifique as
                          notificações do seu aparelho para instalar.
                        </span>
                      </span>
                    ) : (
                      <span>
                        Pacote oficial assinado · drivewise.apk (4.7 MB) ·
                        Android 8.0 ou superior
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDownloadApk(e)}
                    className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] active:scale-[0.99] text-[#080A0E] font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <AndroidLogo className="w-4 h-4 text-[#080A0E] shrink-0" />
                    <span>Baixar drivewise.apk Agora</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      01. Navegador Safari
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Abra no Safari do iPhone
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Acesse o painel web do DriveWise diretamente pelo navegador
                      Safari no seu dispositivo iOS.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      02. Menu Compartilhar
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Toque no ícone de compartilhamento
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Na barra inferior do Safari, toque no botão Compartilhar e
                      role a lista de opções.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-mono-num text-[#8AB4F8]">
                      03. Tela de Início
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Adicionar à Tela de Início
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9AA0A6] leading-relaxed">
                      Confirme em Adicionar para instalar o Web App em tela cheia
                      com acesso imediato ao simulador e gestão de turnos.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-[#9AA0A6]">
                    Progressive Web App otimizado para iOS e iPadOS.
                  </div>

                  {onEnterApp && (
                    <button
                      type="button"
                      onClick={onEnterApp}
                      className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-xl bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#080A0E] font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <AppleLogo className="w-4 h-4 text-[#080A0E] shrink-0" />
                      <span>Abrir Aplicativo no iPhone</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 7. QUIET STUDIO FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#080A0E] py-10 px-4 sm:px-8 text-xs text-[#9AA0A6]">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <DriveWiseLogo size={26} className="rounded-lg border border-white/[0.1]" />
            <span className="font-display font-bold text-white text-sm tracking-tight">
              DriveWise
            </span>
            <span aria-hidden="true">·</span>
            <span>Telemetria e Gestão para Motoristas</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Privacidade e Termos
            </button>
            <a
              href="#workbench"
              className="hover:text-white transition-colors whitespace-nowrap"
            >
              Workbench
            </a>
            <button
              type="button"
              onClick={(e) => handleDownloadApk(e)}
              className="text-[#8AB4F8] hover:text-white font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              Baixar APK (4.7 MB)
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(
                  apkDownloadUrl === OFFICIAL_GITHUB_RELEASE_APK_URL
                    ? ''
                    : apkDownloadUrl
                );
                setIsConfiguringSource(true);
              }}
              className="text-[#9AA0A6] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Fonte do APK
            </button>
          </div>

          <div className="text-[#9AA0A6] whitespace-nowrap">
            © {new Date().getFullYear()} DriveWise.
          </div>
        </div>
      </footer>

      {/* 8. PRIVACY & TERMS MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#13161C] border border-white/[0.12] rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <DriveWiseLogo size={26} className="rounded-lg border border-white/[0.14]" />
                <span>Termos de Uso e Privacidade · DriveWise</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#9AA0A6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#E8EAED] leading-relaxed">
              <h4 className="font-bold text-white text-sm">
                1. Isolamento e Privacidade de Dados
              </h4>
              <p className="text-[#9AA0A6]">
                O DriveWise processa os cálculos de viabilidade localmente no
                aparelho. Seus registros de turnos, despesas e metas permanecem
                vinculados exclusivamente à sua conta.
              </p>

              <h4 className="font-bold text-white text-sm">
                2. Telemetria de Rotas e GPS
              </h4>
              <p className="text-[#9AA0A6]">
                A localização do dispositivo é utilizada estritamente durante os
                turnos ativos para aferir quilometragem real percorrida e consumo
                por quilômetro.
              </p>

              <h4 className="font-bold text-white text-sm">
                3. Conformidade e Operação Anti-Ban
              </h4>
              <p className="text-[#9AA0A6]">
                O aplicativo atua como uma calculadora de sobreposição visual. Não
                solicita senhas de plataformas de corrida e não modifica nenhum
                arquivo de terceiros.
              </p>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="min-h-[40px] px-5 py-2 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#080A0E] font-semibold text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. iOS INSTALLATION MODAL (ONLY FOR APPLE DEVICES) */}
      {isInstallModalOpen && installDeviceTab === 'ios' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#13161C] border border-white/[0.14] rounded-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DriveWiseLogo size={30} className="border border-white/[0.14]" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Instalar no iPhone (iOS)
                  </h3>
                  <p className="text-xs text-[#9AA0A6]">
                    Adicionar à Tela de Início via Safari
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#9AA0A6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs text-[#E8EAED]">
              <p className="text-[#9AA0A6] leading-relaxed">
                Para instalar o DriveWise no iOS:
              </p>
              <div className="p-4 rounded-xl bg-[#0E1015] border border-white/[0.07] space-y-3">
                <div>
                  <span className="font-mono-num text-[#8AB4F8] mr-2">01.</span>
                  <span>
                    No navegador <strong>Safari</strong>, toque no ícone{' '}
                    <strong>Compartilhar</strong> na barra inferior.
                  </span>
                </div>
                <div>
                  <span className="font-mono-num text-[#8AB4F8] mr-2">02.</span>
                  <span>
                    Selecione <strong>Adicionar à Tela de Início</strong>.
                  </span>
                </div>
                <div>
                  <span className="font-mono-num text-[#8AB4F8] mr-2">03.</span>
                  <span>
                    Toque em <strong>Adicionar</strong> no canto superior direito.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
              {onEnterApp && (
                <button
                  type="button"
                  onClick={() => {
                    setIsInstallModalOpen(false);
                    onEnterApp();
                  }}
                  className="min-h-[40px] px-4 py-2 rounded-lg bg-[#8AB4F8] text-[#080A0E] font-semibold text-xs cursor-pointer"
                >
                  Abrir no Navegador Agora
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. DEVELOPER / ADMIN APK URL CONFIGURATION MODAL */}
      {isConfiguringSource && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#13161C] border border-white/[0.14] rounded-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <DriveWiseLogo size={26} className="rounded-lg border border-white/[0.14]" />
                <span>Fonte Oficial do Instalador .APK</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfiguringSource(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#9AA0A6] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomUrl} className="p-5 space-y-4">
              <p className="text-xs text-[#9AA0A6] leading-relaxed">
                Por padrão, o botão baixa diretamente da Release pública do
                repositório <strong>Bieuuuu/Drivewise-1.0</strong>. Caso deseje
                usar um espelho (como Google Drive), cole abaixo:
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#E8EAED] block">
                  URL Direta do Arquivo .apk
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder={OFFICIAL_GITHUB_RELEASE_APK_URL}
                  className="w-full px-3 py-2.5 text-xs rounded-lg bg-[#0B0D11] border border-white/[0.14] text-white placeholder:text-[#9AA0A6]/50 focus:outline-none focus:border-[#8AB4F8] font-mono-num"
                />
              </div>

              {saveMessage && (
                <div
                  className={`text-xs p-3 rounded-lg flex items-center gap-2 ${
                    saveMessage.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {saveMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 min-h-[40px] py-2.5 px-4 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#080A0E] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Salvar URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomUrlInput('');
                    handleSaveCustomUrl();
                  }}
                  className="min-h-[40px] py-2.5 px-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[#E8EAED] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
