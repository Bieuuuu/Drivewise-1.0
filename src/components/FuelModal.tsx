import React, { useState, useEffect } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import { FuelType } from '../types';
import { X, Fuel } from 'lucide-react';

const FUEL_TYPES: FuelType[] = ['Gasolina', 'Etanol', 'GNV', 'Diesel', 'Eletricidade'];

export const FuelModal: React.FC = () => {
  const { isFuelModalOpen, setIsFuelModalOpen, addFuelEntry, currentDateStr, user, fuelEntries } =
    useDriveWise();

  const [fuelType, setFuelType] = useState<FuelType>(user.fuelType || 'Gasolina');
  const [entryDate, setEntryDate] = useState(currentDateStr);
  const [totalCost, setTotalCost] = useState('');
  const [pricePerLiter, setPricePerLiter] = useState(user.avgFuelPrice?.toString() || '5.89');
  const [liters, setLiters] = useState('');
  
  const latestOdo = fuelEntries && fuelEntries.length > 0
    ? Math.max(...fuelEntries.map((f) => f.odometer))
    : 48320;
  const [odometer, setOdometer] = useState(latestOdo ? (latestOdo + 150).toString() : '48320');
  const [stationName, setStationName] = useState('');

  // Auto-calculate liters when totalCost or pricePerLiter changes
  useEffect(() => {
    const cost = parseFloat(totalCost.replace(',', '.'));
    const price = parseFloat(pricePerLiter.replace(',', '.'));
    if (cost > 0 && price > 0) {
      setLiters((cost / price).toFixed(2));
    }
  }, [totalCost, pricePerLiter]);

  if (!isFuelModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const costVal = parseFloat(totalCost.replace(',', '.')) || 0;
    const priceVal = parseFloat(pricePerLiter.replace(',', '.')) || 5.89;
    const litersVal = parseFloat(liters.replace(',', '.')) || (costVal / priceVal);
    const odoVal = parseFloat(odometer.replace(',', '.')) || 48320;

    if (costVal <= 0) return;

    addFuelEntry({
      userId: user.email,
      date: entryDate || currentDateStr,
      fuelType,
      totalCost: costVal,
      pricePerLiter: priceVal,
      liters: litersVal,
      odometer: odoVal,
      stationName: stationName.trim() || undefined,
    });

    setIsFuelModalOpen(false);
    setTotalCost('');
    setStationName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0C0C0D] border border-white/[0.1] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Registrar Abastecimento</h3>
          </div>
          <button
            onClick={() => setIsFuelModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Tipo de Combustível</label>
            <div className="grid grid-cols-3 gap-1.5">
              {FUEL_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setFuelType(type)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                    fuelType === type
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-black/40 text-slate-400 border border-white/[0.05]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Valor Pago + Atalhos Rápidos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Valor Abastecido (R$)</label>
              <span className="text-[11px] text-slate-400">Teclado numérico</span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-base">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                required
                autoFocus
                placeholder="100,00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.12] rounded-xl pl-11 pr-4 py-3 text-2xl font-extrabold text-white font-mono-num focus:border-amber-500 focus:outline-none tracking-tight"
              />
            </div>

            {/* Quick fuel chips */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Atalhos:
              </span>
              {[50, 100, 150, 200, 250].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => setTotalCost(quickVal.toString())}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/[0.08] text-[11px] font-semibold text-slate-300 transition-all font-mono-num"
                >
                  R$ {quickVal}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Preço / Litro (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                required
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-bold text-white font-mono-num focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Litros Calculados</label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2.5 text-sm font-bold text-amber-400 font-mono-num focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Data</label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Posto (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Ipiranga, Shell"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Odômetro Atual (km)</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white font-mono-num focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsFuelModalOpen(false)}
              className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-98 text-slate-300 font-semibold text-xs transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 transition-all"
            >
              Salvar Abastecimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
