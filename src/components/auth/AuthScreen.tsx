import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { DriveWiseLogo } from '../DriveWiseLogo';
import {
  Mail,
  KeyRound,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    loginWithGoogle,
    loginWithEmailPassword,
    registerWithEmailPassword,
    isAuthLoading,
  } = useDriveWise();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleAuth = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    const result = await loginWithGoogle();
    setSubmitting(false);
    if (!result.success) {
      const err = result.error || 'Não foi possível completar o login com o Google.';
      setErrorMessage(err);
      if (err.includes('Conta encontrada para ')) {
        const matched = err.match(/Conta encontrada para ([^.]+@[^.]+?\.[a-z]{2,})/i);
        if (matched && matched[1]) {
          setEmail(matched[1]);
          setMode('login');
        }
      }
    } else {
      if (onSuccess) onSuccess();
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para continuar.');
      return;
    }

    if (!password) {
      setErrorMessage('Informe sua senha para continuar.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setErrorMessage('Informe seu nome completo.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('As senhas digitadas não coincidem.');
        return;
      }

      setSubmitting(true);
      const res = await registerWithEmailPassword(name.trim(), email.trim(), password);
      setSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Não foi possível criar sua conta.');
      } else {
        if (onSuccess) onSuccess();
      }
    } else {
      setSubmitting(true);
      const res = await loginWithEmailPassword(email.trim(), password);
      setSubmitting(false);
      if (!res.success) {
        setErrorMessage(res.error || 'E-mail ou senha inválidos.');
      } else {
        if (onSuccess) onSuccess();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#050608] text-slate-100 flex flex-col justify-center items-center px-4 py-8 relative selection:bg-white/20 selection:text-white">
      {/* Subtle, refined atmospheric lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[350px] bg-gradient-to-b from-white/[0.03] to-transparent rounded-full blur-3xl opacity-50 -translate-y-24" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-sm sm:max-w-md relative z-10"
      >
        {/* Brand Header & Architectural Logo Card */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* Logo Card Frame */}
          <div className="p-3.5 rounded-3xl bg-gradient-to-b from-[#141820] to-[#0A0C10] border border-white/[0.14] shadow-2xl shadow-black/80 mb-4 transition-transform hover:scale-[1.02]">
            <DriveWiseLogo
              size={76}
              rounded={true}
              className="border border-white/[0.18] shadow-inner"
            />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase font-mono">
            DriveWise
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {mode === 'login' ? 'Entre para acessar seu copiloto' : 'Crie sua conta para começar'}
          </p>
        </div>

        {/* Auth Container Card */}
        <div className="bg-[#0B0E14] border border-white/[0.1] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/90 backdrop-blur-xl relative">
          {/* Subtle top edge specular highlight */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/[0.2] to-transparent" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-black/60 border border-white/[0.08] mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Google 1-Tap Sign-In */}
          <button
            id="btn-google-auth"
            type="button"
            onClick={handleGoogleAuth}
            disabled={submitting || isAuthLoading}
            className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50 cursor-pointer"
          >
            {submitting || isAuthLoading ? (
              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
            <span>
              {submitting || isAuthLoading
                ? 'Conectando conta Google...'
                : mode === 'login'
                ? 'Continuar com o Google'
                : 'Cadastrar com o Google'}
            </span>
          </button>

          {/* Instant Visible Alert / Error Banner */}
          {errorMessage && (
            <div className="mt-3.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-rose-300 text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <span className="font-medium">{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Clean Minimalist Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-[11px] font-medium text-slate-400">
              <span className="bg-[#0B0E14] px-3">ou e-mail</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-black/40 border border-white/[0.1] focus:border-white/40 focus:outline-none text-white text-xs placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-black/40 border border-white/[0.1] focus:border-white/40 focus:outline-none text-white text-xs placeholder:text-slate-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-black/40 border border-white/[0.1] focus:border-white/40 focus:outline-none text-white text-xs placeholder:text-slate-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua senha"
                    className="w-full h-11 pl-10 pr-3 rounded-xl bg-black/40 border border-white/[0.1] focus:border-white/40 focus:outline-none text-white text-xs placeholder:text-slate-500 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 mt-2 rounded-xl bg-white hover:bg-slate-200 active:scale-[0.98] text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-black/40 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Entrar' : 'Criar Conta'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
