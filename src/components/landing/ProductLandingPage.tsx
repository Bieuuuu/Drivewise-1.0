import React, { useState, useEffect, useId } from 'react';
import {
  Download,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Fuel,
  ArrowRight,
  Clock,
  MapPin,
  Check,
  Zap,
  Layers,
  X,
  Smartphone,
  ChevronRight,
  Activity,
  Sliders,
  Maximize2,
  SlidersHorizontal,
  Link as LinkIcon,
  Settings2,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  RefreshCw,
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
  // Scenario selector
  const [activeScenario, setActiveScenario] = useState<ScenarioType>('profitable');

  // Calculator states
  const [dailyKm, setDailyKm] = useState<number>(140);
  const [workDaysWeek, setWorkDaysWeek] = useState<number>(6);
  const [fuelType, setFuelType] = useState<'gasolina' | 'etanol' | 'gnv'>('gasolina');

  // Modals & tabs
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);
  const [installDeviceTab, setInstallDeviceTab] = useState<'android' | 'ios'>('android');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [apkDownloaded, setApkDownloaded] = useState<boolean>(false);

  // Form IDs
  const dailyKmInputId = useId();
  const workDaysInputId = useId();

  // Operating system detection for smart download defaulting
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

  const OFFICIAL_GITHUB_RELEASE_APK_URL = 'https://github.com/Bieuuuu/DriveWise/releases/latest/download/drivewise.apk';

  const [apkDownloadUrl, setApkDownloadUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('drivewise_custom_apk_url');
        if (saved && saved !== '/drivewise.apk' && saved.trim().length > 0) {
          return saved;
        }
      } catch {
        // ignore
      }
    }
    return OFFICIAL_GITHUB_RELEASE_APK_URL;
  });

  const [isConfiguringSource, setIsConfiguringSource] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSaveCustomUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let url = customUrlInput.trim();
    if (!url) {
      setApkDownloadUrl(OFFICIAL_GITHUB_RELEASE_APK_URL);
      try {
        localStorage.removeItem('drivewise_custom_apk_url');
      } catch {}
      setSaveMessage({ type: 'success', text: 'Restaurado para o link oficial de Release.' });
      setTimeout(() => setSaveMessage(null), 3500);
      setIsConfiguringSource(false);
      return;
    }

    // Auto-convert Google Drive sharing link to direct download link
    const gDriveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      url = `https://drive.google.com/uc?export=download&id=${gDriveMatch[1]}`;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setSaveMessage({ type: 'error', text: 'Insira uma URL válida iniciando com https://' });
      return;
    }

    setApkDownloadUrl(url);
    try {
      localStorage.setItem('drivewise_custom_apk_url', url);
    } catch {}
    setSaveMessage({ type: 'success', text: 'Link do APK salvo com sucesso!' });
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

    const targetUrl = apkDownloadUrl && apkDownloadUrl !== '/drivewise.apk'
      ? apkDownloadUrl
      : OFFICIAL_GITHUB_RELEASE_APK_URL;

    if (typeof window !== 'undefined') {
      try {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', 'drivewise.apk');
        link.target = '_blank';
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
    const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isIos) {
      setInstallDeviceTab('ios');
      setIsInstallModalOpen(true);
      return;
    }

    // On Android and all other devices: download directly without wizard modal
    handleDownloadApk();
  };

  // Technical cost modeling
  const fuelPriceMap = {
    gasolina: { price: 6.15, kmL: 11.5, label: 'Gasolina' },
    etanol: { price: 4.19, kmL: 8.2, label: 'Etanol' },
    gnv: { price: 4.85, kmL: 13.5, label: 'GNV' },
  };

  const currentFuel = fuelPriceMap[fuelType];
  const monthlyKm = dailyKm * workDaysWeek * 4.33;
  const fuelCostPerKm = currentFuel.price / currentFuel.kmL;
  const maintenanceAndDeprecPerKm = 0.38; // Technical reference: tires, brakes, oil and vehicle depreciation
  const totalCostPerKm = fuelCostPerKm + maintenanceAndDeprecPerKm;
  const monthlySavedProfit = monthlyKm * 0.18 * 1.85;
  const annualSavedProfit = monthlySavedProfit * 12;

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300 antialiased">
      {/* 1. TOP STATUS BAR (MINIMALIST & MONOCHROME) */}
      <div className="border-b border-white/[0.06] bg-[#08090C] py-2 px-4 text-center text-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium tracking-wide">
              DriveWise Copiloto v2.5
            </span>
            <span className="hidden sm:inline text-slate-500">•</span>
            <span className="hidden sm:inline text-slate-400">
              Disponível em instalador oficial para Android (.apk) e versão Web iOS
            </span>
          </div>

          <a
            href={apkDownloadUrl}
            download="drivewise.apk"
            onClick={(e) => handleDownloadApk(e)}
            className="text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Baixar APK (12.8 MB)</span>
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
          </a>
        </div>
      </div>

      {/* 2. REFINED NAVBAR */}
      <header className="sticky top-0 z-50 bg-[#050608]/90 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Monogram & Title */}
          <div className="flex items-center gap-3">
            <DriveWiseLogo size={36} className="shadow-lg border border-white/[0.14]" />
            <div className="flex flex-col">
              <span className="font-bold text-white text-base tracking-wider leading-none">
                DRIVEWISE
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-0.5">
                Copiloto Veicular
              </span>
            </div>
          </div>

          {/* Minimalist Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-300">
            <a href="#copiloto" className="hover:text-white transition-colors">
              Copiloto HUD
            </a>
            <a href="#arquitetura" className="hover:text-white transition-colors">
              Arquitetura
            </a>
            <a href="#simulador" className="hover:text-white transition-colors">
              Simulador
            </a>
            <a href="#instalacao" className="hover:text-white transition-colors">
              Instalação
            </a>
          </nav>

          {/* Header Action CTAs */}
          <div className="flex items-center gap-2.5">
            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="hidden sm:inline-flex min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition-all cursor-pointer"
              >
                Acessar Painel
              </button>
            )}

            <button
              type="button"
              onClick={handleInstallClick}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>Baixar APK</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION (PROFESSIONAL & HIGH CONTRAST) */}
      <section className="relative pt-16 sm:pt-24 pb-16 sm:pb-24 px-4 sm:px-8 overflow-hidden">
        {/* Subtle Ambient Radial Grid */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-b from-white/[0.03] to-transparent blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Refined Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-medium text-slate-300 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Telemetria em Tempo Real para Uber, 99 e InDrive</span>
          </div>

          <h1 className="text-3xl xs:text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.12]">
            A inteligência matemática <br className="hidden sm:inline" />
            <span className="text-slate-400">no seu volante.</span>
          </h1>

          <p className="mt-5 sm:mt-6 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            O único copiloto em tempo real que calcula o lucro líquido real por quilômetro e por hora, compara chamadas simultâneas e impede corridas no prejuízo antes de você aceitar.
          </p>

          {/* Primary Action Row */}
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg transition-all cursor-pointer"
            >
              <AndroidLogo className="w-4 h-4 text-slate-950" />
              <span>Baixar APK Oficial (.apk)</span>
            </button>

            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 border border-white/[0.12] transition-all cursor-pointer"
              >
                <span>Acessar Painel Web</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Discreet Reassurance Specs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Arquivo de 12.8 MB
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% Anti-Ban
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Operação Offline-First
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" /> Sem fidelidade
            </span>
          </div>

          {/* Minimalist Metrics Strip */}
          <div className="mt-14 sm:mt-18 grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#090A0E] border border-white/[0.08]">
              <div className="text-xs text-slate-400 font-medium">Margem Preservada</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">+R$ 1.450</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Média mensal por motorista</div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#090A0E] border border-white/[0.08]">
              <div className="text-xs text-slate-400 font-medium">Tempo de Análise</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">&lt; 2 seg</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Leitura rápida no suporte</div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#090A0E] border border-white/[0.08]">
              <div className="text-xs text-slate-400 font-medium">Precisão Operacional</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">100%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Custo/km aferido por rota</div>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-[#090A0E] border border-white/[0.08]">
              <div className="text-xs text-slate-400 font-medium">Risco de Plataforma</div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono mt-1">0%</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Isolado sem injeção de código</div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. REFINED COPILOT HUD SIMULATOR */}
      <section id="copiloto" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#08090C] border-y border-white/[0.07]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              INTERFACE VEICULAR EM AÇÃO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Como o Copiloto avalia as chamadas na sua tela
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              Uma sobreposição discreta e de alto contraste projetada para ser lida em 2 segundos sem tirar sua atenção do trânsito:
            </p>

            {/* Segmented Scenario Toggles */}
            <div className="mt-6 inline-flex p-1 rounded-xl bg-[#0E1015] border border-white/[0.08] gap-1 max-w-lg w-full">
              <button
                type="button"
                onClick={() => setActiveScenario('profitable')}
                className={`flex-1 min-h-[38px] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeScenario === 'profitable'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Corrida Oportuna
              </button>

              <button
                type="button"
                onClick={() => setActiveScenario('loss')}
                className={`flex-1 min-h-[38px] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeScenario === 'loss'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cilada (Prejuízo)
              </button>

              <button
                type="button"
                onClick={() => setActiveScenario('battle')}
                className={`flex-1 min-h-[38px] px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeScenario === 'battle'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Disputa Uber vs 99
              </button>
            </div>
          </div>

          {/* Minimalist Telemetry Display Frame */}
          <div className="max-w-md mx-auto rounded-3xl bg-[#0B0D12] border border-white/[0.12] p-4 sm:p-5 shadow-2xl relative overflow-hidden">
            {/* Top Device Header Indicator */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <DriveWiseLogo size={20} className="rounded-md border border-white/[0.1]" />
                <span className="font-semibold text-white">DriveWise Telemetria</span>
              </div>
              <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ao Vivo
              </span>
            </div>

            {/* Active Card Scenario */}
            <div className="mt-4">
              {activeScenario === 'profitable' && (
                <div className="p-4 rounded-2xl bg-[#0F131A] border border-white/[0.12] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                      Recomendação: ACEITAR
                    </span>
                    <span className="font-mono text-xs text-slate-300 bg-white/[0.06] px-2 py-0.5 rounded border border-white/[0.08]">
                      Índice 9.8 / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] text-slate-400">Valor Bruto da Viagem</div>
                      <div className="text-xl font-bold text-white font-mono">R$ 38,50</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Lucro Líquido Real</div>
                      <div className="text-xl font-bold text-emerald-400 font-mono">+R$ 29,10</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>9.2 km • 18 min</span>
                    <span className="text-emerald-400 font-bold">R$ 3,16 / km líquido</span>
                  </div>
                </div>
              )}

              {activeScenario === 'loss' && (
                <div className="p-4 rounded-2xl bg-[#140F11] border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                      Alerta: REJEITAR (CILADA)
                    </span>
                    <span className="font-mono text-xs text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                      Índice 2.1 / 10
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] text-slate-400">Valor Bruto da Viagem</div>
                      <div className="text-xl font-bold text-slate-200 font-mono">R$ 14,20</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400">Saldo Real Após Custos</div>
                      <div className="text-xl font-bold text-rose-400 font-mono">-R$ 3,40</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span>17.5 km • 38 min</span>
                    <span className="text-rose-400 font-bold">R$ 0,81 / km (Abaixo do Custo)</span>
                  </div>
                </div>
              )}

              {activeScenario === 'battle' && (
                <div className="p-4 rounded-2xl bg-[#0F131A] border border-white/[0.12] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" /> Disputa de Plataformas
                    </span>
                    <span className="font-mono text-xs text-slate-400">Decisão em 2s</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-emerald-500/40 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">UberX (Vencedora)</div>
                        <div className="text-[11px] text-slate-400">R$ 32,00 • 8 km</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-emerald-400">+R$ 2,90 / km</div>
                        <span className="text-[10px] text-emerald-400 uppercase">Aceitar</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between opacity-60">
                      <div>
                        <div className="text-xs font-semibold text-slate-300">99Pop (Inviável)</div>
                        <div className="text-[11px] text-slate-500">R$ 24,00 • 12 km</div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-xs text-slate-400">R$ 1,35 / km</div>
                        <span className="text-[10px] text-slate-500 uppercase">Descartar</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Status Row */}
            <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
              <span>Custo de rodagem atual: R$ {totalCostPerKm.toFixed(2)}/km</span>
              <button
                type="button"
                onClick={handleInstallClick}
                className="text-white hover:text-emerald-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                Instalar no Celular <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ARCHITECTURE & CAPABILITIES (MINIMALIST BENTO GRID) */}
      <section id="arquitetura" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#050608]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              ENGENHARIA E PRECISÃO
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Quatro pilares para proteger seu trabalho
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Bento Card 1 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.16] transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">Copiloto HUD Flutuante</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Widget translúcido otimizado para Android que sobrepõe os aplicativos de corrida sem obstruir o mapa ou comandos de aceitação.
              </p>
            </div>

            {/* Bento Card 2 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.16] transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white mb-4">
                <Fuel className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">Cálculo de Custos Ocultos</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Mecanismo que soma consumo de combustível (Gasolina, Etanol ou GNV) à amortização de pneus, troca de óleo, freios e depreciação veicular.
              </p>
            </div>

            {/* Bento Card 3 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.16] transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white mb-4">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">Arbitragem de Plataformas</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Algoritmo instantâneo que ranqueia chamadas concorrentes da Uber e 99 pelo retorno financeiro líquido por hora e por quilômetro.
              </p>
            </div>

            {/* Bento Card 4 */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.16] transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-white mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-white">Segurança e Autonomia</h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                Execução 100% local com criptografia. Não solicita senhas das operadoras, não realiza injeção de código e não infringe termos de serviço.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FINANCIAL SIMULATOR (MINIMALIST & CLEAN) */}
      <section id="simulador" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#08090C] border-t border-white/[0.07]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              CALCULADORA DE MARGEM OPERACIONAL
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Simule a economia real na sua rotina
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              Ajuste sua quilometragem diária e tipo de abastecimento para visualizar o custo técnico por km e a margem resgatada:
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-[#0B0D12] border border-white/[0.1] p-5 sm:p-8 rounded-3xl">
            {/* Input Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Daily Km */}
              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <label htmlFor={dailyKmInputId} className="font-semibold text-slate-300 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Quilometragem diária média:</span>
                  </label>
                  <span className="font-mono font-bold text-white text-sm">
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
                  className="w-full accent-white h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Work Days */}
              <div>
                <div className="flex justify-between items-center mb-2 text-xs">
                  <label htmlFor={workDaysInputId} className="font-semibold text-slate-300 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dias de trabalho por semana:</span>
                  </label>
                  <span className="font-mono font-bold text-white text-sm">
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
                  className="w-full accent-white h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Fuel Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2 flex items-center gap-2">
                  <Fuel className="w-3.5 h-3.5 text-slate-400" />
                  <span>Combustível Principal:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['gasolina', 'etanol', 'gnv'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFuelType(type)}
                      className={`min-h-[42px] py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex flex-col items-center justify-center ${
                        fuelType === type
                          ? 'border-white bg-white/[0.08] text-white shadow-sm'
                          : 'border-white/[0.08] bg-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="capitalize">{type}</span>
                      <span className="text-[10px] font-mono text-slate-500">R$ {fuelPriceMap[type].price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculations Output */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0F131A] border border-white/[0.08] flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Composição do Custo Técnico
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Combustível por km:</span>
                    <span className="font-mono font-semibold text-white">R$ {fuelCostPerKm.toFixed(2)}/km</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Desgaste + Depreciação:</span>
                    <span className="font-mono font-semibold text-slate-400">R$ {maintenanceAndDeprecPerKm.toFixed(2)}/km</span>
                  </div>
                  <div className="pt-2 border-t border-white/[0.08] flex justify-between font-bold text-white">
                    <span>Custo Operacional Mínimo:</span>
                    <span className="font-mono text-white">R$ {totalCostPerKm.toFixed(2)}/km</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/[0.08]">
                  <div className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    Economia Estimada com DriveWise
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono mt-1">
                    +{formatCurrency(monthlySavedProfit)}
                    <span className="text-xs text-slate-400 font-normal ml-1">/ mês</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Projeção anual de <strong>+{formatCurrency(annualSavedProfit)}</strong> ao eliminar chamadas com prejuízo oculto.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleInstallClick}
                className="mt-6 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Baixar App e Preservar Essa Margem</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. OFFICIAL INSTALLATION SECTION (NO NONSENSE) */}
      <section id="instalacao" className="py-16 sm:py-24 px-4 sm:px-8 bg-[#050608] border-t border-white/[0.07]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">
              DOWNLOAD OFICIAL
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Instalação rápida e direta
            </h2>
            <p className="text-slate-400 text-xs sm:text-base max-w-xl mx-auto mt-2">
              Selecione o seu sistema operacional para obter a versão oficial do DriveWise:
            </p>

            {/* Platform Segmented Control */}
            <div className="mt-6 inline-flex p-1 rounded-xl bg-[#090A0E] border border-white/[0.08] gap-1">
              <button
                type="button"
                onClick={() => setInstallDeviceTab('android')}
                className={`min-h-[40px] px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  installDeviceTab === 'android'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AndroidLogo className="w-4 h-4" />
                <span>Android (.apk)</span>
              </button>

              <button
                type="button"
                onClick={() => setInstallDeviceTab('ios')}
                className={`min-h-[40px] px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  installDeviceTab === 'ios'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <AppleLogo className="w-4 h-4" />
                <span>iOS (Safari)</span>
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-8 rounded-3xl bg-[#090A0E] border border-white/[0.09]">
            {installDeviceTab === 'android' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      1
                    </div>
                    <h3 className="font-semibold text-white text-sm">Download do Arquivo</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Toque no botão abaixo para baixar o instalador oficial <strong>drivewise.apk</strong> (12.8 MB).
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      2
                    </div>
                    <h3 className="font-semibold text-white text-sm">Abrir e Instalar</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Puxe sua barra de notificações e toque no arquivo baixado para concluir a instalação.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      3
                    </div>
                    <h3 className="font-semibold text-white text-sm">Permitir Sobreposição</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Na primeira execução, conceda a permissão de bolha flutuante para ler as corridas em tempo real.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06]">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    {apkDownloaded ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5 justify-center sm:justify-start">
                        <CheckCircle2 className="w-4 h-4" /> Download em andamento. Abra suas notificações para instalar.
                      </span>
                    ) : (
                      <span>Compatível com Android 8.0 ou superior. Play Protect verificado.</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleDownloadApk(e)}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow transition-all cursor-pointer whitespace-nowrap"
                  >
                    <AndroidLogo className="w-4 h-4 text-slate-950" />
                    <span>Baixar APK Direto (.apk)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      1
                    </div>
                    <h3 className="font-semibold text-white text-sm">Acesse no Safari</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Abra o site no navegador Safari do seu iPhone.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      2
                    </div>
                    <h3 className="font-semibold text-white text-sm">Compartilhar</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Toque no ícone de compartilhamento na barra inferior do Safari.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white font-bold mx-auto flex items-center justify-center text-xs mb-3">
                      3
                    </div>
                    <h3 className="font-semibold text-white text-sm">Adicionar à Tela</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Selecione <strong>"Adicionar à Tela de Início"</strong> para fixar o ícone nativo.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.06]">
                  <div className="text-xs text-slate-400 text-center sm:text-left">
                    Versão otimizada para iOS via Progressive Web App.
                  </div>

                  {onEnterApp && (
                    <button
                      type="button"
                      onClick={onEnterApp}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                    >
                      <AppleLogo className="w-4 h-4 text-slate-950" />
                      <span>Abrir no iPhone Agora</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 8. FOOTER (MINIMALIST & CLEAN) */}
      <footer className="border-t border-white/[0.07] bg-[#040507] py-8 sm:py-12 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <DriveWiseLogo size={28} className="rounded-lg border border-white/[0.1]" />
            <div>
              <div className="font-bold text-white text-xs tracking-wider">DRIVEWISE</div>
              <div className="text-[11px] text-slate-400">
                Copiloto de Rentabilidade para Motoristas de Aplicativo
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Privacidade
            </button>
            <button
              type="button"
              onClick={() => setIsPrivacyModalOpen(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Termos de Uso
            </button>
            <a
              href="#instalacao"
              className="hover:text-white transition-colors"
            >
              Instalação
            </a>
            <button
              type="button"
              onClick={(e) => handleDownloadApk(e)}
              className="text-white hover:text-emerald-400 font-semibold transition-colors cursor-pointer"
            >
              Baixar APK
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomUrlInput(apkDownloadUrl === OFFICIAL_GITHUB_RELEASE_APK_URL ? '' : apkDownloadUrl);
                setIsConfiguringSource(true);
              }}
              className="text-slate-500 hover:text-slate-300 text-[11px] transition-colors cursor-pointer"
            >
              Configurar URL do APK
            </button>
          </div>

          <div className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} DriveWise. Todos os direitos reservados.
          </div>
        </div>
      </footer>

      {/* 9. PRIVACY & TERMS MODAL */}
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090B10] border border-white/[0.12] rounded-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Termos e Privacidade • DriveWise</span>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <h4 className="font-bold text-white text-sm">1. Privacidade do Motorista</h4>
              <p>
                O DriveWise é projetado com isolamento de dados. Informações financeiras, jornadas e preferências operacionais são mantidas sob controle do usuário e nunca são comercializadas.
              </p>

              <h4 className="font-bold text-white text-sm">2. Telemetria e Localização (GPS)</h4>
              <p>
                O acesso à localização é utilizado estritamente para apurar quilometragem real e consumo durante as jornadas ativas.
              </p>

              <h4 className="font-bold text-white text-sm">3. Segurança Anti-Ban</h4>
              <p>
                O DriveWise funciona como um assistente de produtividade local e sobreposição de tela. Não intercepta servidores nem viola as diretrizes de segurança dos aplicativos de mobilidade.
              </p>
            </div>

            <div className="p-4 border-t border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Entendi e Concordo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. iOS INSTALLATION MODAL (ONLY FOR APPLE DEVICES) */}
      {isInstallModalOpen && installDeviceTab === 'ios' && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090B10] border border-white/[0.14] rounded-3xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <DriveWiseLogo size={32} className="border border-white/[0.14]" />
                <div>
                  <h3 className="text-sm font-bold text-white">Instalar no iPhone (iOS)</h3>
                  <p className="text-xs text-slate-400">Adicionar à Tela de Início via Safari</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-slate-300">
              <p className="text-xs text-slate-300 leading-relaxed">
                No iOS, aplicativos externos funcionam como Web App nativo (PWA) direto pelo Safari:
              </p>
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    1
                  </span>
                  <span>No navegador <strong>Safari</strong> do iPhone, toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    2
                  </span>
                  <span>Role para baixo e toque em <strong>&ldquo;Adicionar à Tela de Início&rdquo;</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-white/[0.08] text-white font-bold flex items-center justify-center shrink-0 text-[10px]">
                    3
                  </span>
                  <span>Toque em <strong>Adicionar</strong> no canto superior direito para abrir em tela cheia!</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/[0.08] bg-[#07080C] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsInstallModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. DEVELOPER / ADMIN APK URL CONFIGURATION MODAL */}
      {isConfiguringSource && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#090B10] border border-white/[0.14] rounded-3xl max-w-md w-full flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span>Configurar Link do APK Oficial</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfiguringSource(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomUrl} className="p-5 space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Defina a URL de onde o arquivo <strong>drivewise.apk</strong> será baixado quando o usuário clicar no botão. Por padrão, aponta para a Release do GitHub.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  URL Direta do Arquivo .apk
                </label>
                <input
                  type="text"
                  value={customUrlInput}
                  onChange={(e) => setCustomUrlInput(e.target.value)}
                  placeholder={OFFICIAL_GITHUB_RELEASE_APK_URL}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-[#050608] border border-white/[0.14] text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {saveMessage && (
                <div className={`text-xs p-3 rounded-xl flex items-center gap-2 ${saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'}`}>
                  {saveMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Salvar URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomUrlInput('');
                    handleSaveCustomUrl();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
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
