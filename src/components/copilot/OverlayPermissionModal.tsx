import React from 'react';
import {
  Layers,
  ShieldCheck,
  CheckCircle2,
  X,
  Eye,
  Smartphone,
  MapPin,
  ExternalLink,
  Sparkles,
  Info,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { isNativeAndroid, nativeBridge } from '../../services/nativeBridge';

export const OverlayPermissionModal: React.FC = () => {
  const {
    isOverlayPermissionModalOpen,
    hasOverlayPermission,
    hasAccessibilityPermission,
    hasLocationPermission,
    isNativeOverlayRunning,
    grantOverlayPermission,
    grantAccessibilityPermission,
    requestMobileRuntimePermissions,
    refreshNativePermissions,
    dismissOverlayPermissionModal,
  } = useDriveWise();

  if (!isOverlayPermissionModalOpen) return null;

  const isNative = isNativeAndroid();

  const handleActivateHudAndClose = async () => {
    await refreshNativePermissions();
    if (hasOverlayPermission || !isNative) {
      await nativeBridge.startFloatingOverlay();
      dismissOverlayPermissionModal();
    } else {
      await grantOverlayPermission();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-[#11131A] border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 overflow-hidden my-auto">
        {/* Top Accent Gradient */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500" />

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
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-inner">
            <Layers className="w-7 h-7 text-indigo-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Permissões do Sistema Android
          </div>

          <h2 className="text-xl font-black text-white leading-tight mb-1.5">
            Ativar Copiloto Fora do App (Sobre Uber, 99 e InDrive)
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Para o semáforo de lucro flutuar <strong>fora do DriveWise</strong> sobre a tela da Uber e 99, libere as permissões abaixo no seu celular:
          </p>

          {/* Permission Cards */}
          <div className="space-y-3 mb-4">
            {/* Step 1: SYSTEM_ALERT_WINDOW (Overlay) */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                hasOverlayPermission
                  ? 'bg-emerald-950/25 border-emerald-500/40'
                  : 'bg-slate-900/90 border-indigo-500/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      hasOverlayPermission
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      1. Sobrepor a outros apps (Obrigatório)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Desenha a pílula e o card de lucro fora do aplicativo
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
                  {hasOverlayPermission ? 'ATIVO ✓' : 'PENDENTE'}
                </span>
              </div>

              <button
                onClick={grantOverlayPermission}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  hasOverlayPermission
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25'
                }`}
              >
                {hasOverlayPermission ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Permissão Concedida (Testar HUD Flutuante)
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    Abrir "Sobrepor a outros apps" no Celular
                  </>
                )}
              </button>
            </div>

            {/* Step 2: Accessibility Service (Ride Reader) */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                hasAccessibilityPermission
                  ? 'bg-emerald-950/25 border-emerald-500/40'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      hasAccessibilityPermission
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-white">
                      2. Leitura Automática de Chamadas (Acessibilidade)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Lê o valor R$, KM e minutos na tela da Uber e 99 automaticamente
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                    hasAccessibilityPermission
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {hasAccessibilityPermission ? 'ATIVO ✓' : 'ATIVAR'}
                </span>
              </div>

              <button
                onClick={grantAccessibilityPermission}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  hasAccessibilityPermission
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                <Smartphone className="w-4 h-4 text-amber-400" />
                {hasAccessibilityPermission
                  ? 'Acessibilidade Ativa no Celular ✓'
                  : 'Abrir Configurações de Acessibilidade'}
              </button>
            </div>

            {/* Step 3: GPS & Notifications */}
            <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">3. GPS e Notificações de Turno</h4>
                  <p className="text-[10px] text-slate-400">
                    {hasLocationPermission
                      ? 'GPS e alertas prontos para uso'
                      : 'Necessário para medir KM por GPS'}
                  </p>
                </div>
              </div>
              <button
                onClick={requestMobileRuntimePermissions}
                className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-bold shrink-0 cursor-pointer"
              >
                {hasLocationPermission ? 'Permitido ✓' : 'Solicitar'}
              </button>
            </div>
          </div>

          {/* Tip for Android 13/14/15 Restricted Settings */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Dica Android 13/14/15:</strong> Se o Android exibir{' '}
              <em>"Configuração restrita"</em> na Acessibilidade, abra{' '}
              <strong>Configurações &gt; Apps &gt; DriveWise</strong>, toque nos{' '}
              <strong>3 pontinhos (⋮)</strong> no canto superior direito e marque{' '}
              <strong>"Permitir configurações restritas"</strong>.
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
                ? isNativeOverlayRunning
                  ? 'HUD Flutuante Ativo Fora do App • Concluir'
                  : 'Iniciar HUD Flutuante Fora do App Agora'
                : 'Liberar Sobreposição e Iniciar HUD'}
            </button>

            <button
              onClick={dismissOverlayPermissionModal}
              className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              Fechar e configurar depois
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
