import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDriveWise } from '../context/DriveWiseContext';
import { DriveWiseLogo } from './DriveWiseLogo';
import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Car,
  TrendingUp,
  Fuel,
  X,
  Smartphone,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  // If forced, user cannot dismiss without logging in or skipping explicitly
  allowSkip?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  allowSkip = true,
}) => {
  const { loginWithGoogle, isAuthLoading, firebaseUser } = useDriveWise();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'welcome' | 'benefits'>('welcome');

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    const result = await loginWithGoogle();
    if (!result.success) {
      setErrorMessage(result.error || 'Não foi possível completar o login com Google.');
    } else {
      if (onClose) onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Deep Backdrop with Sophisticated Blur and Logo Atmosphere */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={allowSkip && onClose ? onClose : undefined}
          className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-all"
        />

        {/* Ambient Subtle Radial Glow derived from Emerald & Pure Black identity */}
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="w-[500px] h-[500px] bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent rounded-full blur-3xl opacity-60" />
        </div>

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-[#090A0D] border border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black overflow-hidden z-10"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

          {/* Close button (if allowed) */}
          {allowSkip && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] active:scale-90 border border-white/[0.08] flex items-center justify-center text-slate-400 hover:text-white transition-all"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Brand Identity & Monogram */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <DriveWiseLogo
                size={68}
                rounded={true}
                className="shadow-2xl shadow-emerald-950/50 border border-white/[0.18]"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#090A0D] flex items-center justify-center shadow">
                <ShieldCheck className="w-3.5 h-3.5 text-black" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-emerald-400 uppercase">
                Copiloto Inteligente
              </span>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                DRIVEWISE
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Gestão financeira e tomada de decisões em tempo real para motoristas de aplicativo.
              </p>
            </div>
          </div>

          {/* Value Props & Benefits Checklist */}
          <div className="mt-6 space-y-2.5 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white">Sincronização em Nuvem Segura</p>
                <p className="text-[11px] text-slate-400">Nunca perca seus turnos, ganhos e metas salvas.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white">Acesse em Qualquer Dispositivo</p>
                <p className="text-[11px] text-slate-400">Troque de celular mantendo todo o seu histórico intacto.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-white">Cálculo Preciso de Lucro Líquido</p>
                <p className="text-[11px] text-slate-400">Desconto automático de combustível, desgaste e IPVA/Seguro.</p>
              </div>
            </div>
          </div>

          {/* Error notice if sign-in fails */}
          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-semibold block">Falha na autenticação</span>
                <span className="text-[11px] text-rose-300/80">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 space-y-3">
            {/* Primary Google Sign-In Button */}
            <button
              id="btn-google-login-modal"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isAuthLoading}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-lg shadow-white/10 disabled:opacity-50"
            >
              {isAuthLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isAuthLoading ? 'Autenticando...' : 'Continuar com o Google'}</span>
            </button>

            {/* Local / Offline Driver Mode (Skip button) */}
            {allowSkip && onClose && (
              <button
                id="btn-skip-auth-modal"
                type="button"
                onClick={onClose}
                className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors text-center"
              >
                Continuar em Modo Local (Sem salvar na nuvem)
              </button>
            )}
          </div>

          {/* Privacy & Cloud Storage Disclaimer */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Dados criptografados via Google Firebase Firestore</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
