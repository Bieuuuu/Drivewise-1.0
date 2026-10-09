import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CheckCircle2, XCircle, Minimize2, X } from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { speakCopilotMessage, playCopilotSound } from '../../utils/copilotCalculations';
import { isNativeAndroid } from '../../services/nativeBridge';

const getScoreColor = (tier: string) => {
  switch (tier) {
    case 'Excelente': return { pill: 'bg-emerald-400 text-slate-950', border: 'border-emerald-500/40', text: 'text-emerald-400' };
    case 'Boa': return { pill: 'bg-amber-400 text-slate-950', border: 'border-amber-500/40', text: 'text-amber-400' };
    case 'Regular': return { pill: 'bg-orange-400 text-slate-950', border: 'border-orange-500/40', text: 'text-orange-400' };
    default: return { pill: 'bg-rose-400 text-slate-950', border: 'border-rose-500/40', text: 'text-rose-400' };
  }
};

export const FloatingCopilotOverlay: React.FC = () => {
  const {
    overlayPref, updateOverlayPref, toggleOverlay, rides, acceptRideOpportunity,
    rejectRideOpportunity, isNativeOverlayRunning, drivingMode
  } = useDriveWise();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pendingRides = rides.filter((r) => r.status === 'received');
  const activeRideInProgress = rides.find((r) => r.status === 'accepted');
  const currentRide = activeRideInProgress || (pendingRides.length > 0 ? pendingRides[0] : null);
  const colors = currentRide ? getScoreColor(currentRide.scoreTier) : null;
  const isExpanded = Boolean(overlayPref.isExpanded && currentRide && colors);

  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateOverlayPref({ isExpanded: false });
  };

  const handleAcceptRide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRide) return;
    acceptRideOpportunity(currentRide.id);
    if (overlayPref.enableSoundAlerts) playCopilotSound('good');
    if (overlayPref.enableVoiceAlerts) speakCopilotMessage(`${currentRide.platform} aceita.`);
    
    // Dispara clique real no Android via JS Bridge
    if (isNativeAndroid() && (window as any).DriveWiseNativeBridge?.performAcceptRideClick) {
      (window as any).DriveWiseNativeBridge.performAcceptRideClick();
    }
  };

  const handleRejectRide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRide) return;
    rejectRideOpportunity(currentRide.id, 'Recusada pelo motorista');
    if (overlayPref.enableSoundAlerts) playCopilotSound('bad');
    
    // Dispara clique real no Android via JS Bridge
    if (isNativeAndroid() && (window as any).DriveWiseNativeBridge?.performRejectRideClick) {
      (window as any).DriveWiseNativeBridge.performRejectRideClick();
    }
  };

  if (!overlayPref.isEnabled) return null;
  if (overlayPref.showDuringJourneyOnly && !drivingMode.isActive) return null;
  if (isNativeAndroid() && isNativeOverlayRunning && !overlayPref.isExpanded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9990] select-none transition-all duration-300">
      {!overlayPref.isExpanded ? (
        <div
          onClick={() => updateOverlayPref({ isExpanded: true })}
          className="w-14 h-14 rounded-full bg-[#090B10] border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_18px_rgba(16,185,129,0.3)] cursor-pointer active:scale-95 transition-all"
        >
          <DriveWiseLogo size={28} />
        </div>
      ) : currentRide && colors ? (
        <div className={`w-80 max-w-[calc(100vw-32px)] rounded-3xl bg-[#0B0D13] border ${colors.border} shadow-2xl overflow-hidden flex flex-col`}>
          <div className="p-3 bg-gradient-to-r from-[#12151D] to-[#0B0D13] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-black border border-white/[0.1] flex items-center justify-center p-1">
                <DriveWiseLogo size={14} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-white uppercase">{currentRide.platform}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${colors.pill}`}>
                    {currentRide.scoreTier}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => updateOverlayPref({ enableVoiceAlerts: !overlayPref.enableVoiceAlerts })} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                {overlayPref.enableVoiceAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button onClick={handleMinimize} className="p-1.5 rounded-lg text-slate-400 hover:text-white"><Minimize2 className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-black text-white">R$ {currentRide.offeredValue.toFixed(2)}</span>
              <span className={`text-sm font-mono font-bold ${colors.text}`}>+ R$ {currentRide.netProfit.toFixed(2)} líq</span>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-[#12151D] p-2.5 rounded-2xl border border-white/[0.06] text-center">
              <div>
                <span className="text-[9px] font-mono text-slate-400 uppercase block">R$/KM</span>
                <span className="text-sm font-mono font-bold text-white">R$ {currentRide.netPerKm.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-400 uppercase block">R$/Hora</span>
                <span className="text-sm font-mono font-bold text-white">R$ {currentRide.netPerHour.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[9px] font-mono text-slate-400 uppercase block">Busca</span>
                <span className="text-sm font-mono font-bold text-slate-300">{currentRide.distanceToPassengerKm} km</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button onClick={handleRejectRide} className="py-3 px-3 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-rose-400 font-mono font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
                <XCircle className="w-4 h-4" /> Recusar
              </button>
              <button onClick={handleAcceptRide} className={`py-3 px-3 rounded-2xl ${colors.pill} font-mono font-black text-xs shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all`}>
                <CheckCircle2 className="w-4 h-4" /> Aceitar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
