import { Expense, FuelEntry, HourlyStat, WorkSession } from '../types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount || 0);
}

export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 00min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}min`;
}

export function formatKm(km: number, decimals: number = 1): string {
  const rounded = Number(km || 0).toFixed(decimals);
  return `${rounded.replace('.', ',')} km`;
}

export function calculateHourlyRate(income: number, durationMinutes: number): number {
  if (!durationMinutes || durationMinutes < 5) return 0;
  return (income / durationMinutes) * 60;
}

export function formatHourlyRate(income: number, durationMinutes: number): string {
  if (!durationMinutes || durationMinutes < 5) return '-';
  const rate = (income / durationMinutes) * 60;
  return `${formatCurrency(rate)}/h`;
}

export function calculateKmRate(income: number, distanceKm: number): number {
  if (!distanceKm || distanceKm <= 0) return 0;
  return income / distanceKm;
}

// Haversine formula to compute distance between GPS coords
export function computeDistanceBetweenCoords(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  sessionsCount: number;
  daysWorkedCount: number;
  avgDailyIncome: number;
  avgHourlyRate: number;
  avgKmRate: number;
}

export function getMetricsForDate(
  sessions: WorkSession[],
  expenses: Expense[],
  targetDate: string
): PeriodSummary & { sessions: WorkSession[] } {
  const daySessions = sessions.filter((s) => s.date === targetDate && s.status === 'completed');
  const dayExpenses = expenses.filter((e) => e.date === targetDate);

  const totalIncome = daySessions.reduce((acc, s) => acc + (s.income || 0), 0);
  const totalExpenses = dayExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalDurationMinutes = daySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalDistanceKm = daySessions.reduce((acc, s) => {
    const dist = s.manualDistanceCorrection !== undefined ? s.manualDistanceCorrection : s.distanceKm;
    return acc + (dist || 0);
  }, 0);

  const netProfit = totalIncome - totalExpenses;
  const validHourlySessions = daySessions.filter((s) => (s.durationMinutes || 0) >= 5);
  const validDurationMinutes = validHourlySessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const validIncome = validHourlySessions.reduce((acc, s) => acc + (s.income || 0), 0);
  const avgHourlyRate = validDurationMinutes >= 5 ? (validIncome / validDurationMinutes) * 60 : 0;
  const avgKmRate = totalDistanceKm > 0 ? totalIncome / totalDistanceKm : 0;

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    totalDurationMinutes,
    totalDistanceKm,
    sessionsCount: daySessions.length,
    daysWorkedCount: daySessions.length > 0 ? 1 : 0,
    avgDailyIncome: totalIncome,
    avgHourlyRate,
    avgKmRate,
    sessions: daySessions,
  };
}

export function getPeriodMetrics(
  sessions: WorkSession[],
  expenses: Expense[],
  startDate: string,
  endDate: string
): PeriodSummary {
  const filteredSessions = sessions.filter(
    (s) => s.status === 'completed' && s.date >= startDate && s.date <= endDate
  );
  const filteredExpenses = expenses.filter((e) => e.date >= startDate && e.date <= endDate);

  const totalIncome = filteredSessions.reduce((acc, s) => acc + (s.income || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalDurationMinutes = filteredSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const totalDistanceKm = filteredSessions.reduce((acc, s) => {
    const dist = s.manualDistanceCorrection !== undefined ? s.manualDistanceCorrection : s.distanceKm;
    return acc + (dist || 0);
  }, 0);

  const uniqueDays = new Set(filteredSessions.map((s) => s.date));
  const daysWorkedCount = uniqueDays.size || 1;
  const netProfit = totalIncome - totalExpenses;
  const avgDailyIncome = totalIncome / daysWorkedCount;
  const validPeriodSessions = filteredSessions.filter((s) => (s.durationMinutes || 0) >= 5);
  const validPeriodMinutes = validPeriodSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
  const validPeriodIncome = validPeriodSessions.reduce((acc, s) => acc + (s.income || 0), 0);
  const avgHourlyRate = validPeriodMinutes >= 5 ? (validPeriodIncome / validPeriodMinutes) * 60 : 0;
  const avgKmRate = totalDistanceKm > 0 ? totalIncome / totalDistanceKm : 0;

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    totalDurationMinutes,
    totalDistanceKm,
    sessionsCount: filteredSessions.length,
    daysWorkedCount: uniqueDays.size,
    avgDailyIncome,
    avgHourlyRate,
    avgKmRate,
  };
}

export function getComparisonMetrics(
  sessions: WorkSession[],
  expenses: Expense[],
  currentRange: [string, string],
  prevRange: [string, string]
) {
  const current = getPeriodMetrics(sessions, expenses, currentRange[0], currentRange[1]);
  const prev = getPeriodMetrics(sessions, expenses, prevRange[0], prevRange[1]);

  const calcDiff = (curr: number, prior: number) => {
    if (prior === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prior) / prior) * 100);
  };

  return {
    incomeDiff: calcDiff(current.totalIncome, prev.totalIncome),
    hoursDiff: calcDiff(current.totalDurationMinutes, prev.totalDurationMinutes),
    kmDiff: calcDiff(current.totalDistanceKm, prev.totalDistanceKm),
    profitDiff: calcDiff(current.netProfit, prev.netProfit),
    current,
    prev,
  };
}

export const TIME_SLOTS = [
  { key: '06-09', label: '06:00 - 09:00', startH: 6, endH: 9 },
  { key: '09-12', label: '09:00 - 12:00', startH: 9, endH: 12 },
  { key: '12-15', label: '12:00 - 15:00', startH: 12, endH: 15 },
  { key: '15-18', label: '15:00 - 18:00', startH: 15, endH: 18 },
  { key: '18-21', label: '18:00 - 21:00', startH: 18, endH: 21 },
  { key: '21-00', label: '21:00 - 00:00', startH: 21, endH: 24 },
];

export function getHourlyProductivity(sessions: WorkSession[]): {
  slots: HourlyStat[];
  bestSlot: HourlyStat | null;
  worstSlot: HourlyStat | null;
  hasEnoughData: boolean;
} {
  const completed = sessions.filter((s) => s.status === 'completed');
  if (completed.length < 3) {
    return {
      slots: [],
      bestSlot: null,
      worstSlot: null,
      hasEnoughData: false,
    };
  }

  const slotAgg = TIME_SLOTS.map((slot) => {
    let slotIncome = 0;
    let slotMinutes = 0;
    let count = 0;

    completed.forEach((s) => {
      const sDate = new Date(s.startTime);
      const startHour = sDate.getHours();
      // Check if session falls into or overlaps this slot
      if (startHour >= slot.startH && startHour < slot.endH) {
        slotIncome += s.income;
        slotMinutes += s.durationMinutes;
        count += 1;
      }
    });

    const hourlyRate = slotMinutes > 0 ? (slotIncome / slotMinutes) * 60 : 0;
    let rating: 'otimo' | 'bom' | 'regular' | 'baixo' = 'regular';
    if (hourlyRate >= 65) rating = 'otimo';
    else if (hourlyRate >= 50) rating = 'bom';
    else if (hourlyRate >= 35) rating = 'regular';
    else rating = 'baixo';

    return {
      timeSlot: slot.label,
      hourKey: slot.key,
      avgHourlyRate: hourlyRate,
      totalHours: slotMinutes / 60,
      rating,
      description:
        rating === 'otimo'
          ? 'Alta rentabilidade com demanda consistente'
          : rating === 'baixo'
          ? 'Rentabilidade reduzida, menor demanda'
          : 'Rentabilidade estável',
    };
  });

  const slotsWithData = slotAgg.filter((s) => s.avgHourlyRate > 0);
  slotsWithData.sort((a, b) => b.avgHourlyRate - a.avgHourlyRate);

  const bestSlot = slotsWithData[0] || null;
  const worstSlot = slotsWithData[slotsWithData.length - 1] || null;

  return {
    slots: slotAgg,
    bestSlot,
    worstSlot,
    hasEnoughData: true,
  };
}

export function getFuelAnalytics(fuelEntries: FuelEntry[], sessions: WorkSession[]) {
  const totalCost = fuelEntries.reduce((acc, f) => acc + f.totalCost, 0);
  const totalLiters = fuelEntries.reduce((acc, f) => acc + f.liters, 0);
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalKm = completedSessions.reduce((acc, s) => acc + s.distanceKm, 0);

  const avgPricePerLiter = totalLiters > 0 ? totalCost / totalLiters : 0;
  const avgCostPerKm = totalKm > 0 ? totalCost / totalKm : 0;
  const estimatedKmPerLiter = totalLiters > 0 && totalKm > 0 ? totalKm / totalLiters : 11.5;

  return {
    totalCost,
    totalLiters,
    avgPricePerLiter,
    avgCostPerKm,
    estimatedKmPerLiter,
  };
}
