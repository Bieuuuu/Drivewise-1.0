import React from 'react';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  Smartphone,
  MapPin,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { isNativeAndroid, nativeBridge } from '../../services/nativeBridge';

interface OverlayPermissionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onGrant?: () => Promise<void>;
}

export const OverlayPermissionModal: React.FC<OverlayPermissionModalProps> = () => {
  const {
    isOverlayPermissionModalOpen,
    hasOverlayPermission,
    hasLocationPermission,
    grantOverlayPermission,
    requestMobileRuntimePermissions,
    refreshNativePermissions,
    dismissOverlayPermissionModal,
  } = useDriveWise();

  if (!isOverlayPermissionModalOpen) return null;

  const isNative = isNativeAndroid();

  const handleActivateHudAndClose = async () => {
    await requestMobileRuntimePermissions();
    if (!hasOverlayPermission) {
      await grantOverlayPermission();
      return;
    }
    await nativeBridge.startFloatingOverlay();
    await refreshNativePermissions();
    dismissOverlayPermissionModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-[#11131A] border border-emerald-500/30 shadow-2xl shadow-black/80 overflow-hidden my-auto">
        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

        {/* Close Button */}
        <button
          onClick={dismissOverlayPermissionModal}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/70 text-slate-400 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Icon Header */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 shadow-inner">
            <Layers className="w-7 h-7 text-emerald-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Sobreposição Nativa Android (System Overlay)
          </div>

          <h2 className="text-xl font-black text-white leading-tight mb-1.5">
            Ativar Bolha & Calculadora Flutuante sobre Uber, 99 e InDrive
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Libere a permissão oficial de <strong>Sobrepor a outros apps</strong> para que a bolha flutuante do DriveWise fique visível por cima da Uber e 99 e expanda a calculadora sem abrir o app principal:
          </p>

          {/* Permission Cards */}
          <div className="space-y-3 mb-4">
            {/* Step 1: System Overlay ("Sobrepor a outros apps") */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                hasOverlayPermission
                  ? 'bg-emerald-950/25 border-emerald-500/40'
                  : 'bg-slate-900/90 border-amber-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      hasOverlayPermission
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      1. Permissão "Sobrepor a outros apps"
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Exibe a bolha e calculadora interativa diretamente sobre a tela da Uber e 99
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                    hasOverlayPermission
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasOverlayPermission ? 'ATIVO ✓' : 'LIBERAR'}
                </span>
              </div>

              <button
                onClick={async () => {
                  await grantOverlayPermission();
                  if (isNative && hasOverlayPermission) {
                    await nativeBridge.expandFloatingOverlayNow();
                  }
                }}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  hasOverlayPermission
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25'
                }`}
              >
                {hasOverlayPermission ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Sobreposição Liberada • Abrir Calculadora Flutuante
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Abrir Configuração "Sobrepor a outros apps"
                  </>
                )}
              </button>
            </div>

            {/* Step 2: GPS & Notifications */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                hasLocationPermission
                  ? 'bg-emerald-950/25 border-emerald-500/40'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      hasLocationPermission
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      2. GPS de Precisão e Notificações
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Para medir a quilometragem real do turno e manter o serviço ativo em segundo plano
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                    hasLocationPermission
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {hasLocationPermission ? 'PERMITIDO ✓' : 'SOLICITAR'}
                </span>
              </div>

              <button
                onClick={requestMobileRuntimePermissions}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                {hasLocationPermission
                  ? 'GPS e Notificações Liberados ✓'
                  : 'Liberar GPS e Notificações no Celular'}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-200/90 leading-relaxed">
              <strong>Como funciona:</strong> A bolha flutuante fica discreta na lateral da tela sobre a <strong>Uber / 99</strong>. Ao tocar nela, ela abre a <strong>Calculadora Semafórica no próprio overlay</strong> (sem abrir o app inteiro), permitindo calcular o lucro líquido e somar corridas concluídas ao seu dia.
            </p>
          </div>

          {/* Primary Action CTA */}
          <div className="space-y-2">
            <button
              onClick={handleActivateHudAndClose}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              {hasOverlayPermission
                ? 'Ativar Bolha Flutuante e Continuar'
                : 'Liberar Sobreposição no Celular'}
            </button>

            <button
              onClick={dismissOverlayPermissionModal}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              Fechar e continuar no painel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
