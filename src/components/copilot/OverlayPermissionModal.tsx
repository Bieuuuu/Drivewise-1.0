import React from 'react';
import {
  Layers,
  CheckCircle2,
  X,
  Shield,
  Smartphone,
  Sparkles,
  Move,
  ArrowRight,
} from 'lucide-react';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { useDriveWise } from '../../context/DriveWiseContext';

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
  if (!isOpen) return null;

  return (
    <div
      id="overlay-permission-modal-backdrop"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
    >
      <div
        id="overlay-permission-card"
        className="w-full max-w-md bg-[#0C0E14] border border-white/[0.12] rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col my-auto relative"
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-emerald-500/20 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="relative p-5 pb-3 flex items-start justify-between border-b border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Permissão Essencial
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-white/[0.06] text-slate-400 border border-white/[0.06]">
                  Android & iOS
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                Sobrepor a outros aplicativos
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Visual Mockup of the Floating Bubble over an App */}
          <div className="relative rounded-2xl bg-gradient-to-b from-[#141721] to-[#0A0C10] border border-white/[0.08] p-4 overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pb-2 border-b border-white/[0.06] mb-3">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                Uber Driver / 99 Motorista
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Em Corrida
              </span>
            </div>

            {/* Fake Driver App UI with DriveWise Floating Bubble */}
            <div className="relative h-28 bg-[#07080B] rounded-xl border border-white/[0.04] p-3 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="h-2 w-20 bg-slate-800 rounded" />
                  <div className="h-1.5 w-12 bg-slate-800/60 rounded" />
                </div>
                <div className="h-3 w-10 bg-slate-800 rounded" />
              </div>

              {/* Floating Bubble representation */}
              <div className="absolute right-3 top-6 flex items-center gap-2 animate-bounce">
                <div className="w-12 h-12 rounded-full bg-[#0C0E14] border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] flex items-center justify-center relative cursor-grab">
                  <DriveWiseLogo size={24} />
                  {/* Radar pulse */}
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border border-black" />
                </div>
                <div className="bg-emerald-950/90 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 font-bold px-2 py-1 rounded-lg shadow-lg backdrop-blur-md">
                  Círculo Ativo
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <Move className="w-3 h-3 text-slate-400" />
                <span>Arraste para as laterais da tela</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Para que o <strong>Copiloto Inteligente do DriveWise</strong> apareça como uma bolha flutuante sobre a Uber e 99 enquanto você dirige, conceda a permissão de sobreposição.
          </p>

          {/* Benefits Bullet Points */}
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Semáforo Instantâneo:</strong> O círculo expande automaticamente quando toca uma corrida com nota e lucro líquido.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Total Liberdade:</strong> Mova o círculo para a borda esquerda ou direita com atração magnética.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade Garantida:</strong> Apenas calcula dados financeiros na sua cabine.
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 pt-3 border-t border-white/[0.07] bg-[#0A0C10] flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs font-mono text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            Depois
          </button>
          <button
            type="button"
            onClick={onGrant}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_4px_20px_rgba(52,211,153,0.3)] flex items-center justify-center gap-2"
          >
            <span>Conceder Permissão & Ativar Bolha</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
