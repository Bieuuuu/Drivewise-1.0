import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { safeStorage } from '../utils/safeStorage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DriveWise Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      safeStorage.removeItem('drivewise_user_entered_app');
    } catch {
      // ignore
    }
    window.location.href = window.location.pathname;
  };

  private handleClearAll = () => {
    try {
      safeStorage.clear();
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // ignore
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#060709] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-xl font-black text-white">DriveWise - Recuperação</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
              O aplicativo encontrou uma falha de inicialização temporária no navegador. Você pode recarregar com segurança.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-xl bg-black/50 border border-white/[0.06] text-left text-[11px] font-mono text-red-400 overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                Recarregar Início
              </button>

              <button
                type="button"
                onClick={this.handleClearAll}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold text-xs border border-white/[0.08] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Home className="w-3.5 h-3.5 text-slate-400" />
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
