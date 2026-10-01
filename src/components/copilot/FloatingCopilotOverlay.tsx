import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Navigation,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Play,
  Settings,
  GitCompare,
  DollarSign,
  Flame,
  Check,
  RotateCcw,
  Zap,
  Sparkles,
  CornerUpRight,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { speakCopilotMessage, playCopilotSound } from '../../utils/copilotCalculations';
import { isNativeAndroid } from '../../services/nativeBridge';
import { RideOpportunity, PlatformType } from '../../types';

// Score visual styling helper
const getScoreColor = (tier: string) => {
  switch (tier) {
    case 'Excelente':
      return {
        pill: 'bg-emerald-400 text-slate-950 font-black',
        border: 'border-emerald-500/40',
        bg: 'from-emerald-950/80 to-[#0A0D12]',
        text: 'text-emerald-400',
      };
    case 'Boa':
      return {
        pill: 'bg-amber-400 text-slate-950 font-black',
        border: 'border-amber-500/40',
        bg: 'from-amber-950/80 to-[#0A0D12]',
        text: 'text-amber-400',
      };
    case 'Regular':
      return {
        pill: 'bg-orange-400 text-slate-950 font-black',
        border: 'border-orange-500/40',
        bg: 'from-orange-950/80 to-[#0A0D12]',
        text: 'text-orange-400',
      };
    default:
      return {
        pill: 'bg-rose-400 text-slate-950 font-black',
        border: 'border-rose-500/40',
        bg: 'from-rose-950/80 to-[#0A0D12]',
        text: 'text-rose-400',
      };
  }
};

