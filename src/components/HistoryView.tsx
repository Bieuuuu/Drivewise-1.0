import React, { useState, useMemo } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import { WorkSession } from '../types';
import {
  formatCurrency,
  formatDuration,
  formatKm,
  getMetricsForDate,
} from '../utils/calculations';
import {
  CalendarDays,
  List,
  Filter,
  Trash2,
  Edit,
  Clock,
  Navigation,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
} from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { sessions, expenses, deleteSession, updateSession, currentDateStr, isMinimalistMode } = useDriveWise();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('Todos');

  // Edit session dialog state
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editIncome, setEditIncome] = useState('');
  const [editKm, setEditKm] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Day drilldown modal for calendar
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Filtered sessions for list view
  const filteredSessions = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'completed')
      .filter((s) => {
        if (selectedPlatform === 'Todos') return true;
        if (selectedPlatform === 'Uber') return (s.platformEarnings?.Uber || 0) > 0;
        if (selectedPlatform === '99') return (s.platformEarnings?.['99'] || 0) > 0;
        if (selectedPlatform === 'InDrive') return (s.platformEarnings?.InDrive || 0) > 0;
        return true;
      })
      .sort((a, b) => b.startTime.localeCompare(a.startTime));
  }, [sessions, selectedPlatform]);

  // Dynamic Calendar Setup
  const initialYearMonth = useMemo(() => {
    const parts = currentDateStr.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = (parseInt(parts[1], 10) || (new Date().getMonth() + 1)) - 1;
    return { year: y, month: m };
  }, [currentDateStr]);

  const [calYear, setCalYear] = useState(initialYearMonth.year);
  const [calMonth, setCalMonth] = useState(initialYearMonth.month);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalYear((prev) => prev - 1);
      setCalMonth(11);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalYear((prev) => prev + 1);
      setCalMonth(0);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const monthYearKey = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;

  const monthLabel = useMemo(() => {
    const d = new Date(calYear, calMonth, 1);
    const monthName = d.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${calYear}`;
  }, [calYear, calMonth]);

  // Aggregate stats per day of month
  const dayStatsMap = useMemo(() => {
    const map = new Map<string, { totalIncome: number; sessionsCount: number }>();
    sessions
      .filter((s) => s.status === 'completed' && s.date.startsWith(monthYearKey))
      .forEach((s) => {
        const existing = map.get(s.date) || { totalIncome: 0, sessionsCount: 0 };
        existing.totalIncome += s.income;
        existing.sessionsCount += 1;
        map.set(s.date, existing);
      });
    return map;
  }, [sessions, monthYearKey]);

  // Open edit modal
  const handleOpenEdit = (session: WorkSession) => {
    setEditingSession(session);
    setEditIncome(session.income.toString());
    setEditKm(
      (session.manualDistanceCorrection !== undefined
        ? session.manualDistanceCorrection
        : session.distanceKm
      ).toString()
    );
    setEditNotes(session.notes || '');
  };

  // Save edited session
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    const incomeVal = parseFloat(editIncome.replace(',', '.')) || 0;
    const kmVal = parseFloat(editKm.replace(',', '.')) || 0;

    updateSession(editingSession.id, {
      income: incomeVal,
      manualDistanceCorrection: kmVal,
      notes: editNotes,
    });

    setEditingSession(null);
  };

  // Format date header (e.g. "03 SET", "02 SET")
  const formatDateBadge = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const monthsPt = [
      'JAN',
      'FEV',
      'MAR',
      'ABR',
      'MAI',
      'JUN',
      'JUL',
      'AGO',
      'SET',
      'OUT',
      'NOV',
      'DEZ',
    ];
    return `${day} ${monthsPt[parseInt(month, 10) - 1]}`;
  };

  // Detail of selected day for calendar drilldown
  const selectedDayMetrics = selectedCalendarDate
    ? getMetricsForDate(sessions, expenses, selectedCalendarDate)
    : null;

  return (
    <div className="space-y-4 pb-24 pt-2 px-4 max-w-2xl mx-auto">
      {/* Header with View Mode Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Histórico</h1>
          <p className="text-xs text-slate-400">
            {isMinimalistMode ? 'Lista de jornadas concluídas' : 'Jornadas e diário de bordo'}
          </p>
        </div>

        {!isMinimalistMode && (
          <div className="bg-[#0C0C0D] border border-white/[0.08] p-1 rounded-xl flex items-center gap-1 text-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors ${
                viewMode === 'list'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-emerald-500 text-black font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
          </div>
        )}
      </div>

      {/* LIST VIEW (Always active in Minimalist Mode) */}
      {(viewMode === 'list' || isMinimalistMode) && (
        <div className="space-y-3">
          {/* Platform Filters (hidden in Minimalist Mode for pure essential list) */}
          {!isMinimalistMode && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['Todos', 'Uber', '99', 'InDrive'].map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    selectedPlatform === platform
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#0C0C0D] text-slate-400 border border-white/[0.06] hover:text-white'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          )}

          {/* Session Cards */}
          {filteredSessions.length === 0 ? (
            <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-8 text-center text-slate-400 text-xs">
              Nenhuma jornada encontrada para o filtro selecionado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSessions.map((session) => {
                const effectiveKm =
                  session.manualDistanceCorrection !== undefined
                    ? session.manualDistanceCorrection
                    : session.distanceKm;
                const hourlyRate =
                  session.durationMinutes > 0
                    ? (session.income / session.durationMinutes) * 60
                    : 0;

                return (
                  <div
                    key={session.id}
                    className="bg-[#0C0C0D] border border-white/[0.08] rounded-xl p-4 space-y-3 hover:border-white/[0.15] transition-colors"
                  >
                    {/* Card Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-white/[0.08] text-white font-bold text-xs">
                          {formatDateBadge(session.date)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {session.shiftNumber}º turno
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-400 font-mono-num">
                          {formatCurrency(session.income)}
                        </span>
                        <p className="text-[10px] text-slate-400 font-mono-num">
                          {formatCurrency(hourlyRate)}/h
                        </p>
                      </div>
                    </div>

                    {/* Card Middle: Time & Distance */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/[0.04]">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          {session.startTime
                            ? new Date(session.startTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--'}{' '}
                          →{' '}
                          {session.endTime
                            ? new Date(session.endTime).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--'}{' '}
                          ({formatDuration(session.durationMinutes)})
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{formatKm(effectiveKm)}</span>
                      </div>
                    </div>

                    {/* Platform pills & Notes */}
                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {session.platformEarnings?.Uber > 0 && (
                          <span className="px-2 py-0.5 rounded bg-white/[0.05] text-slate-300 border border-white/[0.06]">
                            Uber: {formatCurrency(session.platformEarnings.Uber)}
                          </span>
                        )}
                        {session.platformEarnings?.['99'] > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            99: {formatCurrency(session.platformEarnings['99'])}
                          </span>
                        )}
                        {session.platformEarnings?.InDrive > 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            InDrive: {formatCurrency(session.platformEarnings.InDrive)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(session)}
                          title="Editar jornada"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Excluir este registro de jornada?')) {
                              deleteSession(session.id);
                            }
                          }}
                          title="Excluir jornada"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {session.notes && (
                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-white/[0.04]">
                        "{session.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-bold text-white min-w-[130px] text-center">{monthLabel}</h2>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;R$400
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> R$200-400
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;R$200
                </span>
              </div>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-slate-400 text-[10px] font-semibold py-1">
                  {d}
                </div>
              ))}

              {/* Offset for 1st of month */}
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`empty-${i}`} className="h-12 rounded-lg bg-transparent" />
              ))}

              {/* Days of month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${monthYearKey}-${dayNum.toString().padStart(2, '0')}`;
                const stat = dayStatsMap.get(dateKey);
                const hasWorked = stat && stat.sessionsCount > 0;
                const isToday = dateKey === currentDateStr;

                let indicatorColor = 'bg-slate-700/40 text-slate-500';
                if (hasWorked) {
                  if (stat.totalIncome >= 400) indicatorColor = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold';
                  else if (stat.totalIncome >= 200) indicatorColor = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
                  else indicatorColor = 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold';
                }

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (hasWorked) setSelectedCalendarDate(dateKey);
                    }}
                    className={`h-12 rounded-xl flex flex-col items-center justify-center p-1 transition-all ${indicatorColor} ${
                      isToday ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-black' : ''
                    } ${hasWorked ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                  >
                    <span className="text-xs">{dayNum}</span>
                    {hasWorked && (
                      <span className="text-[9px] font-mono-num mt-0.5 leading-none">
                        R${Math.round(stat.totalIncome)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 text-center">
              Toque em qualquer dia trabalhado para abrir o relatório completo.
            </p>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0C0C0D] border border-white/[0.1] rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <h3 className="text-base font-bold text-white">Editar Registro de Jornada</h3>
              <button
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Ganhos totais (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editIncome}
                  onChange={(e) => setEditIncome(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.1] rounded-lg p-2 text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Quilometragem (km)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={editKm}
                  onChange={(e) => setEditKm(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.1] rounded-lg p-2 text-white font-mono-num focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Observações</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#000000] border border-white/[0.1] rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-300 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-black font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CALENDAR DAY DRILLDOWN MODAL */}
      {selectedCalendarDate && selectedDayMetrics && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0C0C0D] border border-white/[0.1] rounded-2xl p-5 max-w-sm w-full space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div>
                <h3 className="text-base font-bold text-white">
                  Resumo: {selectedCalendarDate.split('-').reverse().join('/')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedDayMetrics.sessions.length} jornada(s) registradas
                </p>
              </div>
              <button
                onClick={() => setSelectedCalendarDate(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400">Total Ganho</span>
                <p className="text-sm font-bold text-emerald-400 font-mono-num">
                  {formatCurrency(selectedDayMetrics.totalIncome)}
                </p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400">Lucro Líquido</span>
                <p className="text-sm font-bold text-white font-mono-num">
                  {formatCurrency(selectedDayMetrics.netProfit)}
                </p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400">Horas Trabalhadas</span>
                <p className="text-xs font-bold text-white font-mono-num">
                  {formatDuration(selectedDayMetrics.totalDurationMinutes)}
                </p>
              </div>
              <div className="bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                <span className="text-[10px] text-slate-400">Distância Total</span>
                <p className="text-xs font-bold text-white font-mono-num">
                  {formatKm(selectedDayMetrics.totalDistanceKm)}
                </p>
              </div>
            </div>

            {/* List of shifts that day */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
              <p className="text-[11px] font-semibold text-slate-300">Turnos do dia:</p>
              {selectedDayMetrics.sessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-black/40 border border-white/[0.04] p-2.5 rounded-lg flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-white">{s.shiftNumber}º turno</span>
                    <p className="text-[10px] text-slate-400">
                      {formatDuration(s.durationMinutes)} • {formatKm(s.distanceKm)}
                    </p>
                  </div>
                  <div className="text-right font-mono-num text-emerald-400 font-bold">
                    {formatCurrency(s.income)}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedCalendarDate(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-xs font-semibold text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
