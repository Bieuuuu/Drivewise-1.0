import React, { useState } from 'react';
import {
  Sliders,
  Car,
  Layers,
  Shield,
  Check,
  Plus,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { FuelType } from '../../types';
import { calculateVehicleCosts } from '../../utils/copilotCalculations';
import { formatCurrency } from '../../utils/calculations';

export const CopilotSettingsView: React.FC = () => {
  const {
    decisionRules,
    updateDecisionRules,
    vehicleProfiles,
    activeVehicleProfile,
    updateVehicleProfile,
    addVehicleProfile,
    setActiveVehicleProfile,
    overlayPref,
    updateOverlayPref,
    drivingMode,
    updateDrivingMode,
    hasOverlayPermission,
    setIsOverlayPermissionModalOpen,
  } = useDriveWise();

  const [activeTab, setActiveTab] = useState<'rules' | 'vehicle' | 'overlay' | 'driving'>('rules');
  const [savedBanner, setSavedBanner] = useState(false);

  const costs = calculateVehicleCosts(activeVehicleProfile);

  const showSaved = () => {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2000);
  };

  return (
    <div id="copilot-settings-container" className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">
            Configurações do copiloto
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Critérios mínimos, custos do veículo e modo de exibição.
          </p>
        </div>

        {savedBanner && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium self-start sm:self-auto">
            <Check className="w-3.5 h-3.5" /> <span>Configurações salvas</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-white/[0.08]">
        <button
          id="tab-btn-rules"
          onClick={() => setActiveTab('rules')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'rules'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Critérios</span>
        </button>

        <button
          id="tab-btn-vehicle"
          onClick={() => setActiveTab('vehicle')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'vehicle'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          <span>Custos do veículo</span>
        </button>

        <button
          id="tab-btn-overlay"
          onClick={() => setActiveTab('overlay')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'overlay'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Overlay</span>
        </button>

        <button
          id="tab-btn-driving"
          onClick={() => setActiveTab('driving')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'driving'
              ? 'bg-white/[0.1] text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Modo direção</span>
        </button>
      </div>

      {/* TAB 1: DECISION RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Regras de rentabilidade mínima</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Critérios para avaliar a pontuação de 0 a 100 de cada chamada recebida.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  R$/km líquido mínimo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    value={decisionRules.minNetPerKm}
                    onChange={(e) => {
                      updateDecisionRules({ minNetPerKm: parseFloat(e.target.value) || 0 });
                      showSaved();
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Recomendado: R$ 1,60 a R$ 2,20/km
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  R$/km bruto mínimo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    value={decisionRules.minGrossPerKm}
                    onChange={(e) => {
                      updateDecisionRules({ minGrossPerKm: parseFloat(e.target.value) || 0 });
                      showSaved();
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Recomendado: R$ 2,20 a R$ 2,80/km
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  R$/hora líquida mínima
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="1"
                    value={decisionRules.minNetPerHour}
                    onChange={(e) => {
                      updateDecisionRules({ minNetPerHour: parseFloat(e.target.value) || 0 });
                      showSaved();
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Recomendado: R$ 25 a R$ 40/h
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  R$/hora bruta mínima
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="1"
                    value={decisionRules.minGrossPerHour}
                    onChange={(e) => {
                      updateDecisionRules({ minGrossPerHour: parseFloat(e.target.value) || 0 });
                      showSaved();
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Recomendado: R$ 38 a R$ 55/h
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Valor mínimo da corrida
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    step="1"
                    value={decisionRules.minRideValue}
                    onChange={(e) => {
                      updateDecisionRules({ minRideValue: parseFloat(e.target.value) || 0 });
                      showSaved();
                    }}
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                  />
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Evita chamadas muito baixas que não cobrem o deslocamento
                </span>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Distância máxima até o passageiro (km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={decisionRules.maxDistanceToPassengerKm}
                  onChange={(e) => {
                    updateDecisionRules({ maxDistanceToPassengerKm: parseFloat(e.target.value) || 0 });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
                <span className="text-[11px] text-slate-500 block mt-1">
                  Alerta se passageiro estiver além desse raio
                </span>
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-white/[0.06] space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">
                    Considerar retorno vazio no cálculo
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Estima deslocamento de volta para corridas em regiões afastadas
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={decisionRules.considerEmptyReturn}
                  onChange={(e) => {
                    updateDecisionRules({ considerEmptyReturn: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">
                    Priorizar atingimento da meta diária
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Pontuação extra para chamadas que faltam pouco para fechar a meta
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={decisionRules.prioritizeDailyGoal}
                  onChange={(e) => {
                    updateDecisionRules({ prioritizeDailyGoal: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLE COST PROFILE */}
      {activeTab === 'vehicle' && (
        <div className="space-y-4">
          {/* Active Profile Overview - Integrated Card with Dividers */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl overflow-hidden shadow-lg shadow-black/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
              <div className="p-4">
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Custo por km calculado
                </span>
                <span className="text-2xl font-extrabold text-white font-mono-num block mt-1">
                  {formatCurrency(costs.costPerKm)}/km
                </span>
                <span className="text-[11px] text-slate-400 block mt-1 font-mono-num">
                  Combustível (~{formatCurrency(costs.fuelCostPerKm)}) + desgaste
                </span>
              </div>

              <div className="p-4">
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Custo fixo por hora
                </span>
                <span className="text-2xl font-extrabold text-white font-mono-num block mt-1">
                  {formatCurrency(costs.costPerHour)}/h
                </span>
                <span className="text-[11px] text-slate-400 block mt-1 font-mono-num">
                  Custos fixos diluídos em {activeVehicleProfile.estimatedMonthlyHours}h
                </span>
              </div>

              <div className="p-4">
                <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
                  Veículo ativo
                </span>
                <span className="text-lg font-bold text-white block mt-1 truncate">
                  {activeVehicleProfile.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono-num block mt-0.5">
                  Placa: {activeVehicleProfile.plate} • {activeVehicleProfile.type}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle Profile Selector & Editor */}
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Veículos cadastrados</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  O Copiloto usa o custo do veículo ativo para apurar o lucro líquido real.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  addVehicleProfile({
                    name: 'Novo Veículo',
                    plate: 'NOVO-2026',
                    type: 'Carro',
                    fuelType: 'Gasolina',
                    avgConsumptionKmPerLiter: 11.0,
                    avgFuelPrice: 5.89,
                    costMode: 'auto',
                    monthlyFixedCosts: {
                      financingOrRental: 1200,
                      insurance: 250,
                      ipvaAndLicensing: 150,
                      washing: 100,
                      other: 50,
                    },
                    perKmVariableCosts: {
                      maintenancePerKm: 0.12,
                      tiresPerKm: 0.08,
                      depreciationPerKm: 0.15,
                    },
                    estimatedMonthlyHours: 180,
                    isActive: false,
                  });
                  showSaved();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/[0.08] flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> <span>Adicionar</span>
              </button>
            </div>

            {/* Vehicle Selection Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {vehicleProfiles.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    setActiveVehicleProfile(v.id);
                    showSaved();
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-2 whitespace-nowrap ${
                    v.isActive
                      ? 'bg-white/[0.1] text-white border-white/[0.2]'
                      : 'bg-black/30 text-slate-400 border-white/[0.06] hover:text-white'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>{v.name}</span>
                  {v.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>

            {/* Edit Active Vehicle Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-white/[0.06]">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Nome do modelo / veículo
                </label>
                <input
                  type="text"
                  value={activeVehicleProfile.name}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, { name: e.target.value });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Tipo de combustível
                </label>
                <select
                  value={activeVehicleProfile.fuelType}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      fuelType: e.target.value as FuelType,
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/[0.2]"
                >
                  <option value="Gasolina">Gasolina</option>
                  <option value="Etanol">Etanol</option>
                  <option value="GNV">GNV</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Eletricidade">Eletricidade (EV)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Consumo médio (km/l ou km/kWh)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={activeVehicleProfile.avgConsumptionKmPerLiter}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      avgConsumptionKmPerLiter: parseFloat(e.target.value) || 1,
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Preço médio do combustível (R$)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={activeVehicleProfile.avgFuelPrice}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      avgFuelPrice: parseFloat(e.target.value) || 0,
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Parcela / Aluguel mensal (R$)
                </label>
                <input
                  type="number"
                  step="50"
                  value={activeVehicleProfile.monthlyFixedCosts.financingOrRental}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      monthlyFixedCosts: {
                        ...activeVehicleProfile.monthlyFixedCosts,
                        financingOrRental: parseFloat(e.target.value) || 0,
                      },
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Seguro mensal (R$)
                </label>
                <input
                  type="number"
                  step="20"
                  value={activeVehicleProfile.monthlyFixedCosts.insurance}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      monthlyFixedCosts: {
                        ...activeVehicleProfile.monthlyFixedCosts,
                        insurance: parseFloat(e.target.value) || 0,
                      },
                    });
                    showSaved();
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Manutenção por km (R$/km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={activeVehicleProfile.perKmVariableCosts.maintenancePerKm}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      perKmVariableCosts: {
                        ...activeVehicleProfile.perKmVariableCosts,
                        maintenancePerKm: parseFloat(e.target.value) || 0,
                      },
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Desgaste de pneus (R$/km)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={activeVehicleProfile.perKmVariableCosts.tiresPerKm}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      perKmVariableCosts: {
                        ...activeVehicleProfile.perKmVariableCosts,
                        tiresPerKm: parseFloat(e.target.value) || 0,
                      },
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Horas mensais estimadas
                </label>
                <input
                  type="number"
                  step="10"
                  value={activeVehicleProfile.estimatedMonthlyHours}
                  onChange={(e) => {
                    updateVehicleProfile(activeVehicleProfile.id, {
                      estimatedMonthlyHours: parseInt(e.target.value) || 160,
                    });
                    showSaved();
                  }}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-mono-num focus:outline-none focus:border-white/[0.2]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OVERLAY & NOTIFICATIONS */}
      {activeTab === 'overlay' && (
        <div className="space-y-4">
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Overlay flutuante multitarefa</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Avalia corridas em tempo real sobre a tela da Uber, 99 ou Google Maps.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Ativar overlay flutuante</span>
                  <span className="text-[11px] text-slate-400">
                    Exibe a pílula / card avaliador flutuante sobre a tela
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={overlayPref.isEnabled}
                  onChange={(e) => {
                    updateOverlayPref({ isEnabled: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Exibir apenas durante jornada ativa</span>
                  <span className="text-[11px] text-slate-400">
                    Oculta a bolha flutuante automaticamente quando não houver turno em andamento
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={overlayPref.showDuringJourneyOnly}
                  onChange={(e) => {
                    updateOverlayPref({ showDuringJourneyOnly: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Alertas sonoros automáticos</span>
                  <span className="text-[11px] text-slate-400">
                    Sinal discreto para notas altas e aviso para corridas ruins
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={overlayPref.enableSoundAlerts}
                  onChange={(e) => {
                    updateOverlayPref({ enableSoundAlerts: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Narração por voz das chamadas</span>
                  <span className="text-[11px] text-slate-400">
                    Sintetiza nota, faturamento e lucro estimado sem precisar olhar para a tela
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={overlayPref.enableVoiceAlerts}
                  onChange={(e) => {
                    updateOverlayPref({ enableVoiceAlerts: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Permissão de sobreposição no sistema</span>
                  <span className="text-[11px] text-slate-400">
                    {hasOverlayPermission
                      ? 'Permissão concedida: O overlay pode flutuar sobre Uber, 99 e Waze'
                      : 'Permissão pendente para flutuar sobre outros apps no aparelho'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOverlayPermissionModalOpen(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    hasOverlayPermission
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {hasOverlayPermission ? 'Permissão Ativa' : 'Configurar Permissão'}
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Modo fallback iOS</span>
                  <span className="text-[11px] text-slate-400">
                    Alternativa para iOS onde janelas flutuantes nativas não são permitidas
                  </span>
                </div>
                <select
                  value={overlayPref.iosFallbackMode}
                  onChange={(e) => {
                    updateOverlayPref({
                      iosFallbackMode: e.target.value as any,
                    });
                    showSaved();
                  }}
                  className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/[0.2]"
                >
                  <option value="live_activity">Live Activity / Dynamic Island</option>
                  <option value="pip">Widget Picture-in-Picture (PiP)</option>
                  <option value="compact_bar">Barra compacta</option>
                  <option value="widget">Widget da central</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Posição de ancoragem</span>
                  <span className="text-[11px] text-slate-400">
                    Canto da tela onde a pílula do copiloto fica ancorada
                  </span>
                </div>
                <select
                  value={overlayPref.dockPosition}
                  onChange={(e) => {
                    updateOverlayPref({
                      dockPosition: e.target.value as any,
                    });
                    showSaved();
                  }}
                  className="bg-black/40 border border-white/[0.08] rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none focus:border-white/[0.2]"
                >
                  <option value="top-right">Superior direito</option>
                  <option value="top-left">Superior esquerdo</option>
                  <option value="bottom-right">Inferior direito</option>
                  <option value="bottom-left">Inferior esquerdo</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DRIVING SAFE MODE */}
      {activeTab === 'driving' && (
        <div className="space-y-4">
          <div className="bg-[#0C0C0D] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Modo direção segura</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Alto contraste e fontes ampliadas para decisões rápidas no suporte veicular.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Fontes ampliadas e alto contraste</span>
                  <span className="text-[11px] text-slate-400">
                    Visibilidade a mais de 1 metro de distância no suporte
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={drivingMode.hugeFonts}
                  onChange={(e) => {
                    updateDrivingMode({ hugeFonts: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Narração por voz automática</span>
                  <span className="text-[11px] text-slate-400">
                    O copiloto sintetiza: "Nota 88. Excelente. Lucro de R$ 22,00."
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={drivingMode.voiceAlerts}
                  onChange={(e) => {
                    updateDrivingMode({ voiceAlerts: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.04]">
                <div>
                  <span className="text-xs font-medium text-white block">Alertas sonoros</span>
                  <span className="text-[11px] text-slate-400">
                    Feedback sonoro ao aceitar ou recusar chamadas
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={drivingMode.soundAlerts}
                  onChange={(e) => {
                    updateDrivingMode({ soundAlerts: e.target.checked });
                    showSaved();
                  }}
                  className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
