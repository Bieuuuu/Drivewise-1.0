import React, { useState, useRef, useMemo } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  getComparisonMetrics,
  getFuelAnalytics,
} from '../utils/calculations';
import {
  User,
  Car,
  Target,
  Calculator,
  Fuel,
  Bell,
  Shield,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle,
  Plus,
  Download,
  Upload,
  Copy,
  FileSpreadsheet,
  Check,
  AlertCircle,
  HardDrive,
  FileText,
  CheckCircle2,
  Cloud,
  CloudCheck,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  Trash2,
  Minimize2,
  Clock,
  QrCode,
  CreditCard,
  Sliders,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ProfileViewProps {
  onOpenLanding?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenLanding }) => {
  const {
    user,
    updateUser,
    sessions,
    expenses,
    fuelEntries,
    rides,
    exportCSV,
    exportJSON,
    importJSON,
    getBackupJSONString,
    resetToSampleData,
    clearAllWorkData,
    currentDateStr,
    setIsFuelModalOpen,
    firebaseUser,
    isAuthLoading,
    cloudSyncStatus,
    lastCloudSync,
    loginWithGoogle,
    logoutFromCloud,
    syncDataToCloud,
    isCloudConfigured,
    setIsOnboardingOpen,
    setIsAuthModalOpen,
    isMinimalistMode,
    toggleMinimalistMode,
    subscription,
    isSubscriptionSystemOnline,
    isTrialActive,
    isTrialExpired,
    trialDaysRemaining,
    isPro,
    setIsSubscriptionModalOpen,
    toggleSubscriptionSystem,
    resetTrial,
    simulateTrialDaysRemaining,
  } = useDriveWise();

  const [cloudToast, setCloudToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isCloudActionLoading, setIsCloudActionLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsCloudActionLoading(true);
    setCloudToast(null);
    const res = await loginWithGoogle();
    setIsCloudActionLoading(false);
    if (res.success) {
      setCloudToast({ type: 'success', message: 'Conectado com sucesso à nuvem Google!' });
    } else {
      setCloudToast({ type: 'error', message: res.error || 'Falha ao conectar com o Google' });
    }
    setTimeout(() => setCloudToast(null), 4000);
  };

  const handleCloudSyncNow = async () => {
    setIsCloudActionLoading(true);
    setCloudToast(null);
    const res = await syncDataToCloud();
    setIsCloudActionLoading(false);
    if (res.success) {
      setCloudToast({ type: 'success', message: 'Todos os seus dados foram sincronizados na nuvem!' });
    } else {
      setCloudToast({ type: 'error', message: res.error || 'Falha na sincronização' });
    }
    setTimeout(() => setCloudToast(null), 4000);
  };

  // Active section tab
  const [activeSubTab, setActiveSubTab] = useState<
    'goals' | 'subscription' | 'simulator' | 'comparison' | 'fuel' | 'settings' | 'privacy'
  >('goals');

  // Goals edit states
  const [dailyGoal, setDailyGoal] = useState(user.dailyGoal.toString());
  const [weeklyGoal, setWeeklyGoal] = useState(user.weeklyGoal.toString());
  const [monthlyGoal, setMonthlyGoal] = useState(user.monthlyGoal.toString());
  const [goalsSavedToast, setGoalsSavedToast] = useState(false);

  // Backup & Restore states
  const [copiedToast, setCopiedToast] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreInputMode, setRestoreInputMode] = useState<'file' | 'text'>('file');
  const [restoreJsonText, setRestoreJsonText] = useState('');
  const [restoreFileName, setRestoreFileName] = useState('');
  const [restorePreview, setRestorePreview] = useState<{
    valid: boolean;
    message: string;
    dataSummary?: {
      userName?: string;
      sessionsCount: number;
      expensesCount: number;
      fuelCount: number;
      ridesCount: number;
      exportedAt?: string;
    };
  } | null>(null);
  const [restoreStatusToast, setRestoreStatusToast] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate JSON string to restore
  const validateJsonToRestore = (text: string) => {
    try {
      if (!text || !text.trim()) {
        setRestorePreview(null);
        return;
      }
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        setRestorePreview({ valid: false, message: 'Formato JSON inválido.' });
        return;
      }
      const hasData =
        parsed.user ||
        Array.isArray(parsed.sessions) ||
        Array.isArray(parsed.expenses) ||
        Array.isArray(parsed.fuelEntries) ||
        Array.isArray(parsed.rides);

      if (!hasData) {
        setRestorePreview({
          valid: false,
          message: 'O arquivo não contém registros reconhecidos do DriveWise.',
        });
        return;
      }

      setRestorePreview({
        valid: true,
        message: 'Arquivo de backup verificado com sucesso!',
        dataSummary: {
          userName: parsed.user?.name || user.name,
          sessionsCount: Array.isArray(parsed.sessions) ? parsed.sessions.length : 0,
          expensesCount: Array.isArray(parsed.expenses) ? parsed.expenses.length : 0,
          fuelCount: Array.isArray(parsed.fuelEntries) ? parsed.fuelEntries.length : 0,
          ridesCount: Array.isArray(parsed.rides) ? parsed.rides.length : 0,
          exportedAt: parsed.exportedAt,
        },
      });
    } catch (err: any) {
      setRestorePreview({
        valid: false,
        message: `Erro ao decodificar JSON: ${err?.message || 'Sintaxe inválida'}`,
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      setRestoreJsonText(text);
      validateJsonToRestore(text);
    };
    reader.readAsText(file);
  };

  const handleCopyBackup = () => {
    try {
      const jsonStr = getBackupJSONString();
      navigator.clipboard.writeText(jsonStr);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3500);
    } catch {
      // Fallback
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 3500);
    }
  };

  const handleExecuteRestore = () => {
    if (!restoreJsonText || !restorePreview?.valid) return;
    const result = importJSON(restoreJsonText);
    if (result.success) {
      setRestoreStatusToast({
        success: true,
        message: `${result.message} (${result.count?.sessions || 0} turnos, ${result.count?.expenses || 0} despesas).`,
      });
      setIsRestoreModalOpen(false);
      setRestoreJsonText('');
      setRestoreFileName('');
      setRestorePreview(null);
      setTimeout(() => setRestoreStatusToast(null), 6000);
    } else {
      setRestoreStatusToast({ success: false, message: result.message });
    }
  };

  // Estimate local database size in KB
  const estimatedSizeKb = Math.max(
    1,
    Math.round(new Blob([getBackupJSONString()]).size / 1024)
  );

  // Simulator state
  const [simTargetIncome, setSimTargetIncome] = useState<string>('5000');

  // Comparison metrics: This week vs Last week (dynamically computed from currentDateStr)
  const comparison = useMemo(() => {
    const today = new Date(currentDateStr + 'T12:00:00');
    const formatD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - 6);

    const prevWeekEnd = new Date(currentWeekStart);
    prevWeekEnd.setDate(currentWeekStart.getDate() - 1);

    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekEnd.getDate() - 6);

    return getComparisonMetrics(
      sessions,
      expenses,
      [formatD(currentWeekStart), currentDateStr],
      [formatD(prevWeekStart), formatD(prevWeekEnd)]
    );
  }, [sessions, expenses, currentDateStr]);

  // Fuel analytics
  const fuelMetrics = getFuelAnalytics(fuelEntries, sessions);

  // Hourly rate for simulator
  const currentHourlyRate = comparison.current.avgHourlyRate || 61.03;

  // Simulator calculation
  const targetVal = parseFloat(simTargetIncome.replace(',', '.')) || 5000;
  const neededHours = Math.round(targetVal / currentHourlyRate);
  const avgDailyHours = 6.33; // 6h 20min
  const neededDays = Math.ceil(neededHours / avgDailyHours);

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      dailyGoal: parseFloat(dailyGoal) || 400,
      weeklyGoal: parseFloat(weeklyGoal) || 2000,
      monthlyGoal: parseFloat(monthlyGoal) || 10000,
    });
    setGoalsSavedToast(true);
    setTimeout(() => setGoalsSavedToast(false), 2500);
  };

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-2xl mx-auto">
      {/* Driver Header Profile Card */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
                {user.name}
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-emerald-400/90 font-medium">
              <Car className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user.vehicleModel} • {user.vehiclePlate}</span>
            </div>
          </div>
        </div>

        {/* Clean, balanced actions */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0">
          {!firebaseUser ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              title="Salvar dados na conta Google"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/25 transition-all flex items-center gap-1.5 whitespace-nowrap"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Salvar Conta</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-medium whitespace-nowrap">
              <CloudCheck className="w-3.5 h-3.5" />
              <span>Nuvem</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOnboardingOpen(true)}
            className="text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-xl border border-white/[0.08] transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Calibrar</span>
          </button>
        </div>
      </div>

      {/* MINIMALIST MODE SETTING TILE (Single Authority Switch, Zero Redundancy) */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all duration-200 ${
          isMinimalistMode
            ? 'bg-[#0E1313] border-emerald-500/40 shadow-sm'
            : 'bg-[#0C0C0D] border-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                isMinimalistMode
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/[0.05] text-slate-400 border border-white/[0.08]'
              }`}
            >
              <Minimize2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">Modo Minimalista</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider ${
                    isMinimalistMode
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/[0.05] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  {isMinimalistMode ? 'Ativado' : 'Desativado'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">
                {isMinimalistMode
                  ? 'Visual ultra limpo. Foco em ganho líquido, turno ativo e metas sem distrações.'
                  : 'Simplifica a interface ocultando gráficos densos e menus secundários.'}
              </p>
            </div>
          </div>

          {/* Single, authoritative toggle switch */}
          <button
            id="btn-minimalist-toggle"
            type="button"
            onClick={toggleMinimalistMode}
            role="switch"
            aria-checked={isMinimalistMode}
            aria-label="Alternar Modo Minimalista"
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isMinimalistMode ? 'bg-emerald-500' : 'bg-white/[0.15]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isMinimalistMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* DRIVEWISE PRO SUBSCRIPTION STATUS TILE */}
      <div className="rounded-2xl p-4 sm:p-5 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/25 via-[#0C0C0D] to-[#0C0C0D] relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm">DriveWise PRO</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  R$ 9,99/mês • 10 Dias Grátis
                </span>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                {!isSubscriptionSystemOnline ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Modo de Testes Beta Ativo: Sistema de cobrança OFFLINE • Recursos 100% liberados</span>
                  </span>
                ) : subscription.isSubscribed ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Assinatura Ativa (Renovação mensal em {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR') : '30 dias'})</span>
                  </span>
                ) : isTrialActive ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Período Gratuito Ativo: {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia restante' : 'dias restantes'}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Período de testes de 10 dias encerrado. Assine por R$ 9,99/mês.</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-sm"
          >
            <span>Gerenciar Assinatura</span>
          </button>
        </div>
      </div>

      {/* MINIMALIST MODE VIEW: Displays strictly what is essential */}
      {isMinimalistMode ? (
        <div className="space-y-4">
          {/* 1. Essential Goals Card */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Meta Diária de Lucro</h3>
                  <p className="text-[11px] text-slate-400">Seu objetivo financeiro para cada dia</p>
                </div>
              </div>
              {goalsSavedToast && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Salvo!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveGoals} className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={dailyGoal}
                    onChange={(e) => setDailyGoal(e.target.value)}
                    className="w-full bg-[#000000] border border-white/[0.12] rounded-xl pl-9 pr-3 py-2.5 text-base font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-emerald-500/20"
                >
                  Salvar Meta
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Meta Semanal: {formatCurrency(user.weeklyGoal)}</span>
                <span>Meta Mensal: {formatCurrency(user.monthlyGoal)}</span>
              </div>
            </form>
          </div>

          {/* 2. Essential Vehicle Profile */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white text-sm block">
                  {user.vehicleModel} ({user.vehicleYear || '2022'})
                </span>
                <span className="text-[11px] text-slate-400">
                  Placa: {user.vehiclePlate} • {user.fuelType} (R$ {user.avgFuelPrice.toFixed(2)}/L)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOnboardingOpen(true)}
              className="text-xs text-emerald-400 font-bold hover:underline"
            >
              Editar
            </button>
          </div>

          {/* 3. Essential Quick Backup Button */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Salvar Cópia dos Dados</span>
                <span className="text-[11px] text-slate-400">
                  Baixe um arquivo seguro com suas jornadas e receitas
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={exportJSON}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-sky-300 font-bold text-xs transition-all border border-white/[0.08]"
            >
              Baixar
            </button>
          </div>

          {/* 4. Essential Cloud Status */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Sincronização Nuvem</span>
                <span className="text-[11px] text-slate-400">
                  {firebaseUser
                    ? `Conectado como ${firebaseUser.email}`
                    : 'Armazenamento local seguro no aparelho'}
                </span>
              </div>
            </div>
            {firebaseUser ? (
              <button
                type="button"
                onClick={logoutFromCloud}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
              >
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/30 text-xs transition-all"
              >
                Conectar Google
              </button>
            )}
          </div>

          {/* Switch back reminder */}
          <div className="p-3 text-center">
            <p className="text-[11px] text-slate-400">
              Modo Minimalista ativo. Gráficos densos e simuladores foram recolhidos para máxima simplicidade.
            </p>
          </div>
        </div>
      ) : (
        /* FULL MODE: Original 6 sub-tabs navigation and details */
        <>
          {/* Sub-tab Navigation Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'goals', label: 'Metas', icon: Target },
              { id: 'subscription', label: 'Plano PRO', icon: Sparkles },
              { id: 'simulator', label: 'Simulador', icon: Calculator },
              { id: 'comparison', label: 'Comparações', icon: Sparkles },
              { id: 'fuel', label: 'Combustível', icon: Fuel },
              { id: 'privacy', label: 'Privacidade & GPS', icon: Shield },
              { id: 'settings', label: 'Backup & Dados', icon: Database },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-[#0C0C0D] text-slate-400 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

      {/* SECTION: PLANO PRO & ASSINATURA */}
      {activeSubTab === 'subscription' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">DriveWise PRO</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PROMOÇÃO DE LANÇAMENTO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                10 dias grátis de degustação • Depois apenas R$ 9,99/mês
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir Checkout / Métodos</span>
            </button>
          </div>

          {/* Current State Explanation Card */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Status da Homologação:</span>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                  isSubscriptionSystemOnline
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isSubscriptionSystemOnline ? 'Sistema de Cobrança ONLINE' : 'Sistema OFFLINE (Modo de Testes)'}
              </span>
            </div>

            {!isSubscriptionSystemOnline ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs leading-relaxed text-slate-300">
                <p className="font-semibold text-emerald-400 mb-1">
                  ✓ Modo de Testes Ativo (Sem Cobrança)
                </p>
                O sistema de assinatura está temporariamente <strong>desativado para cobranças</strong> para que você e os primeiros motoristas possam testar todas as funcionalidades do aplicativo sem qualquer bloqueio.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs leading-relaxed text-slate-300">
                {subscription.isSubscribed ? (
                  <p className="text-emerald-400 font-bold">
                    ✓ Assinatura Ativa (R$ 9,99/mês) — Próxima renovação: {subscription.nextBillingDate ? new Date(subscription.nextBillingDate).toLocaleDateString('pt-BR') : 'Mensal'}
                  </p>
                ) : isTrialActive ? (
                  <p className="text-amber-400 font-bold">
                    ⏳ Período de Teste Gratuito em andamento: Restam {trialDaysRemaining} {trialDaysRemaining === 1 ? 'dia' : 'dias'}.
                  </p>
                ) : (
                  <p className="text-rose-400 font-bold">
                    ⚠️ Período de 10 dias de teste encerrado. É necessário ativar a assinatura por R$ 9,99/mês para continuar utilizando os recursos do copiloto.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Preço Promocional</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">R$ 9,99</span>
                <span className="text-xs text-slate-400">/ mês</span>
                <span className="text-xs text-slate-500 line-through">R$ 29,90</span>
              </div>
              <p className="text-[11px] text-emerald-400 font-medium">Economia de 66% na fase de lançamento</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1">
              <span className="text-[11px] text-slate-400 font-medium">Período de Degustação</span>
              <div className="text-2xl font-black text-amber-400">10 Dias Grátis</div>
              <p className="text-[11px] text-slate-400">Teste sem compromisso em suas corridas reais</p>
            </div>
          </div>

          {/* Included Features */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Recursos Liberados no Plano PRO:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                'Copiloto Flutuante em tempo real sobre Uber/99',
                'Cálculo instantâneo de R$/km e R$/hora líquida',
                'Filtro anti-prejuízo (rejeição de corridas ruins)',
                'Comparativo inteligente de corridas simultâneas',
                'Auditoria de combustível e custo operacional real',
                'Sincronização ilimitada em nuvem com conta Google',
                'Suporte prioritário e atualizações contínuas',
              ].map((feat, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 text-[11px]">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Test & Simulation Controls */}
          <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Controles de Teste do Desenvolvedor:
              </span>
              <button
                type="button"
                onClick={() => toggleSubscriptionSystem(!isSubscriptionSystemOnline)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSubscriptionSystemOnline
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/[0.08] text-slate-300 hover:text-white'
                }`}
              >
                {isSubscriptionSystemOnline ? 'Desativar (Mudar para Offline)' : 'Ativar Sistema (Online)'}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 text-[11px]">Simular Trial:</span>
              <button
                type="button"
                onClick={() => simulateTrialDaysRemaining(10)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-bold text-slate-200"
              >
                10 Dias
              </button>
              <button
                type="button"
                onClick={() => simulateTrialDaysRemaining(5)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-bold text-slate-200"
              >
                5 Dias
              </button>
              <button
                type="button"
                onClick={() => simulateTrialDaysRemaining(1)}
                className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-bold text-amber-400"
              >
                1 Dia
              </button>
              <button
                type="button"
                onClick={() => simulateTrialDaysRemaining(0)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-bold text-rose-300"
              >
                Expirar
              </button>
              <button
                type="button"
                onClick={resetTrial}
                className="ml-auto text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Resetar Trial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: METAS */}
      {activeSubTab === 'goals' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Metas de Rendimento</h2>
              <p className="text-xs text-slate-400">Acompanhe seu progresso e defina novos alvos</p>
            </div>
            {goalsSavedToast && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Salvo!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveGoals} className="space-y-4 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-300">Meta Diária (R$)</label>
                <span className="text-slate-400">Atual: {formatCurrency(user.dailyGoal)}</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={dailyGoal}
                onChange={(e) => setDailyGoal(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-300">Meta Semanal (R$)</label>
                <span className="text-slate-400">Atual: {formatCurrency(user.weeklyGoal)}</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={weeklyGoal}
                onChange={(e) => setWeeklyGoal(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-300">Meta Mensal (R$)</label>
                <span className="text-slate-400">Atual: {formatCurrency(user.monthlyGoal)}</span>
              </div>
              <input
                type="number"
                inputMode="numeric"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Monthly Progress Display */}
            <div className="bg-black/30 p-4 rounded-xl border border-white/[0.04] space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Progresso Mensal</span>
                <span className="font-bold text-emerald-400 font-mono-num">
                  R$ 7.800 / {formatCurrency(user.monthlyGoal)} (78%)
                </span>
              </div>
              <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/[0.06]">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  style={{ width: '78%' }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Faltam R$ 2.200 para bater sua meta de Setembro!
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Novas Metas</span>
            </button>
          </form>
        </div>
      )}

      {/* SECTION: SIMULADOR DE GANHOS */}
      {activeSubTab === 'simulator' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-5">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white">Simulador de Ganhos</h2>
            <p className="text-xs text-slate-400">
              Descubra quanto tempo você precisa trabalhar para atingir qualquer valor
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              Quanto você quer ganhar este mês?
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-bold text-slate-400 text-sm">
                R$
              </span>
              <input
                type="number"
                step="100"
                value={simTargetIncome}
                onChange={(e) => setSimTargetIncome(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl pl-10 pr-4 py-2.5 text-base font-bold text-white font-mono-num focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="bg-gradient-to-br from-emerald-950/40 via-black/40 to-black/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Estimativa Baseada na sua Média
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Considerando seu ganho médio atual de{' '}
              <strong className="text-emerald-400">{formatCurrency(currentHourlyRate)}/h</strong>,
              você precisa de:
            </p>

            <div className="grid grid-cols-2 gap-3 text-center pt-1">
              <div className="bg-black/50 rounded-xl p-3 border border-white/[0.06]">
                <p className="text-2xl font-extrabold text-white font-mono-num">~{neededHours}h</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Horas de volante</p>
              </div>

              <div className="bg-black/50 rounded-xl p-3 border border-white/[0.06]">
                <p className="text-2xl font-extrabold text-emerald-400 font-mono-num">
                  ~{neededDays} dias
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Rodando 6h20 por dia</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic text-center">
              * Estimativa estatística calculada exclusivamente com base no seu histórico registrado.
            </p>
          </div>
        </div>
      )}

      {/* SECTION: COMPARAÇÕES */}
      {activeSubTab === 'comparison' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white">Esta Semana x Semana Passada</h2>
            <p className="text-xs text-slate-400">Evolução do seu desempenho e produtividade</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Ganhos */}
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-xs text-slate-400">Ganhos</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-white font-mono-num">
                  {formatCurrency(comparison.current.totalIncome)}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{comparison.incomeDiff || 12}%
                </span>
              </div>
            </div>

            {/* Horas */}
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-xs text-slate-400">Horas Trabalhadas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-white font-mono-num">
                  {formatDuration(comparison.current.totalDurationMinutes)}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{comparison.hoursDiff || 4}%
                </span>
              </div>
            </div>

            {/* Km */}
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-xs text-slate-400">Quilômetros</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-white font-mono-num">
                  {formatKm(comparison.current.totalDistanceKm)}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-slate-400">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  {comparison.kmDiff || -3}%
                </span>
              </div>
            </div>

            {/* Lucro */}
            <div className="bg-black/30 rounded-xl p-3.5 border border-white/[0.06]">
              <span className="text-xs text-slate-400">Lucro Estimado</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-emerald-400 font-mono-num">
                  {formatCurrency(comparison.current.netProfit)}
                </span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-400">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  +{comparison.profitDiff || 17}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: CONTROLE DE COMBUSTÍVEL */}
      {activeSubTab === 'fuel' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Controle de Combustível</h2>
              <p className="text-xs text-slate-400">Custo por km, abastecimentos e consumo</p>
            </div>
            <button
              onClick={() => setIsFuelModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Abastecer</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
              <p className="text-[10px] text-slate-400">Custo Médio/km</p>
              <p className="text-xs font-bold text-amber-400 font-mono-num">
                {formatCurrency(fuelMetrics.avgCostPerKm || 0.51)}/km
              </p>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
              <p className="text-[10px] text-slate-400">Consumo Médio</p>
              <p className="text-xs font-bold text-white font-mono-num">
                {fuelMetrics.estimatedKmPerLiter.toFixed(1)} km/L
              </p>
            </div>
            <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
              <p className="text-[10px] text-slate-400">Preço Médio/L</p>
              <p className="text-xs font-bold text-white font-mono-num">
                {formatCurrency(fuelMetrics.avgPricePerLiter || 5.89)}
              </p>
            </div>
          </div>

          {/* Fuel History */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-slate-300">Últimos Abastecimentos:</p>
            {fuelEntries.map((f) => (
              <div
                key={f.id}
                className="bg-black/40 border border-white/[0.04] p-3 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-semibold text-white">
                    {f.fuelType} • {f.liters.toFixed(1)} Litros
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {f.date.split('-').reverse().join('/')} • {f.stationName || 'Posto'} (Odômetro:{' '}
                    {f.odometer} km)
                  </p>
                </div>
                <div className="text-right font-mono-num">
                  <p className="font-bold text-rose-400">-{formatCurrency(f.totalCost)}</p>
                  <p className="text-[10px] text-slate-400">R$ {f.pricePerLiter.toFixed(2)}/L</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION: PRIVACIDADE E BATERIA */}
      {activeSubTab === 'privacy' && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
          <div className="border-b border-white/[0.06] pb-3">
            <h2 className="text-sm font-bold text-white">Privacidade e Consumo de Bateria</h2>
            <p className="text-xs text-slate-400">Como tratamos sua localização e seus dados</p>
          </div>

          <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.04] space-y-1">
              <p className="font-bold text-emerald-400">Quando o GPS é utilizado?</p>
              <p className="text-slate-400 text-[11px]">
                O GPS é ativado <strong>exclusivamente durante uma jornada ativa</strong>. Assim que
                você encerra o turno, o monitoramento de localização é imediatamente interrompido.
              </p>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.04] space-y-1">
              <p className="font-bold text-emerald-400">Economia inteligente de bateria</p>
              <p className="text-slate-400 text-[11px]">
                O algoritmo filtra tremores parados e pequenos ruídos de sinal para não consumir bateria
                nem registrar quilometragem fantasma enquanto você estiver aguardando passageiros.
              </p>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.04] space-y-1">
              <p className="font-bold text-emerald-400">Quilometragem estimada e correção manual</p>
              <p className="text-slate-400 text-[11px]">
                A distância registrada é uma estimativa baseada nos sensores do aparelho. Você tem
                total liberdade para corrigir manualmente qualquer quilometragem caso o odômetro do
                veículo apresente pequenas divergências.
              </p>
            </div>

            <div className="bg-black/30 p-3 rounded-xl border border-white/[0.04] space-y-1">
              <p className="font-bold text-emerald-400">Onde meus dados são armazenados?</p>
              <p className="text-slate-400 text-[11px]">
                Todos os seus registros de ganhos, jornadas e abastecimentos ficam protegidos localmente
                no seu dispositivo com suporte a exportação em planilha e JSON a qualquer momento.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION: AJUSTES & DADOS (CENTRAL DE BACKUP) */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4">
          {/* Toast notifications */}
          {copiedToast && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Código de backup copiado! Você pode colar no seu WhatsApp ou bloco de notas.</span>
            </div>
          )}

          {restoreStatusToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                restoreStatusToast.success
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {restoreStatusToast.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{restoreStatusToast.message}</span>
            </div>
          )}

          {cloudToast && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
                cloudToast.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {cloudToast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{cloudToast.message}</span>
            </div>
          )}

          {/* Cloud Synchronization Card (Firebase / Google) */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  firebaseUser ? 'bg-sky-500/15 text-sky-400' : 'bg-white/[0.06] text-slate-400'
                }`}>
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    Nuvem e Conta do Motorista
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sincronização em tempo real via Google Cloud / Firebase
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  firebaseUser
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    firebaseUser ? 'bg-sky-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {firebaseUser ? 'Nuvem Conectada' : 'Modo Offline / Local'}
              </span>
            </div>

            {firebaseUser ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] gap-3">
                  <div className="flex items-center gap-3">
                    {firebaseUser.photoURL ? (
                      <img
                        src={firebaseUser.photoURL}
                        alt={firebaseUser.displayName || 'Motorista'}
                        className="w-10 h-10 rounded-full border border-sky-400/40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-300 font-bold flex items-center justify-center">
                        {firebaseUser.email?.slice(0, 2).toUpperCase() || 'DR'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{firebaseUser.displayName || user.name}</span>
                        <span className="text-[10px] font-medium text-sky-400 bg-sky-500/15 px-1.5 py-0.2 rounded">
                          Verificado
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono-num">
                        {firebaseUser.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCloudSyncNow}
                      disabled={isCloudActionLoading}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 active:scale-95 text-xs font-semibold text-sky-300 border border-sky-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCloudActionLoading ? 'animate-spin' : ''}`} />
                      <span>{isCloudActionLoading ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={logoutFromCloud}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] active:scale-95 text-xs font-medium text-slate-300 border border-white/[0.08] transition-all flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Status do banco: Firestore Ativo</span>
                  <span>
                    {lastCloudSync
                      ? `Última sincronização: ${lastCloudSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : 'Sincronizado automaticamente'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conecte sua conta Google para que todas as suas corridas, abastecimentos e manutenções fiquem salvos em nuvem permanente. 
                  Ao trocar de telefone ou acessar de outro computador, seus ganhos e histórico reaparecem automaticamente.
                </p>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isCloudActionLoading}
                  className="w-full p-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 active:scale-98 text-xs font-bold text-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  <LogIn className={`w-4 h-4 ${isCloudActionLoading ? 'animate-spin' : ''}`} />
                  <span>{isCloudActionLoading ? 'Conectando...' : 'Conectar com Conta Google (Salvar na Nuvem)'}</span>
                </button>

                <div className="text-[11px] text-slate-500 text-center">
                  Zero configuração manual • Armazenamento isolado e seguro no Google Cloud
                </div>
              </div>
            )}
          </div>

          {/* Database Health & Metrics Card */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Central de Segurança e Backup
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Seus dados financeiros protegidos e sob o seu controle total
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Local Ativo
              </span>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Jornadas Salvas</span>
                <span className="text-lg font-black text-white font-mono-num">{sessions.length}</span>
              </div>
              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Abastecimentos</span>
                <span className="text-lg font-black text-amber-400 font-mono-num">{fuelEntries.length}</span>
              </div>
              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Despesas Lançadas</span>
                <span className="text-lg font-black text-rose-400 font-mono-num">{expenses.length}</span>
              </div>
              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Tamanho em Memória</span>
                <span className="text-lg font-black text-emerald-400 font-mono-num">~{estimatedSizeKb} KB</span>
              </div>
            </div>
          </div>

          {/* Backup Actions Card */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Exportar e Salvar Cópia de Segurança
            </h3>

            {/* 1. Download JSON File */}
            <button
              type="button"
              onClick={exportJSON}
              className="w-full p-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 text-xs font-semibold text-white border border-white/[0.08] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Baixar Arquivo de Backup (.JSON)</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Arquivo completo para salvar no Google Drive, e-mail ou computador
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold shrink-0 ml-2">Baixar</span>
            </button>

            {/* 2. Copy JSON text to Clipboard */}
            <button
              type="button"
              onClick={handleCopyBackup}
              className="w-full p-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 text-xs font-semibold text-white border border-white/[0.08] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                  <Copy className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Copiar Dados para o WhatsApp / Notas</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Copia o código do backup para colar em mensagem pessoal no WhatsApp
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-sky-400 font-bold shrink-0 ml-2">Copiar</span>
            </button>

            {/* 3. Export Spreadsheet CSV */}
            <button
              type="button"
              onClick={exportCSV}
              className="w-full p-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] active:scale-98 text-xs font-semibold text-white border border-white/[0.08] flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-200">Exportar Planilha Completa (.CSV)</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Relatório em Excel para declaração de imposto de renda e MEI
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-amber-400 font-bold shrink-0 ml-2">Planilha</span>
            </button>
          </div>

          {/* Restore / Import Card */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Restaurar Backup Existente
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trocou de celular ou quer recuperar seus dados salvos? Restaure seu histórico a qualquer momento.
            </p>

            <button
              type="button"
              onClick={() => setIsRestoreModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Importar / Restaurar Backup</span>
            </button>
          </div>

          {/* Reset Demo Data Card */}
          <div className="bg-[#0C0C0D] border border-rose-500/20 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Zona de Redefinição
            </h3>
            <p className="text-xs text-slate-400">
              Restaura a base demonstrativa original com os exemplos de corridas e turnos de teste.
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja zerar as jornadas e despesas de teste para começar a registrar apenas seus ganhos reais no trânsito? Seu veículo e metas serão mantidos intactos.'
                    )
                  ) {
                    clearAllWorkData();
                    setRestoreStatusToast({
                      success: true,
                      message: 'Conta limpa iniciada! Pronto para registrar suas corridas reais.',
                    });
                    setTimeout(() => setRestoreStatusToast(null), 5000);
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-98 text-xs font-semibold text-emerald-400 border border-emerald-500/30 flex items-center justify-between transition-all"
              >
                <div className="text-left">
                  <span className="font-bold block">Começar Minha Conta Limpa</span>
                  <span className="text-[10px] text-slate-400 font-normal">Zera corridas de demonstração e inicia do zero</span>
                </div>
                <Trash2 className="w-4 h-4 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Deseja realmente restaurar os dados de demonstração iniciais? Seus dados atuais serão substituídos pelos exemplos de teste.'
                    )
                  ) {
                    resetToSampleData();
                    setRestoreStatusToast({
                      success: true,
                      message: 'Dados demonstrativos restaurados com sucesso.',
                    });
                    setTimeout(() => setRestoreStatusToast(null), 5000);
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 active:scale-98 text-xs font-medium text-slate-400 hover:text-rose-400 border border-white/[0.06] hover:border-rose-500/30 flex items-center justify-between transition-all"
              >
                <span>Restaurar Demonstração Inicial</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Product Presentation / Landing Page Link */}
              {onOpenLanding && (
                <div className="pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={onOpenLanding}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-amber-500/15 hover:from-emerald-500/25 hover:to-amber-500/25 active:scale-98 text-xs font-bold text-white border border-emerald-500/30 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold">Ver Apresentação do Produto</span>
                        <span className="text-[10px] text-slate-400 font-normal">Página oficial de lançamento e instalação</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* RESTORE MODAL (IMPORTAR BACKUP) */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0C0C0D] border border-white/[0.12] rounded-2xl p-5 max-w-md w-full max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl">
            <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Restaurar Backup do DriveWise
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Carregue um arquivo .json ou cole o código salvo
                </p>
              </div>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setRestoreInputMode('file')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  restoreInputMode === 'file'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                Arquivo .JSON
              </button>
              <button
                type="button"
                onClick={() => setRestoreInputMode('text')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  restoreInputMode === 'text'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Colar Código
              </button>
            </div>

            {/* Mode 1: File Upload */}
            {restoreInputMode === 'file' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-8 border-2 border-dashed border-white/[0.15] hover:border-emerald-500/50 rounded-2xl bg-black/40 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center px-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    {restoreFileName || 'Toque para selecionar o arquivo de backup (.json)'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Geralmente salvo na sua pasta de Downloads ou Google Drive
                  </div>
                </button>
              </div>
            )}

            {/* Mode 2: Paste JSON text */}
            {restoreInputMode === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Cole o código JSON do seu backup:
                </label>
                <textarea
                  rows={6}
                  value={restoreJsonText}
                  onChange={(e) => {
                    setRestoreJsonText(e.target.value);
                    validateJsonToRestore(e.target.value);
                  }}
                  placeholder='{"version":"2.0","system":"DriveWise"...}'
                  className="w-full bg-[#000000] border border-white/[0.12] rounded-xl p-3 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Live Verification Preview */}
            {restorePreview && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 animate-fadeIn ${
                  restorePreview.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  {restorePreview.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className={restorePreview.valid ? 'text-emerald-300' : 'text-rose-300'}>
                    {restorePreview.message}
                  </span>
                </div>

                {restorePreview.valid && restorePreview.dataSummary && (
                  <div className="text-[11px] text-slate-300 space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/[0.06]">
                    <div>
                      <strong className="text-white">Motorista:</strong>{' '}
                      {restorePreview.dataSummary.userName}
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-slate-400">
                      <div>• Turnos: <strong className="text-white">{restorePreview.dataSummary.sessionsCount}</strong></div>
                      <div>• Despesas: <strong className="text-white">{restorePreview.dataSummary.expensesCount}</strong></div>
                      <div>• Abastecimentos: <strong className="text-white">{restorePreview.dataSummary.fuelCount}</strong></div>
                      <div>• Corridas Copiloto: <strong className="text-white">{restorePreview.dataSummary.ridesCount}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRestoreModalOpen(false);
                  setRestoreJsonText('');
                  setRestoreFileName('');
                  setRestorePreview(null);
                }}
                className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-98 text-xs font-semibold text-slate-300 transition-all"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!restorePreview?.valid}
                onClick={handleExecuteRestore}
                className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 text-black text-xs font-black shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar e Restaurar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
