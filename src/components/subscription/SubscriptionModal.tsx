import React, { useState } from 'react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { LAUNCH_PROMO_PLAN, PaymentMethodType } from '../../types';
import {
  Sparkles,
  X,
  CheckCircle2,
  ShieldCheck,
  Zap,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Clock,
  RotateCcw,
  Sliders,
  AlertTriangle,
  ArrowRight,
  Lock,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

export const SubscriptionModal: React.FC = () => {
  const {
    subscription,
    isSubscriptionSystemOnline,
    isTrialActive,
    isTrialExpired,
    trialDaysRemaining,
    isPro,
    isSubscriptionModalOpen,
    setIsSubscriptionModalOpen,
    toggleSubscriptionSystem,
    activateSubscription,
    cancelSubscription,
    resetTrial,
    simulateTrialDaysRemaining,
    isAdmin,
    firebaseUser,
  } = useDriveWise();

  const [paymentTab, setPaymentTab] = useState<'gpay' | 'pix' | 'credit_card'>('gpay');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);

  // Google Pay Sheet Simulation State
  const [isGPaySheetOpen, setIsGPaySheetOpen] = useState(false);
  const [gpayProcessing, setGPayProcessing] = useState(false);

  // Credit card state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // SENSITIVE ADMIN-ONLY GUARD:
  // Non-admin users cannot open or view this modal under any circumstance.
  if (!isSubscriptionModalOpen || !isAdmin) {
    return null;
  }

  const mockPixKey =
    '00020126580014br.gov.bcb.pix0136drivewise-pro-launch-999@drivewise.app52040000530398654049.995802BR5920DriveWise Aplicativos6009Sao Paulo62070503***6304E8A2';

  const handleCopyPix = () => {
    try {
      navigator.clipboard.writeText(mockPixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleConfirmSubscription = (method: PaymentMethodType) => {
    setIsProcessing(true);
    setTimeout(() => {
      activateSubscription(method);
      setIsProcessing(false);
      setActivationSuccess(true);
      setTimeout(() => {
        setActivationSuccess(false);
        setIsSubscriptionModalOpen(false);
      }, 1600);
    }, 1000);
  };

  const handleExecuteGPay = () => {
    setGPayProcessing(true);
    setTimeout(() => {
      setGPayProcessing(false);
      setIsGPaySheetOpen(false);
      activateSubscription('credit_card');
      setActivationSuccess(true);
      setTimeout(() => {
        setActivationSuccess(false);
        setIsSubscriptionModalOpen(false);
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#0B0E14] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-r from-emerald-500/20 via-sky-500/20 to-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={() => setIsSubscriptionModalOpen(false)}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Top Title & Badge */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-wide mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PAINEL ADMINISTRATIVO DE ASSINATURA</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>DriveWise</span>
              <span className="text-emerald-400">PRO</span>
            </h2>

            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              Configuração e testes de pagamento para a conta de administrador (
              <span className="text-emerald-400 font-mono font-medium">
                {firebaseUser?.email || 'gabrieulopezz@gmail.com'}
              </span>
              ).
            </p>
          </div>

          {/* Pricing Highlight Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-emerald-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
              10 Dias Grátis
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-white">R$ 9,99</span>
              <span className="text-xs text-slate-400">/ mês</span>
              <span className="text-xs text-slate-500 line-through ml-1">R$ 29,90</span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>10 dias de degustação gratuita sem cobrança antecipada</span>
            </div>

            {/* Trial Status indicator when online */}
            {isSubscriptionSystemOnline ? (
              <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs">
                <span className="text-slate-400">Status da Assinatura:</span>
                {subscription.isSubscribed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Assinatura Ativa
                  </span>
                ) : isTrialActive ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {trialDaysRemaining}{' '}
                    {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Período Expirado
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-white/[0.08] bg-emerald-500/10 -mx-4 -mb-4 p-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-emerald-400 block">
                    Modo de Testes Beta (Sistema OFFLINE):
                  </span>
                  <span className="text-slate-300">
                    O sistema de cobrança está desativado para usuários comuns. Recursos 100%
                    liberados sem telas de bloqueio.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Method Switcher */}
          <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-xs font-bold text-slate-200">Formas de Pagamento Homologadas:</span>
            </div>

            <div className="grid grid-cols-3 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              {/* Google Pay Tab */}
              <button
                type="button"
                onClick={() => setPaymentTab('gpay')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentTab === 'gpay'
                    ? 'bg-white text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
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
                <span>G Pay</span>
              </button>

              {/* Pix Tab */}
              <button
                type="button"
                onClick={() => setPaymentTab('pix')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentTab === 'pix'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Pix</span>
              </button>

              {/* Credit Card Tab */}
              <button
                type="button"
                onClick={() => setPaymentTab('credit_card')}
                className={`py-2 px-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  paymentTab === 'credit_card'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão</span>
              </button>
            </div>

            {/* TAB CONTENT 1: GOOGLE PAY */}
            {paymentTab === 'gpay' && (
              <div className="space-y-3.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Google Pay Protegido
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Pague com 1 clique utilizando seus cartões salvos no Google.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400">R$ 9,99</span>
                    <span className="block text-[9px] text-slate-400">Pós 10 dias grátis</span>
                  </div>
                </div>

                {/* Authentic Google Pay Button */}
                <button
                  type="button"
                  id="btn-google-pay-checkout"
                  onClick={() => setIsGPaySheetOpen(true)}
                  className="w-full h-12 rounded-xl bg-black hover:bg-neutral-900 border border-white/20 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <span className="text-xs text-slate-400 font-normal">Pagar com</span>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                  <span className="font-semibold text-white tracking-wide">Pay</span>
                </button>
              </div>
            )}

            {/* TAB CONTENT 2: PIX */}
            {paymentTab === 'pix' && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    Chave Pix Automática (Banco Central):
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">R$ 9,99/mês</span>
                </div>

                {/* Copia e Cola */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/60 border border-white/[0.08]">
                  <input
                    type="text"
                    readOnly
                    value={mockPixKey}
                    className="flex-1 bg-transparent text-[11px] font-mono text-slate-400 outline-none truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Pix</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center">
                  Cobrança agendada automaticamente para 10 dias após o cadastro.
                </p>

                <button
                  type="button"
                  onClick={() => handleConfirmSubscription('pix')}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Validando pagamento Pix...</span>
                  ) : activationSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Assinatura Ativada com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>Testar Validação de Assinatura Pix</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB CONTENT 3: CARTÃO DE CRÉDITO */}
            {paymentTab === 'credit_card' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Nome impresso no cartão
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: GABRIEL LOPEZ"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">
                    Número do Cartão
                  </label>
                  <div className="relative mt-1">
                    <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">
                      Validade
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">CVV</label>
                    <input
                      type="password"
                      placeholder="123"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Criptografia SSL de 256 bits com tokenização bancária.</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmSubscription('credit_card')}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Processando cartão...</span>
                  ) : activationSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Cartão Validado e Ativado!</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Salvar Cartão & Ativar Plano PRO</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Active Subscription Status when Subscribed */}
          {subscription.isSubscribed && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 block">
                  Assinatura PRO Ativa
                </span>
                <span className="text-[10px] text-slate-300">
                  Próxima renovação:{' '}
                  {subscription.nextBillingDate
                    ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR')
                    : 'Mensal'}
                </span>
              </div>
              <button
                type="button"
                onClick={cancelSubscription}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-semibold border border-white/[0.08] transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Admin Diagnostics & Controls */}
          <div className="pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowDevControls(!showDevControls)}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Controles de Teste (Admin Master)</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-400/90">
                {showDevControls ? 'Ocultar' : 'Configurar'}
              </span>
            </button>

            {showDevControls && (
              <div className="mt-3 p-3.5 rounded-2xl bg-black/70 border border-amber-500/20 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Status Geral do Sistema:</span>
                    <span className="text-[10px] text-slate-400">
                      {isSubscriptionSystemOnline
                        ? 'ONLINE: Cobrança ativa para todos'
                        : 'OFFLINE: Modo de testes gratuito para todos (atual)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSubscriptionSystem}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                      isSubscriptionSystemOnline
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500 text-black shadow'
                    }`}
                  >
                    {isSubscriptionSystemOnline ? 'Colocar OFFLINE' : 'Colocar ONLINE'}
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.08]">
                  <span className="font-bold text-white block mb-1.5">
                    Simular Cenários do Período Gratuito:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(10)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] text-slate-200"
                    >
                      10 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(3)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] text-amber-300"
                    >
                      3 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(1)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] text-rose-300"
                    >
                      1 Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(0)}
                      className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-center text-[10px] font-bold"
                    >
                      Expirado
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex justify-end">
                  <button
                    type="button"
                    onClick={resetTrial}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resetar Período de Testes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GOOGLE PAY SHEET SIMULATOR */}
      {isGPaySheetOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-[#1C1F26] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
                <span className="font-bold text-white text-base">Google Pay</span>
              </div>
              <button
                type="button"
                onClick={() => setIsGPaySheetOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300">Conta Google:</span>
                <span className="text-xs font-semibold text-white">
                  {firebaseUser?.email || 'gabrieulopezz@gmail.com'}
                </span>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-5 rounded bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                    VISA
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Cartão salvo no Google</div>
                    <div className="text-[10px] text-slate-400">•••• 4821</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Total a pagar hoje:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  R$ 0,00 (10 dias grátis)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Após o período de teste:</span>
                <span className="font-semibold text-white">R$ 9,99/mês</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecuteGPay}
              disabled={gpayProcessing}
              className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {gpayProcessing ? (
                <div className="w-5 h-5 border-2 border-slate-950/20 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <span>Confirmar com Google Pay</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