export const FloatingCopilotOverlay: React.FC = () => {
  const {
    overlayPref,
    updateOverlayPref,
    toggleOverlay,
    rides,
    lastAnalyzedRide,
    setLastAnalyzedRide,
    acceptRideOpportunity,
    rejectRideOpportunity,
    completeRideOpportunity,
    cancelRideOpportunity,
    rerouteOrUpdateRide,
    setIsRideAnalysisModalOpen,
    setIsSimulatorOpen,
    isNativeOverlayRunning,
    user,
    drivingMode,
    activeVehicleProfile,
    sessions,
    activeSession,
    isJourneyActive,
  } = useDriveWise();

  // Position of the overlay on screen (stored in localStorage so it stays wherever the user leaves it)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('drivewise_overlay_pos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return {
              x: Math.min(Math.max(8, parsed.x), window.innerWidth - 64),
              y: Math.min(Math.max(40, parsed.y), window.innerHeight - 80),
            };
          }
        }
      } catch {}
      return { x: Math.max(16, window.innerWidth - 76), y: 150 };
    }
    return { x: 300, y: 150 };
  });

  // Adjust position when overlayPref.dockPosition changes
  useEffect(() => {
    if (isDragging) return;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 390;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 844;
    const rightX = Math.max(16, screenW - 76);
    const leftX = 16;
    const topY = 120;
    const bottomY = Math.max(60, screenH - 180);

    switch (overlayPref.dockPosition) {
      case 'top-left':
        setPosition({ x: leftX, y: topY });
        break;
      case 'top-right':
        setPosition({ x: rightX, y: topY });
        break;
      case 'bottom-left':
        setPosition({ x: leftX, y: bottomY });
        break;
      case 'bottom-right':
        setPosition({ x: rightX, y: bottomY });
        break;
      default:
        break;
    }
  }, [overlayPref.dockPosition]);

  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dragMoved, setDragMoved] = useState(false);

  // Filter incoming pending rides and active accepted ride
  const pendingRides = rides.filter((r) => r.status === 'received');
  const activeRideInProgress = rides.find((r) => r.status === 'accepted');

  // Currently selected ride tab in the overlay
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  // Synchronize selected tab whenever pending or active rides change
  useEffect(() => {
    if (pendingRides.length > 0) {
      if (!selectedRideId || !pendingRides.some((r) => r.id === selectedRideId)) {
        // Prioritize the ride with highest score
        const sorted = [...pendingRides].sort((a, b) => b.score - a.score);
        setSelectedRideId(sorted[0].id);
      }
      if (!overlayPref.isExpanded) {
        updateOverlayPref({ isExpanded: true });
      }
    } else if (activeRideInProgress) {
      setSelectedRideId(activeRideInProgress.id);
    }
  }, [pendingRides.map((r) => r.id).join(','), activeRideInProgress?.id, overlayPref.isExpanded]);

  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  const bubbleSize = 56; // w-14 h-14
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 390;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 844;
  const cardWidth = Math.min(360, screenWidth - 32);

  // Determine active ride to render
  const currentRide =
    pendingRides.find((r) => r.id === selectedRideId) ||
    activeRideInProgress ||
    (pendingRides.length > 0 ? pendingRides[0] : lastAnalyzedRide);

  const colors = currentRide ? getScoreColor(currentRide.scoreTier) : null;
  const isExpanded = Boolean(overlayPref.isExpanded && currentRide && colors);

  // Keep overlay inside viewport on window resize without resetting position
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(8, window.innerWidth - (isExpanded ? cardWidth : bubbleSize) - 8);
        const maxY = Math.max(40, window.innerHeight - (isExpanded ? 420 : bubbleSize) - 40);
        return {
          x: Math.min(Math.max(8, prev.x), maxX),
          y: Math.min(Math.max(40, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded, cardWidth, bubbleSize]);

  // Check if bubble is in the right half of the screen
  const isDockedRight = position.x > screenWidth / 2 - 28;

  // Calculate effective render coordinates ensuring it stays exactly where positioned
  const maxW = isExpanded ? cardWidth : bubbleSize;
  const maxH = isExpanded ? 420 : bubbleSize;
  const effectiveX = Math.min(Math.max(8, position.x), screenWidth - maxW - 8);
  const effectiveY = Math.min(Math.max(40, position.y), screenHeight - maxH - 40);

  // Multi-ride calculation helper (Uber vs 99 dispute comparison)
  const sortedPending = [...pendingRides].sort((a, b) => b.score - a.score);
  const bestRide = sortedPending[0];
  const secondRide = sortedPending[1];
  const profitDiff =
    bestRide && secondRide ? Math.max(0, bestRide.netProfit - secondRide.netProfit) : 0;
  const netKmDiff =
    bestRide && secondRide ? Math.max(0, bestRide.netPerKm - secondRide.netPerKm) : 0;

  // --- Drag and Drop Handlers (Mouse & Touch) ---
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setDragMoved(false);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: effectiveX,
      initialY: effectiveY,
    };
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      setDragMoved(true);
    }

    const newX = dragStartRef.current.initialX + deltaX;
    const newY = dragStartRef.current.initialY + deltaY;

    const currentWidth = isExpanded ? cardWidth : bubbleSize;
    const currentHeight = isExpanded ? 420 : bubbleSize;

    const boundedX = Math.min(Math.max(8, newX), screenWidth - currentWidth - 8);
    const boundedY = Math.min(Math.max(40, newY), screenHeight - currentHeight - 40);

    setPosition({ x: boundedX, y: boundedY });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Persist exact position in localStorage so it stays wherever the user leaves it
      try {
        localStorage.setItem('drivewise_overlay_pos', JSON.stringify(position));
      } catch {}
    }
  };

  // Mouse Listeners
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    handlePointerDown(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handlePointerMove(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      handlePointerUp();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Touch Listeners
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    handlePointerDown(touch.clientX, touch.clientY);

    const onTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const t = moveEvent.touches[0];
      handlePointerMove(t.clientX, t.clientY);
    };

    const onTouchEnd = () => {
      handlePointerUp();
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleBubbleClick = (e: React.MouseEvent) => {
    if (dragMoved) return;

    if (currentRide) {
      updateOverlayPref({ isExpanded: true });
    } else {
      setIsMenuOpen((prev) => !prev);
    }
  };

  const handleMinimize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    updateOverlayPref({ isExpanded: false });
    setPosition((prev) => ({
      x: Math.min(Math.max(8, prev.x), screenWidth - bubbleSize - 8),
      y: Math.min(Math.max(40, prev.y), screenHeight - bubbleSize - 40),
    }));
  };

  // Accept current selected ride and AUTO-DISCARD competing rides
  const handleAcceptRide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRide) return;

    const acceptedPlatform = currentRide.platform;
    acceptRideOpportunity(currentRide.id);
    if (overlayPref.enableSoundAlerts) {
      playCopilotSound('good');
    }

    // Automatically discard competing rides
    const competingRides = pendingRides.filter((r) => r.id !== currentRide.id);
    if (competingRides.length > 0) {
      competingRides.forEach((comp) => {
        rejectRideOpportunity(
          comp.id,
          `Recusada automaticamente pelo DriveWise (Aceita corrida mais lucrativa da ${acceptedPlatform})`
        );
      });
      if (overlayPref.enableVoiceAlerts) {
        speakCopilotMessage(`${acceptedPlatform} aceita.`);
      }
    } else {
      if (overlayPref.enableVoiceAlerts) {
        speakCopilotMessage(`${acceptedPlatform} aceita.`);
      }
    }

    // Keep overlay open so driver monitors trip telemetry
    updateOverlayPref({ isExpanded: true });
  };

  // Reject current ride
  const handleRejectRide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRide) return;

    const rejectedId = currentRide.id;
    rejectRideOpportunity(rejectedId, 'Recusada pelo motorista');
    if (overlayPref.enableSoundAlerts) {
      playCopilotSound('bad');
    }

    const remaining = pendingRides.filter((r) => r.id !== rejectedId);
    if (remaining.length > 0) {
      setSelectedRideId(remaining[0].id);
      if (overlayPref.enableVoiceAlerts) {
        speakCopilotMessage(`Recusada. Visualizando ${remaining[0].platform}.`);
      }
    } else {
      handleMinimize();
    }
  };

  // Complete active in-progress trip
  const handleCompleteActiveTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRideInProgress) {
      completeRideOpportunity(activeRideInProgress.id);
      if (overlayPref.enableSoundAlerts) {
        playCopilotSound('good');
      }
      if (overlayPref.enableVoiceAlerts) {
        const val = Math.round(activeRideInProgress.finalValue || activeRideInProgress.offeredValue || 0);
        speakCopilotMessage(`Viagem finalizada. R$ ${val}.`);
      }
      handleMinimize();
    }
  };

  // Toggle voice mute on/off directly from overlay header
  const handleToggleVoiceMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newMuteState = !overlayPref.enableVoiceAlerts;
    updateOverlayPref({ enableVoiceAlerts: newMuteState });
    if (newMuteState && currentRide) {
      const net = Math.round(currentRide.netProfit || 0);
      speakCopilotMessage(`${currentRide.platform}. Nota ${currentRide.score}. Lucro ${net} reais.`);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const handleVoiceSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentRide) {
      if (currentRide.status === 'accepted') {
        const val = Math.round(currentRide.finalValue || currentRide.offeredValue || 0);
        speakCopilotMessage(`${currentRide.platform}. Em andamento. R$ ${val}.`);
      } else {
        const net = Math.round(currentRide.netProfit || 0);
        speakCopilotMessage(`${currentRide.platform}. Nota ${currentRide.score}. Lucro ${net} reais.`);
      }
    }
  };

  if (!overlayPref.isEnabled) return null;
  if (overlayPref.showDuringJourneyOnly && !isJourneyActive) return null;
  // On native Android, when the real system WindowManager overlay is running and no expanded card is open in-app, avoid duplicate floating bubbles
  if (isNativeAndroid() && isNativeOverlayRunning && !overlayPref.isExpanded) return null;

  return (
    <div
      ref={containerRef}
      id="floating-copilot-bubble-container"
      style={{
        transform: `translate3d(${effectiveX}px, ${effectiveY}px, 0)`,
        touchAction: 'none',
      }}
      className={`fixed top-0 left-0 z-[9990] select-none ${
        isDragging
          ? 'cursor-grabbing transition-none'
          : 'cursor-grab transition-transform duration-150 ease-out'
      }`}
    >
      {/* 1. COMPACT GIGO-STYLE FLOATING CIRCLE (When minimized) */}
      {!overlayPref.isExpanded ? (
        <div className="relative group">
          {/* Main Floating Bubble */}
          <div
            id="copilot-floating-circle-bubble"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
            onClick={handleBubbleClick}
            className={`w-14 h-14 rounded-full bg-[#090B10] border-2 flex items-center justify-center relative shadow-[0_8px_32px_rgba(0,0,0,0.85)] active:scale-95 transition-all duration-200 ${
              pendingRides.length > 1
                ? 'border-amber-400 shadow-[0_0_26px_rgba(251,191,36,0.8)] animate-pulse'
                : pendingRides.length === 1
                ? 'border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.7)] animate-pulse'
                : activeRideInProgress
                ? 'border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]'
                : 'border-emerald-500/50 hover:border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.3)]'
            }`}
            title="Copiloto DriveWise • Interceptador Uber & 99"
          >
            {/* Center App Logo */}
            <div className="pointer-events-none p-1.5 flex items-center justify-center">
              <DriveWiseLogo size={28} />
            </div>

            {/* Radar status dot */}
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#090B10] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
            </span>

            {/* Attached Pill notifications */}
            {pendingRides.length > 1 ? (
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-gradient-to-r from-amber-400 to-emerald-400 text-slate-950 shadow-md">
                2 DISPUTANDO
              </span>
            ) : pendingRides.length === 1 ? (
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-400 text-slate-950 shadow-md">
                NOVA
              </span>
            ) : activeRideInProgress ? (
              <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-sky-400 text-slate-950 shadow-md">
                EM ROTA
              </span>
            ) : null}
          </div>

          {/* Quick Context Menu (Opens when tapping the circle) */}
          {isMenuOpen && (
            <div
              id="copilot-bubble-menu"
              className={`absolute ${
                effectiveY > screenHeight - 280 ? 'bottom-16' : 'top-16'
              } ${
                isDockedRight ? 'right-0' : 'left-0'
              } w-72 max-w-[calc(100vw-32px)] bg-[#0C0E14] border border-white/[0.12] rounded-2xl p-3 shadow-2xl backdrop-blur-2xl animate-fadeIn space-y-2.5 z-50`}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.07]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Central Uber & 99
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-slate-300">
                O DriveWise monitora chamadas simultâneas da <strong>Uber</strong> e <strong>99</strong> lado a lado com descarte automático da pior corrida.
              </p>

              {/* Real Driver Companion Controls */}
              <div className="space-y-2 pt-1">
                {activeRideInProgress ? (
                  <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-sky-300 font-bold">
                        Viagem {activeRideInProgress.platform}
                      </span>
                      <span className="text-white font-bold">
                        R$ {activeRideInProgress.offeredValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      Destino: {activeRideInProgress.dropoffAddress || 'Em rota'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          updateOverlayPref({ isExpanded: true });
                          setIsMenuOpen(false);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] font-mono text-center"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          handleCompleteActiveTrip(e);
                          setIsMenuOpen(false);
                        }}
                        className="py-1.5 px-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 font-medium text-[11px] font-mono text-center"
                      >
                        Concluir
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Copiloto Ativo & Pronto
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Calcule o lucro líquido real de qualquer corrida ou registre uma viagem concluída no seu turno.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSimulatorOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full mt-1.5 py-2 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] font-mono flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Calcular / Lançar Corrida</span>
                    </button>
                    {lastAnalyzedRide && (
                      <button
                        type="button"
                        onClick={() => {
                          updateOverlayPref({ isExpanded: true });
                          setIsMenuOpen(false);
                        }}
                        className="w-full mt-1 py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[11px] font-mono text-slate-300 flex items-center justify-between"
                      >
                        <span>Ver última análise</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer controls */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] font-mono text-slate-400">
                <button
                  type="button"
                  onClick={() =>
                    updateOverlayPref({ enableVoiceAlerts: !overlayPref.enableVoiceAlerts })
                  }
                  className="hover:text-emerald-400 flex items-center gap-1"
                >
                  {overlayPref.enableVoiceAlerts ? (
                    <>
                      <Volume2 className="w-3 h-3 text-emerald-400" />
                      <span>Voz Ativa</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3 h-3" />
                      <span>Voz Mudo</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleOverlay}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Ocultar Copiloto
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. EXPANDED HUD CARD (Automatically pops up when ride is incoming or in route) */
        currentRide && colors && (
          <div
            id="copilot-expanded-ride-card"
            className={`w-[calc(100vw-32px)] max-w-[360px] max-h-[88vh] rounded-3xl bg-[#0B0D13] border ${colors.border} shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden animate-fadeIn flex flex-col`}
          >
            {/* 2.1 SIMULTANEOUS RIDES TABS (When both Uber and 99 are ringing at the same time) */}
            {pendingRides.length > 1 && (
              <div className="px-3 pt-2.5 pb-2 bg-[#07090E] border-b border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-amber-300 uppercase">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Chamadas Simultâneas ({pendingRides.length})
                  </span>
                  <span className="text-[9px] text-slate-400">Escolha sem trocar de app</span>
                </div>

                {/* Tabs selector */}
                <div className="grid grid-cols-2 gap-1.5">
                  {pendingRides.map((pRide) => {
                    const isSelected = pRide.id === currentRide?.id;
                    const isWinner = pRide.id === bestRide?.id;
                    const pColors = getScoreColor(pRide.scoreTier);

                    return (
                      <button
                        key={pRide.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRideId(pRide.id);
                        }}
                        className={`py-2 px-2.5 rounded-xl border flex items-center justify-between transition-all text-left ${
                          isSelected
                            ? `bg-white/[0.1] ${pColors.border} ring-1 ring-white/30 shadow-md`
                            : 'bg-white/[0.02] border-white/[0.06] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              pRide.platform === 'Uber' ? 'bg-white' : 'bg-amber-400'
                            }`}
                          />
                          <div className="truncate">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-mono font-bold text-white uppercase">
                                {pRide.platform}
                              </span>
                              {isWinner && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-mono font-black bg-emerald-400 text-slate-950">
                                  +LUCRO
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-300 font-semibold block">
                              R$ {pRide.offeredValue.toFixed(0)}
                            </span>
                          </div>
                        </div>
                        <div
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black shrink-0 ${pColors.pill}`}
                        >
                          {pRide.score}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Smart Direct Comparative Banner */}
                {bestRide && secondRide && (
                  <div className="px-2 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-[10px] font-mono text-emerald-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="leading-tight">
                        <strong>{bestRide.platform}</strong> rende{' '}
                        <strong>+R$ {profitDiff.toFixed(2)}</strong> líq (+R$ {netKmDiff.toFixed(2)}/km)
                      </span>
                    </div>
                    <span className="text-[8px] text-emerald-400/80 uppercase font-bold shrink-0 ml-1">
                      1-Toque Aceita
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Ambient subtle glow and Card Header */}
            <div
              className={`p-3.5 bg-gradient-to-r ${colors.bg} border-b border-white/[0.08] flex items-center justify-between`}
            >
              {/* Drag Handle & Platform Identifier */}
              <div
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                className="flex items-center gap-2 cursor-grab flex-1"
                title="Arraste para mover o card"
              >
                <div className="w-6 h-6 rounded-lg bg-black border border-white/[0.1] flex items-center justify-center p-1 shadow">
                  <DriveWiseLogo size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      {currentRide.platform}
                    </span>
                    {currentRide.status === 'accepted' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                        Em Rota
                      </span>
                    ) : currentRide.status === 'canceled' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Cancelada
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                        Chamada Ativa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Header */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleVoiceMute}
                  className={`p-1.5 rounded-lg transition-colors ${
                    overlayPref.enableVoiceAlerts
                      ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                      : 'text-slate-500 hover:text-slate-400 hover:bg-white/[0.08]'
                  }`}
                  title={overlayPref.enableVoiceAlerts ? 'Voz ativada (clique para silenciar)' : 'Voz silenciada (clique para ativar)'}
                >
                  {overlayPref.enableVoiceAlerts ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleMinimize}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Minimizar para bolha flutuante"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleMinimize}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Fechar card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Core Decision Telemetry */}
            <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(88vh-65px)] overscroll-contain">
              {/* 2.2 If the ride was canceled */}
              {currentRide.status === 'canceled' ? (
                <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Corrida Cancelada pelo Passageiro</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {currentRide.cancellationReason || 'O passageiro cancelou antes do embarque.'}
                  </p>
                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-slate-400">Taxa de Cancelamento:</span>
                    <span className="text-xs font-mono font-black text-emerald-400">
                      R$ {(currentRide.cancellationFee || 0).toFixed(2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleMinimize}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-slate-200"
                  >
                    Voltar ao Radar Livre
                  </button>
                </div>
              ) : currentRide.status === 'accepted' ? (
                /* 2.3 Trip In-Progress Mode (Monitoring route changes, price updates, deviations) */
                <div className="space-y-3">
                  {/* Financial tracker in progress */}
                  <div className="flex items-center justify-between bg-[#12151D] p-3 rounded-2xl border border-white/[0.06]">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Faturamento Atual
                      </span>
                      <span className="text-xl font-mono font-black text-white">
                        R$ {(currentRide.finalValue ?? currentRide.offeredValue).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Lucro Projetado
                      </span>
                      <span className="text-sm font-mono font-black text-emerald-400">
                        + R$ {currentRide.netProfit.toFixed(2)} líq
                      </span>
                    </div>
                  </div>

                  {/* Route Deviation Alert (if detected) */}
                  {currentRide.routeDeviationKm && currentRide.routeDeviationKm > 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2">
                      <CornerUpRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-200">
                        <span className="font-bold block">Desvio de Rota Detectado (+{currentRide.routeDeviationKm.toFixed(1)} km)</span>
                        <span className="text-slate-300 text-[10px] block">
                          Consumo de combustível e tempo ajustados na contabilidade do DriveWise.
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Price Adjustment Alert (if updated live) */}
                  {currentRide.priceAdjustment !== undefined && currentRide.priceAdjustment !== 0 ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-emerald-200">
                        <span className="font-bold block">
                          Tarifa Reajustada pela {currentRide.platform} (+R$ {currentRide.priceAdjustment.toFixed(2)})
                        </span>
                        <span className="text-slate-300 text-[10px] block">
                          {currentRide.priceAdjustmentReason || 'Tempo de parada excedente e trânsito'}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {/* Addresses */}
                  <div className="space-y-1.5 text-[11px] text-slate-300 bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Origem:</span>
                      <span className="truncate text-slate-200">{currentRide.pickupAddress || 'Local de Embarque'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Destino:</span>
                      <span className="truncate text-slate-200">{currentRide.dropoffAddress || 'Destino do Passageiro'}</span>
                    </div>
                  </div>

                  {/* Primary Complete Ride Action */}
                  <button
                    type="button"
                    id="btn-complete-active-ride"
                    onClick={handleCompleteActiveTrip}
                    className="w-full py-3 px-3 rounded-2xl bg-sky-400 hover:bg-sky-300 active:scale-95 text-slate-950 font-mono font-black text-xs transition-all shadow-lg shadow-sky-400/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Viagem com Sucesso</span>
                  </button>
                </div>
              ) : (
                /* 2.4 Incoming Call Evaluation Mode (Pre-Acceptance) */
                <>
                  {/* Score & Financial Summary */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1.5 rounded-2xl text-base font-mono font-black shadow-lg ${colors.pill}`}
                      >
                        {currentRide.score}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {currentRide.scoreTier}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Índice Semafórico
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-extrabold text-white tracking-tight">
                        R$ {currentRide.offeredValue.toFixed(2)}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        + R$ {currentRide.netProfit.toFixed(2)} líquido
                      </div>
                    </div>
                  </div>

                  {/* Rentabilidade Técnica Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[#12151D] p-2.5 rounded-2xl border border-white/[0.06] text-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">R$/KM Líq</span>
                      <span className="text-xs font-mono font-bold text-white">
                        R$ {currentRide.netPerKm.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">R$/Hora</span>
                      <span className="text-xs font-mono font-bold text-white">
                        R$ {currentRide.netPerHour.toFixed(0)}/h
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-slate-400 uppercase block">Busca</span>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {currentRide.distanceToPassengerKm} km
                      </span>
                    </div>
                  </div>

                  {/* Addresses / Context */}
                  <div className="space-y-1 text-[11px] text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Busca:</span>
                      <span className="truncate text-slate-200">
                        {currentRide.pickupAddress || 'Endereço próximo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="text-slate-400 shrink-0">Destino:</span>
                      <span className="truncate text-slate-200">
                        {currentRide.dropoffAddress || 'Região central'}
                      </span>
                    </div>
                  </div>

                  {/* Recommendation Quote */}
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-300 italic">
                    "{currentRide.recommendation || currentRide.scoreReason}"
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      id="btn-overlay-reject-action"
                      onClick={handleRejectRide}
                      className="py-3 px-3 rounded-2xl bg-white/[0.05] hover:bg-rose-500/20 active:scale-95 border border-white/[0.08] hover:border-rose-500/40 text-rose-400 font-mono font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>

                    <button
                      type="button"
                      id="btn-overlay-accept-action"
                      onClick={handleAcceptRide}
                      className="py-3 px-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-slate-950 font-mono font-black text-xs transition-all shadow-[0_4px_20px_rgba(52,211,153,0.3)] flex flex-col items-center justify-center"
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aceitar {currentRide.platform}</span>
                      </div>
                      {pendingRides.length > 1 && (
                        <span className="text-[9px] font-sans font-normal opacity-85">
                          Descarta concorrente
                        </span>
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* Footer link to detailed view */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono text-slate-400">
                <button
                  type="button"
                  onClick={() => setIsRideAnalysisModalOpen(true)}
                  className="hover:text-emerald-400 transition-colors"
                >
                  Ver telemetria completa →
                </button>
                <span>Toque e arraste para mover</span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
