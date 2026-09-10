import React, { useState } from 'react';
import {
  TrendingUp,
  PieChart,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Search,
  Play,
  ChevronRight,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { RideOpportunity } from '../../types';
import { computeDecisionAnalytics } from '../../utils/copilotCalculations';
import { formatCurrency } from '../../utils/calculations';

export const CopilotAnalyticsView: React.FC = () => {
  const {
    rides,
    setIsRideAnalysisModalOpen,
    setLastAnalyzedRide,
    setIsSimulatorOpen,
    exportCSV,
  } = useDriveWise();

  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const analytics = computeDecisionAnalytics(rides);

  // Filtered rides list
  const filteredRides = rides.filter((r) => {
    if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
    if (statusFilter !== 'all') {
      if (statusFilter === 'accepted' && r.status !== 'accepted' && r.status !== 'completed')
        return false;
      if (statusFilter === 'rejected' && r.status !== 'rejected') return false;
      if (statusFilter === 'canceled' && r.status !== 'canceled') return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const pickup = (r.pickupAddress || '').toLowerCase();
      const dropoff = (r.dropoffAddress || '').toLowerCase();
      const reason = (r.decisionReason || '').toLowerCase();
      if (!pickup.includes(term) && !dropoff.includes(term) && !reason.includes(term)) return false;
    }
    return true;
  });

  const renderPlatformDot = (platform: string) => {
    if (platform === 'Uber') return <span className="w-2 h-2 rounded-full bg-white shrink-0" />;
    if (platform === '99') return <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />;
    if (platform === 'InDrive') return <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />;
  };

  const getScoreColor = (tier: string) => {
    switch (tier) {
      case 'Excelente':
        return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      case 'Boa':
        return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      case 'Regular':
        return 'text-slate-300 bg-white/[0.06] border-white/[0.1]';
      default:
        return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
  };

  const handleOpenRide = (ride: RideOpportunity) => {
    setLastAnalyzedRide(ride);
    setIsRideAnalysisModalOpen(true);
  };

  return (
    <div id="copilot-analytics-container" className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Relatórios e decisões
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas sobre suas chamadas, taxa de aceitação e plataformas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-copilot-csv"
            onClick={exportCSV}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-xs font-medium transition-all flex items-center gap-1.5"
            title="Exportar CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 1. Primary KPIs in ONE card with 2x2 grid and internal dividers */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg shadow-black/40">
        <div className="grid grid-cols-2 divide-x divide-y divide-white/[0.06]">
          {/* Quadrant 1: Corridas Analisadas */}
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Corridas analisadas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                {analytics.totalAnalyzed}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono-num">
              {analytics.totalAccepted} aceitas ({analytics.acceptanceRate}%)
            </span>
          </div>

          {/* Quadrant 2: Taxa de Aceitação */}
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Taxa de aceitação
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono-num">
                {analytics.acceptanceRate}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono-num">
              {analytics.totalRejected} recusadas com critério
            </span>
          </div>

          {/* Quadrant 3: Lucro Líquido Aceitas */}
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Lucro aceitas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
                {formatCurrency(analytics.estimatedProfitAccepted)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Pontuação média: <strong className="text-slate-200">{analytics.avgScoreAccepted}</strong>
            </span>
          </div>

          {/* Quadrant 4: Prejuízo Evitado (Positive economy: neutral gray/amber, NOT red) */}
          <div className="p-4">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Prejuízo evitado
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-200 font-mono-num">
                {formatCurrency(analytics.estimatedLostProfitRejected)}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              Pontuação recusadas: <strong className="text-slate-400">{analytics.avgScoreRejected}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Platform Comparison */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            <span>Comparativo de rentabilidade</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Desempenho por aplicativo de corrida
          </p>
        </div>

        {/* Mobile View: Stacked Cards (< md) */}
        <div className="block md:hidden divide-y divide-white/[0.06]">
          {analytics.platformComparison.map((p) => (
            <div key={p.platform} className="py-3.5 first:pt-1 last:pb-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderPlatformDot(p.platform)}
                  <span className="font-bold text-white text-sm">{p.platform}</span>
                </div>
                <div className="text-xs font-mono-num">
                  <span className="text-slate-400">Aceitação: </span>
                  <span className="font-bold text-emerald-400">{p.acceptanceRate}%</span>
                  <span className="text-slate-400 text-[11px]"> ({p.accepted}/{p.analyzed})</span>
                </div>
              </div>

              {/* R$/km Líquido in bold focus */}
              <div className="flex items-baseline justify-between bg-black/30 px-3 py-2 rounded-xl border border-white/[0.04]">
                <span className="text-xs text-slate-400">R$/km líquido</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono-num">
                  {formatCurrency(p.avgNetPerKm)}/km
                </span>
              </div>

              {/* Secondary metrics row */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono-num">
                <span>
                  {p.avgNetPerHour > 0 ? `${formatCurrency(p.avgNetPerHour)}/h` : '-'}
                </span>
                <span>•</span>
                <span>Desloc. {p.avgDeadheadPercent}%</span>
                <span>•</span>
                <span className="font-semibold text-slate-200">
                  Lucro: {formatCurrency(p.totalProfit)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Clean Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Plataforma</th>
                <th className="pb-3 text-center">Analisadas</th>
                <th className="pb-3 text-center">Taxa aceitação</th>
                <th className="pb-3 text-right">R$/km bruto</th>
                <th className="pb-3 text-right font-bold text-slate-200">R$/km líquido</th>
                <th className="pb-3 text-right">R$/hora líquida</th>
                <th className="pb-3 text-center">% Deslocamento</th>
                <th className="pb-3 text-center">Pontuação</th>
                <th className="pb-3 text-right pr-2">Lucro gerado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] font-medium font-mono-num">
              {analytics.platformComparison.map((p) => (
                <tr key={p.platform} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-2 font-bold text-white flex items-center gap-2">
                    {renderPlatformDot(p.platform)}
                    {p.platform}
                  </td>
                  <td className="py-3 text-center text-slate-300">{p.analyzed}</td>
                  <td className="py-3 text-center font-bold text-emerald-400">
                    {p.acceptanceRate}% ({p.accepted})
                  </td>
                  <td className="py-3 text-right text-slate-400">{formatCurrency(p.avgGrossPerKm)}</td>
                  <td className="py-3 text-right font-bold text-emerald-400">
                    {formatCurrency(p.avgNetPerKm)}
                  </td>
                  <td className="py-3 text-right font-semibold text-white">
                    {p.avgNetPerHour > 0 ? `${formatCurrency(p.avgNetPerHour)}/h` : '-'}
                  </td>
                  <td className="py-3 text-center text-slate-400">{p.avgDeadheadPercent}%</td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-black ${
                        p.avgScore >= 80
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : p.avgScore >= 60
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-white/[0.06] text-slate-400'
                      }`}
                    >
                      {p.avgScore}
                    </span>
                  </td>
                  <td className="py-3 text-right pr-2 font-bold text-white">
                    {formatCurrency(p.totalProfit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Rejection Reasons & Hourly Profitability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rejection Reasons */}
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-slate-400" />
              <span>Motivos de recusa mais frequentes</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Filtros mais aplicados ao descartar chamadas
            </p>
          </div>

          <div className="space-y-2.5 pt-1">
            {analytics.rejectionReasons.length > 0 ? (
              analytics.rejectionReasons.map((item) => (
                <div key={item.reason} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.reason}</span>
                    <span className="text-slate-400 font-mono-num">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-1.5 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-2">Nenhuma corrida recusada registrada.</p>
            )}
          </div>
        </div>

        {/* Hourly Profitability */}
        <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Rentabilidade por faixa de horário</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Retorno médio por hora em cada período
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {analytics.hourlyProfitability.map((h) => {
              const hasData = h.count > 0 && h.avgNetPerHour > 0;
              return (
                <div
                  key={h.slot}
                  className="bg-black/30 border border-white/[0.04] p-2.5 rounded-xl text-center space-y-0.5"
                >
                  <span className="text-xs font-semibold text-slate-300 block">{h.slot}</span>
                  <span
                    className={`text-sm sm:text-base font-bold font-mono-num block ${
                      !hasData
                        ? 'text-slate-500'
                        : h.rating === 'alta'
                        ? 'text-emerald-400'
                        : 'text-slate-200'
                    }`}
                  >
                    {hasData ? `${formatCurrency(h.avgNetPerHour)}/h` : 'R$ 0/h'}
                  </span>
                  <span className="text-[10px] text-slate-500 block font-mono-num">
                    {h.count} {h.count === 1 ? 'chamada' : 'chamadas'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Complete Rides History */}
      <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Histórico de chamadas analisadas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Toque em qualquer corrida para abrir a ficha de análise
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar rua, bairro..."
                className="w-full sm:w-44 bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/[0.2]"
              />
            </div>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todas plataformas</option>
              <option value="Uber">Uber</option>
              <option value="99">99</option>
              <option value="InDrive">InDrive</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">Todos status</option>
              <option value="accepted">Aceitas</option>
              <option value="rejected">Recusadas</option>
              <option value="canceled">Canceladas</option>
            </select>
          </div>
        </div>

        {/* List of rides: Clean layout without column collision */}
        <div className="divide-y divide-white/[0.05]">
          {filteredRides.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              Nenhuma corrida encontrada para os filtros selecionados.
            </p>
          ) : (
            filteredRides.map((ride) => (
              <div
                key={ride.id}
                onClick={() => handleOpenRide(ride)}
                className="py-3 hover:bg-white/[0.02] -mx-2 px-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2"
              >
                {/* Left: App + Route */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {renderPlatformDot(ride.platform)}
                    <span className="font-semibold text-white text-xs">{ride.platform}</span>
                    <span className="text-[11px] text-slate-500 font-mono-num">
                      {new Date(ride.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getScoreColor(
                        ride.scoreTier
                      )}`}
                    >
                      {ride.score}
                    </span>

                    {/* Status / Lifecycle badges */}
                    {ride.status === 'canceled' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Cancelada {ride.cancellationFee ? `(+R$ ${ride.cancellationFee.toFixed(2)})` : ''}
                      </span>
                    )}
                    {ride.routeDeviationKm && ride.routeDeviationKm > 0 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        +{ride.routeDeviationKm.toFixed(1)} km desvio
                      </span>
                    ) : null}
                    {ride.priceAdjustment && ride.priceAdjustment !== 0 ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        +R$ {ride.priceAdjustment.toFixed(2)} ajuste
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    {ride.pickupAddress || 'Origem'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    → {ride.dropoffAddress || 'Destino'}
                  </p>
                </div>

                {/* Right: Values in separate rows, strictly right-aligned */}
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold text-white font-mono-num">
                    {formatCurrency(ride.offeredValue)}
                  </div>
                  <div className="text-[11px] font-semibold text-emerald-400 font-mono-num">
                    +{formatCurrency(ride.netProfit)} líq
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-num">
                    {formatCurrency(ride.netPerKm)}/km
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
