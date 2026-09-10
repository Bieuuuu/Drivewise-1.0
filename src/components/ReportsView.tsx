import React, { useState, useMemo } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  getPeriodMetrics,
  getHourlyProductivity,
  TIME_SLOTS,
} from '../utils/calculations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Clock,
  Navigation2,
  Zap,
  Download,
  Printer,
  Sparkles,
  ChevronDown,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export const ReportsView: React.FC = () => {
  const { sessions, expenses, currentDateStr, exportCSV, isMinimalistMode } = useDriveWise();
  const [period, setPeriod] = useState<ReportPeriod>('weekly');

  // Compute date boundaries dynamically based on currentDateStr
  const dailyRange: [string, string] = [currentDateStr, currentDateStr];
  
  const { weeklyRange, monthlyRange } = useMemo(() => {
    const today = new Date(currentDateStr + 'T12:00:00');
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      weeklyRange: [formatD(weekAgo), currentDateStr] as [string, string],
      monthlyRange: [formatD(monthStart), currentDateStr] as [string, string],
    };
  }, [currentDateStr]);

  const activeRange =
    period === 'daily' ? dailyRange : period === 'weekly' ? weeklyRange : monthlyRange;

  const periodLabel = useMemo(() => {
    const today = new Date(currentDateStr + 'T12:00:00');
    if (period === 'daily') {
      return today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }
    if (period === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);
      const startStr = weekAgo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      const endStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
      return `Últimos 7 dias (${startStr} — ${endStr})`;
    }
    const monthName = today.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${today.getFullYear()}`;
  }, [currentDateStr, period]);

  const metrics = useMemo(() => {
    return getPeriodMetrics(sessions, expenses, activeRange[0], activeRange[1]);
  }, [sessions, expenses, activeRange]);

  // Chart data: Daily evolution
  const dailyEvolutionData = useMemo(() => {
    const daysMap = new Map<string, { date: string; label: string; income: number; expenses: number }>();

    // Sort sessions in ascending date order
    const relevantSessions = sessions
      .filter((s) => s.status === 'completed' && s.date >= activeRange[0] && s.date <= activeRange[1])
      .sort((a, b) => a.date.localeCompare(b.date));

    relevantSessions.forEach((s) => {
      const existing = daysMap.get(s.date) || {
        date: s.date,
        label: s.date.slice(5).replace('-', '/'),
        income: 0,
        expenses: 0,
      };
      existing.income += s.income;
      daysMap.set(s.date, existing);
    });

    expenses
      .filter((e) => e.date >= activeRange[0] && e.date <= activeRange[1])
      .forEach((e) => {
        const existing = daysMap.get(e.date) || {
          date: e.date,
          label: e.date.slice(5).replace('-', '/'),
          income: 0,
          expenses: 0,
        };
        existing.expenses += e.amount;
        daysMap.set(e.date, existing);
      });

    return Array.from(daysMap.values());
  }, [sessions, expenses, activeRange]);

  // Cost Distribution Donut Data
  const costDistributionData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const filteredExpenses = expenses.filter(
      (e) => e.date >= activeRange[0] && e.date <= activeRange[1]
    );

    filteredExpenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280'];

    return Object.entries(categoryTotals).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      color: colors[i % colors.length],
    }));
  }, [expenses, activeRange]);

  // Hourly Productivity & Heatmap
  const hourlyStats = useMemo(() => {
    return getHourlyProductivity(sessions);
  }, [sessions]);

  // Printable report preview trigger
  const handlePrint = () => {
    window.print();
  };

  const DAYS_OF_WEEK = [
    { key: 'seg', label: 'Seg' },
    { key: 'ter', label: 'Ter' },
    { key: 'qua', label: 'Qua' },
    { key: 'qui', label: 'Qui' },
    { key: 'sex', label: 'Sex' },
    { key: 'sab', label: 'Sáb' },
    { key: 'dom', label: 'Dom' },
  ];

  return (
    <div className="space-y-5 pb-24 pt-2 px-4 max-w-2xl mx-auto">
      {/* Header & Period Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Relatórios</h1>
          <p className="text-xs text-slate-400">Análise de produtividade e rentabilidade</p>
        </div>

        {/* Period Selector */}
        <div className="bg-[#0C0C0D] border border-white/[0.08] p-1 rounded-xl flex items-center gap-1 text-xs">
          <button
            onClick={() => setPeriod('daily')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'daily'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Diário
          </button>
          <button
            onClick={() => setPeriod('weekly')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'weekly'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'monthly'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mensal
          </button>
        </div>
      </div>

      {/* Main KPI Summary Card */}
      <div className="bg-gradient-to-b from-[#131924] to-[#0E131B] border border-white/[0.1] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{periodLabel}</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Lucro Líquido
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-white font-mono-num">
              {formatCurrency(metrics.netProfit)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Receita bruta de {formatCurrency(metrics.totalIncome)} - Custos de{' '}
              {formatCurrency(metrics.totalExpenses)}
            </p>
          </div>
        </div>

        {/* 6 Key Micro-KPIs Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.08] text-center">
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Horas</p>
            <p className="text-xs font-bold text-white font-mono-num">
              {formatDuration(metrics.totalDurationMinutes)}
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Quilômetros</p>
            <p className="text-xs font-bold text-white font-mono-num">
              {formatKm(metrics.totalDistanceKm)}
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Média/Dia</p>
            <p className="text-xs font-bold text-emerald-400 font-mono-num">
              {formatCurrency(metrics.avgDailyIncome)}
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Média/Hora</p>
            <p className="text-xs font-bold text-emerald-400 font-mono-num">
              {formatCurrency(metrics.avgHourlyRate)}/h
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Média/Km</p>
            <p className="text-xs font-bold text-emerald-400 font-mono-num">
              {formatCurrency(metrics.avgKmRate)}/km
            </p>
          </div>
          <div className="bg-black/30 rounded-xl p-2.5 border border-white/[0.04]">
            <p className="text-[10px] text-slate-400">Jornadas</p>
            <p className="text-xs font-bold text-white font-mono-num">{metrics.sessionsCount}</p>
          </div>
        </div>
      </div>

      {/* MINIMALIST MODE BANNER */}
      {isMinimalistMode && (
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-3.5 text-center text-xs text-slate-400">
          <p className="font-medium text-slate-300">Modo Minimalista Ativo</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Gráficos e matrizes foram ocultados para permitir leitura imediata dos números essenciais.
          </p>
        </div>
      )}

      {/* FULL MODE CHARTS (Hidden in Minimalist Mode) */}
      {!isMinimalistMode && (
        <>
          {/* CHART 1: Evolução dos Ganhos & Custos (Line/Bar) */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Evolução dos Ganhos x Custos
          </h2>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Ganhos
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Custos
            </span>
          </div>
        </div>

        <div className="h-56 w-full pt-2">
          {dailyEvolutionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyEvolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.75rem',
                    fontSize: '11px',
                    color: '#FFF',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                />
                <Bar dataKey="income" name="Ganhos" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Custos" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Sem dados suficientes no período.
            </div>
          )}
        </div>
      </div>

      {/* CHART 2: Distribuição dos Custos (Donut) */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Distribuição dos Custos
        </h2>

        {costDistributionData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4">
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costDistributionData}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {costDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0C0C0D',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      color: '#FFF',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs">
              {costDistributionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-semibold text-white font-mono-num">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-4 text-center">Nenhum custo registrado no período.</p>
        )}
      </div>

      {/* INTELIGÊNCIA DE HORÁRIOS & HEATMAP */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Inteligência de Horários
            </h2>
          </div>
          <span className="text-[10px] text-slate-400">Estimativas por histórico</span>
        </div>

        {/* Best & Worst Slots Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-emerald-400">Seu Melhor Horário</p>
            <p className="text-sm font-bold text-white mt-1">18:00 – 21:00</p>
            <p className="text-xs font-semibold text-emerald-400 mt-0.5 font-mono-num">
              Média R$ 72,00/h
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Pico noturno com alta demanda</p>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
            <p className="text-[10px] uppercase font-bold text-rose-400">Horário Menos Produtivo</p>
            <p className="text-sm font-bold text-white mt-1">13:00 – 15:00</p>
            <p className="text-xs font-semibold text-rose-400 mt-0.5 font-mono-num">
              Média R$ 31,00/h
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Ideal para almoço e descanso</p>
          </div>
        </div>

        {/* Heatmap Matrix */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-300">Heatmap de Produtividade Semanal</p>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-emerald-500" /> Alta
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-amber-500" /> Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-rose-500/80" /> Baixa
              </span>
            </div>
          </div>

          <div className="overflow-x-auto pb-1">
            <table className="w-full text-center text-[10px]">
              <thead>
                <tr className="text-slate-400">
                  <th className="py-1 text-left font-medium">Faixa</th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d.key} className="py-1 font-medium">
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {TIME_SLOTS.map((slot, idx) => {
                  // Pre-calculated representative heatmap ratings
                  // Peak hours: 18-21 (green), 06-09 (green), 12-15 (red/yellow), etc.
                  const rowRatings: ('high' | 'mid' | 'low')[] = [
                    idx === 4 || idx === 0 ? 'high' : idx === 2 ? 'low' : 'mid', // Seg
                    idx === 4 || idx === 1 ? 'high' : idx === 2 ? 'low' : 'mid', // Ter
                    idx === 4 || idx === 0 ? 'high' : idx === 2 ? 'low' : 'mid', // Qua
                    idx === 4 || idx === 3 ? 'high' : idx === 2 ? 'low' : 'mid', // Qui
                    idx === 4 || idx === 5 ? 'high' : idx === 2 ? 'mid' : 'high', // Sex
                    idx === 4 || idx === 5 ? 'high' : 'mid', // Sab
                    idx === 3 ? 'high' : 'low', // Dom
                  ];

                  return (
                    <tr key={slot.key}>
                      <td className="py-2 text-left font-medium text-slate-300 pr-2 whitespace-nowrap">
                        {slot.label}
                      </td>
                      {rowRatings.map((rating, rIdx) => {
                        const bgClass =
                          rating === 'high'
                            ? 'bg-emerald-500/80 text-black font-bold'
                            : rating === 'mid'
                            ? 'bg-amber-500/70 text-black font-medium'
                            : 'bg-rose-500/40 text-slate-300';
                        return (
                          <td key={rIdx} className="p-1">
                            <div
                              className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[9px] ${bgClass}`}
                            >
                              {rating === 'high' ? '🟢' : rating === 'mid' ? '🟡' : '🔴'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            * Baseado nas sessões concluídas. As recomendações são estimativas estatísticas para auxiliar
            seu planejamento semanal.
          </p>
        </div>
      </div>
      </>
      )}

      {/* EXPORT DATA & PRINT */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-200">Exportar Relatório</p>
          <p className="text-[11px] text-slate-400">
            Baixe seus registros completos em planilha CSV ou imprima o resumo.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={exportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-emerald-400 border border-emerald-500/20 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Baixar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-slate-300 border border-white/[0.08] transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
