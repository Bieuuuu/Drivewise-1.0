import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layers,
  CheckCircle2,
  X,
  Smartphone,
  MapPin,
  ExternalLink,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { isNativeAndroid, nativeBridge } from '../../services/nativeBridge';

interface OverlayPermissionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onGrant?: () => Promise<void>;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

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
    <AnimatePresence>
      {isOverlayPermissionModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="relative w-full max-w-md rounded-2xl bg-[#0B0E14] border border-white/[0.12] shadow-2xl shadow-black/90 overflow-hidden my-auto"
          >
            {/* Top subtle highlight line */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

            {/* Close Button */}
            <button
              onClick={dismissOverlayPermissionModal}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6">
              {/* Unboxed Kicker */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Sobreposição Nativa Android</span>
                <span aria-hidden="true">·</span>
                <span>Uber, 99 e InDrive</span>
              </div>

              <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-snug mb-2">
                Ativar Bolha e Calculadora Flutuante
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed mb-5">
                Para que a bolha e o semáforo fiquem visíveis por cima da tela da Uber e 99, siga
                a liberação abaixo:
              </p>

              {/* Step-by-Step Permission Flow */}
              <div className="space-y-3.5 mb-5">
                {/* Step 1: Android 13/14/15 Restricted Settings Unlock (if not yet granted) */}
                {!hasOverlayPermission && (
                  <div className="p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/30">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-amber-300">
                        Passo 1 · Desbloquear Permissão Restrita (Android 13, 14 e 15)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                      Se o Android mostrar <em>"Acesso negado ao app / configuração indisponível"</em>,
                      desbloqueie primeiro nas <strong>Informações do App</strong>:
                    </p>
                    <ol className="text-[11px] text-slate-300 space-y-1 list-decimal list-inside mb-3 leading-snug">
                      <li>Toque no botão abaixo para abrir as <strong>Informações do App</strong>.</li>
                      <li>No canto superior direito da tela, toque nos <strong>3 pontinhos (⋮)</strong>.</li>
                      <li>Toque em <strong>"Permitir configurações restritas"</strong> e confirme.</li>
                    </ol>
                    <button
                      type="button"
                      onClick={() => nativeBridge.openAppDetailsSettings()}
                      className="w-full min-h-[42px] py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span>1. Abrir Informações do App (Menu ⋮)</span>
                    </button>
                  </div>
                )}

                {/* Step 2: System Overlay Toggle */}
                <div
                  className={`p-4 rounded-xl border transition-colors ${
                    hasOverlayPermission
                      ? 'bg-emerald-950/20 border-emerald-500/35'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <h3 className="text-xs font-bold text-white">
                        {hasOverlayPermission
                          ? 'Permissão "Sobrepor a outros apps" ativa'
                          : 'Passo 2 · Ativar chave "Sobrepor a outros apps"'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Exibe a bolha e a calculadora semafórica diretamente sobre a Uber e 99
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-mono-num font-semibold shrink-0 ${
                        hasOverlayPermission ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {hasOverlayPermission ? 'Liberado ✓' : 'Pendente'}
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      await grantOverlayPermission();
                      if (isNative && hasOverlayPermission) {
                        await nativeBridge.launchFloatingPipWindowNow();
                      }
                    }}
                    className={`w-full min-h-[42px] py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                      hasOverlayPermission
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {hasOverlayPermission ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Sobreposição Liberada · Abrir Calculadora Flutuante</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        <span>2. Abrir "Sobrepor a outros apps" e Ativar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Step 3: GPS & Notifications */}
                <div
                  className={`p-4 rounded-xl border transition-colors ${
                    hasLocationPermission
                      ? 'bg-emerald-950/20 border-emerald-500/35'
                      : 'bg-white/[0.03] border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <h3 className="text-xs font-bold text-white">
                          GPS de Precisão e Notificações
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Mede o KM do turno e mantém o serviço ativo em segundo plano
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-mono-num font-semibold shrink-0 ${
                        hasLocationPermission ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {hasLocationPermission ? 'Ativo ✓' : 'Solicitar'}
                    </span>
                  </div>

                  <button
                    onClick={requestMobileRuntimePermissions}
                    className="w-full min-h-[40px] py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1]"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {hasLocationPermission
                        ? 'GPS e Notificações Liberados ✓'
                        : 'Liberar GPS e Notificações'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] mb-5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  A bolha flutuante fica discreta na lateral da tela sobre a <strong>Uber / 99</strong>.
                  Ao tocar nela, ela abre a <strong>Calculadora Semafórica no próprio overlay</strong> ou
                  aciona o <strong>Radar Automático OCR</strong> sem sair do app de corridas.
                </p>
              </div>

              {/* Primary Action CTA */}
              <div className="space-y-2">
                <button
                  onClick={handleActivateHudAndClose}
                  className="w-full min-h-[46px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {hasOverlayPermission
                      ? 'Ativar Bolha Flutuante e Continuar'
                      : 'Liberar Sobreposição no Celular'}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  onClick={dismissOverlayPermissionModal}
                  className="w-full min-h-[40px] py-2 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  Fechar e continuar no painel
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
