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
  Flame,
  Lock,
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
  } = useDriveWise();

  const [paymentTab, setPaymentTab] = useState<PaymentMethodType>('pix');
  const [copiedPix, setCopiedPix] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const [showDevControls, setShowDevControls] = useState(false);

  // Credit card form state for simulation
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  if (!isSubscriptionModalOpen) return null;

  const mockPixKey = '00020126580014br.gov.bcb.pix0136drivewise-pro-launch-999@drivewise.app52040000530398654049.995802BR5920DriveWise Aplicativos6009Sao Paulo62070503***6304E8A2';

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
      }, 2000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-[#0B0E14] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Ribbon / Glow Accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 blur-3xl pointer-events-none" />

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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black tracking-wide mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{LAUNCH_PROMO_PLAN.badge}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <span>DriveWise</span>
              <span className="text-emerald-400">PRO</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-sm mx-auto leading-relaxed">
              O copiloto que analisa suas corridas da Uber, 99 e InDrive para você nunca mais rodar no prejuízo.
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
                <span className="text-slate-400">Status do Período de Degustação:</span>
                {subscription.isSubscribed ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Assinatura Ativa
                  </span>
                ) : isTrialActive ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                  </span>
                ) : (
                  <span className="text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Trial Expirado
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-white/[0.08] bg-emerald-500/10 -mx-4 -mb-4 p-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold text-emerald-400 block">Modo de Testes Beta Ativo:</span>
                  <span className="text-slate-300">
                    O sistema de cobrança está <strong>OFFLINE</strong> para testes. Todas as funções do DriveWise PRO estão <strong>100% liberadas</strong> gratuitamente para homologação.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Key PRO Benefits */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Recursos inclusos no Plano PRO:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {LAUNCH_PROMO_PLAN.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300 text-[11px] leading-snug">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Action / Payment Section */}
          <div className="p-4 rounded-2xl bg-[#07090E] border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span className="text-xs font-bold text-slate-200">Forma de Pagamento (Pós-Trial):</span>
              <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setPaymentTab('pix')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    paymentTab === 'pix'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pix
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentTab('credit_card')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    paymentTab === 'credit_card'
                      ? 'bg-emerald-500 text-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cartão
                </button>
              </div>
            </div>

            {paymentTab === 'pix' ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    Chave Pix Automática:
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
                  O primeiro débito de R$ 9,99 ocorrerá somente após os 10 dias de teste grátis.
                </p>

                <button
                  type="button"
                  onClick={() => handleConfirmSubscription('pix')}
                  disabled={isProcessing}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span>Processando liberação...</span>
                  ) : activationSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Assinatura Ativada com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 fill-black" />
                      <span>{isSubscriptionSystemOnline ? 'Iniciar 10 Dias Grátis & Ativar' : 'Testar Ativação (Modo Teste)'}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Número do Cartão</label>
                  <div className="relative mt-1">
                    <CreditCard className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Validade</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
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
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-black/60 border border-white/[0.08] text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleConfirmSubscription('credit_card')}
                  disabled={isProcessing}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
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
                      <span>{isSubscriptionSystemOnline ? 'Iniciar 10 Dias Grátis & Salvar Cartão' : 'Testar com Cartão (Modo Teste)'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Active Subscription Management when Subscribed */}
          {subscription.isSubscribed && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 block">Sua Assinatura está Ativa</span>
                <span className="text-[10px] text-slate-300">
                  Próxima renovação: {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR') : 'Mensal'}
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

          {/* Collapsible Test & Development Simulator Panel */}
          <div className="pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={() => setShowDevControls(!showDevControls)}
              className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-between transition-all"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Painel de Homologação & Testes do Sistema</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-amber-400/90">
                {showDevControls ? 'Ocultar' : 'Configurar'}
              </span>
            </button>

            {showDevControls && (
              <div className="mt-3 p-3.5 rounded-2xl bg-black/70 border border-amber-500/20 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">Status do Sistema de Cobrança:</span>
                    <span className="text-[10px] text-slate-400">
                      {isSubscriptionSystemOnline
                        ? 'ONLINE: Cobrança e bloqueio de trial ativos'
                        : 'OFFLINE: Acesso 100% liberado para testes (atual)'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSubscriptionSystem(!isSubscriptionSystemOnline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      isSubscriptionSystemOnline
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/[0.08] text-slate-300 border border-white/[0.1]'
                    }`}
                  >
                    {isSubscriptionSystemOnline ? 'Ativo (Online)' : 'Desativado (Offline)'}
                  </button>
                </div>

                <div>
                  <span className="font-bold text-slate-300 block mb-1.5">
                    Simular Dias Restantes do Período Gratuito:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(10)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] font-bold text-slate-200 transition-all"
                    >
                      10 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(5)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] font-bold text-slate-200 transition-all"
                    >
                      5 Dias
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(1)}
                      className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-center text-[10px] font-bold text-amber-400 transition-all"
                    >
                      1 Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateTrialDaysRemaining(0)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-center text-[10px] font-bold text-rose-400 transition-all"
                    >
                      Expirado
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={resetTrial}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Resetar Trial para 10 dias
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    PRO: {isPro ? 'Liberado' : 'Bloqueado'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="p-3 bg-[#08090D] border-t border-white/[0.08] text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Garantia de 10 dias de teste sem compromisso • Cancele quando quiser</span>
        </div>
      </div>
    </div>
  );
};
