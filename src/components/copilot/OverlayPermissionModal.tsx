import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  X,
  Shield,
  Smartphone,
  Sparkles,
  Move,
  ArrowRight,
  Eye,
  Check,
  Zap,
} from 'lucide-react';
import { DriveWiseLogo } from '../DriveWiseLogo';

interface OverlayPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrant: () => void;
}

export const OverlayPermissionModal: React.FC<OverlayPermissionModalProps> = ({
  isOpen,
  onClose,
  onGrant,
}) => {
  const [overlayGranted, setOverlayGranted] = useState(true);
  const [accessibilityGranted, setAccessibilityGranted] = useState(true);

  if (!isOpen) return null;

  const handleGrantAll = () => {
    try {
      localStorage.setItem('drivewise_overlay_permission_v1', 'granted');
      localStorage.setItem('drivewise_accessibility_permission_v1', 'granted');
      localStorage.setItem('drivewise_overlay_permission_seen', 'true');
    } catch {}
    onGrant();
  };

  return (
    <div
      id="overlay-permission-modal-backdrop"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
    >
      <div
        id="overlay-permission-card"
        className="w-full max-w-lg bg-[#0C0E14] border border-white/[0.12] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col my-auto relative"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-5 pb-3 flex items-start justify-between border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Configuração de Permissões
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                  Android & Web
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                Permissões do Copiloto Veicular
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <p className="text-xs text-slate-300 leading-relaxed">
            Para que o DriveWise funcione automaticamente em segundo plano enquanto você dirige, conceda as permissões essenciais abaixo:
          </p>

          {/* Permission 1: Overlay */}
          <div
            onClick={() => setOverlayGranted(!overlayGranted)}
            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex items-start justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">1. Sobrepor a outros aplicativos</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Permite que a bolha e o semáforo de lucro flutuem sobre a tela da Uber e da 99 sem fechar os apps de corrida.
                </p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                overlayGranted ? 'bg-emerald-500 text-black' : 'border border-white/20'
              }`}
            >
              {overlayGranted && <Check className="w-4 h-4" />}
            </div>
          </div>

          {/* Permission 2: Accessibility */}
          <div
            onClick={() => setAccessibilityGranted(!accessibilityGranted)}
            className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] flex items-start justify-between gap-3 cursor-pointer transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">2. Serviço de Acessibilidade (Leitor de Corridas)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-sky-500/20 text-sky-400 font-semibold">
                    Automático
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Lê em milissegundos o valor em Reais, a distância (km) e o tempo da chamada quando toca na tela, calculando o lucro líquido por km instantaneamente.
                </p>
              </div>
            </div>
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                accessibilityGranted ? 'bg-emerald-500 text-black' : 'border border-white/20'
              }`}
            >
              {accessibilityGranted && <Check className="w-4 h-4" />}
            </div>
          </div>

          {/* Privacy Security Notice */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-[11px] text-slate-300">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>100% Privado e Seguro:</strong> O DriveWise não altera seus apps, não grava senhas e apenas realiza cálculos financeiros matemáticos no aparelho.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 pt-3 border-t border-white/[0.07] bg-[#0A0C10] flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-mono text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Depois
          </button>
          <button
            type="button"
            onClick={handleGrantAll}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Conceder Permissões & Ativar Copiloto</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
