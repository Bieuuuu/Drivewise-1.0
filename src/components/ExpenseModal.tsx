import React, { useState } from 'react';
import { useDriveWise } from '../context/DriveWiseContext';
import { ExpenseCategory } from '../types';
import { X, PlusCircle } from 'lucide-react';

const CATEGORIES: ExpenseCategory[] = [
  'Combustível',
  'Pedágio',
  'Estacionamento',
  'Lavagem',
  'Alimentação',
  'Manutenção',
  'Energia elétrica',
  'Seguro',
  'Aluguel do carro',
  'Financiamento',
  'Outros',
];

export const ExpenseModal: React.FC = () => {
  const { isExpenseModalOpen, setIsExpenseModalOpen, addExpense, currentDateStr, user } =
    useDriveWise();

  const [category, setCategory] = useState<ExpenseCategory>('Combustível');
  const [expenseDate, setExpenseDate] = useState(currentDateStr);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [odometer, setOdometer] = useState('');

  if (!isExpenseModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amount.replace(',', '.')) || 0;
    if (amountVal <= 0) return;

    addExpense({
      userId: user.email,
      date: expenseDate || currentDateStr,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      category,
      amount: amountVal,
      notes: notes.trim() || undefined,
      odometer: odometer ? parseFloat(odometer) : undefined,
    });

    setIsExpenseModalOpen(false);
    setAmount('');
    setNotes('');
    setOdometer('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0C0C0D] border border-white/[0.1] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-rose-400" />
            <h3 className="text-base font-bold text-white">Registrar Custo</h3>
          </div>
          <button
            onClick={() => setIsExpenseModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Quick Categories Pills & Complete Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold block">
                Categoria da Despesa
              </label>
              <span className="text-[11px] text-rose-400 font-mono font-medium">
                {category}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {(['Alimentação', 'Combustível', 'Pedágio', 'Lavagem', 'Estacionamento', 'Outros'] as ExpenseCategory[]).map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-medium transition-all text-center border ${
                      category === cat
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold shadow-sm'
                        : 'bg-[#000000] text-slate-400 border-white/[0.08] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
            <div className="pt-0.5">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                aria-label="Selecionar categoria completa"
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-slate-300 text-xs focus:border-rose-500 focus:outline-none transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount with inputMode="decimal" and Quick Chips */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-slate-300 font-semibold">Valor da Despesa</label>
              <span className="text-[11px] text-slate-400">Teclado numérico direto</span>
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
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.12] rounded-xl pl-11 pr-4 py-3 text-2xl font-extrabold text-white font-mono-num focus:border-rose-500 focus:outline-none tracking-tight"
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Atalhos:
              </span>
              {[10, 15, 25, 50].map((quickVal) => (
                <button
                  key={quickVal}
                  type="button"
                  onClick={() => setAmount(quickVal.toString())}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/[0.08] text-[11px] font-semibold text-slate-300 transition-all font-mono-num"
                >
                  R$ {quickVal}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Data</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono-num focus:border-rose-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Almoço, pedágio"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#000000] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="flex-1 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-98 text-slate-300 font-semibold text-xs transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 active:scale-98 text-white font-extrabold text-xs shadow-lg shadow-rose-950/40 transition-all"
            >
              Salvar Despesa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
