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
  Sparkles,
  Layers,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Play,
  Settings,
  GitCompare,
  CornerUpRight,
  DollarSign,
  Flame,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useDriveWise } from '../../context/DriveWiseContext';
import { DriveWiseLogo } from '../DriveWiseLogo';
import { speakCopilotMessage, playCopilotSound } from '../../utils/copilotCalculations';
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
    triggerSimultaneousRides,
    addRideOpportunity,
    setIsSimulatorOpen,
    setIsRideAnalysisModalOpen,
    user,
    drivingMode,
    activeVehicleProfile,
    sessions,
    activeSession,
    isJourneyActive,
  } = useDriveWise();

  // Position of the bubble on screen (default anchored to top-right edge)
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
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

  // Keep bubble inside viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(16, window.innerWidth - 76);
        const maxY = Math.max(60, window.innerHeight - 130);
        return {
          x: prev.x > window.innerWidth / 2 ? maxX : 16,
          y: Math.min(Math.max(60, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!overlayPref.isEnabled) return null;

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

  // Check if bubble is in the right half of the screen
  const isDockedRight = position.x > screenWidth / 2 - 28;

  // Calculate effective render coordinates to prevent ANY clipping offscreen
  let effectiveX = position.x;
  let effectiveY = position.y;

  if (isExpanded) {
    if (isDockedRight) {
      const bubbleRight = position.x + bubbleSize;
      effectiveX = bubbleRight - cardWidth;
    }
    const maxCardX = Math.max(16, screenWidth - cardWidth - 16);
    effectiveX = Math.min(Math.max(16, effectiveX), maxCardX);
    const maxCardY = Math.max(60, screenHeight - 200);
    effectiveY = Math.min(Math.max(60, effectiveY), maxCardY);
  } else {
    const maxBubbleX = Math.max(16, screenWidth - bubbleSize - 16);
    effectiveX = Math.min(Math.max(16, effectiveX), maxBubbleX);
    const maxBubbleY = Math.max(60, screenHeight - bubbleSize - 80);
    effectiveY = Math.min(Math.max(60, effectiveY), maxBubbleY);
  }

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

    const boundedX = Math.min(Math.max(16, newX), screenWidth - currentWidth - 16);
    const boundedY = Math.min(Math.max(60, newY), screenHeight - currentHeight - 60);

    setPosition({ x: boundedX, y: boundedY });
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      if (!isExpanded) {
        const bubbleCenter = position.x + bubbleSize / 2;
        const screenMiddle = screenWidth / 2;
        const snapToRight = bubbleCenter >= screenMiddle;
        const snappedX = snapToRight
          ? Math.max(16, screenWidth - bubbleSize - 16)
          : 16;
        const boundedY = Math.min(Math.max(60, position.y), screenHeight - bubbleSize - 80);
        setPosition({ x: snappedX, y: boundedY });
      }
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

  // Quick Single Sample Ride Trigger
  const triggerSampleRide = (platform: PlatformType = 'Uber') => {
    const isUber = platform === 'Uber';
    const sampleRide: Omit<RideOpportunity, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: user.email || 'user-1',
      workSessionId: activeSession ? activeSession.id : 'ws-test',
      platform,
      status: 'received',
      offeredValue: isUber ? 38.5 : 29.8,
      finalValue: isUber ? 38.5 : 29.8,
      distanceToPassengerKm: isUber ? 1.2 : 0.8,
      estimatedTripDistanceKm: isUber ? 12.4 : 9.5,
      actualTripDistanceKm: isUber ? 12.4 : 9.5,
      estimatedTimeToPassengerMin: isUber ? 3 : 2,
      estimatedTripTimeMin: isUber ? 24 : 18,
      actualTripTimeMin: isUber ? 24 : 18,
      surgeMultiplier: isUber ? 1.2 : 1.0,
      extraCosts: 0,
      estimatedProfit: isUber ? 28.5 : 22.4,
      netProfit: isUber ? 28.5 : 22.4,
      grossPerKm: isUber ? 3.1 : 3.13,
      netPerKm: isUber ? 2.65 : 2.7,
      grossPerHour: isUber ? 96.25 : 99.3,
      netPerHour: isUber ? 82.5 : 85.0,
      deadheadPercent: isUber ? 8.8 : 7.7,
      score: isUber ? 91 : 87,
      scoreTier: 'Excelente',
      scoreReason: 'Alta rentabilidade por KM e retorno para zona com alta demanda.',
      recommendation: isUber
        ? 'Corrida de ouro! Ganho líquido de R$ 2,65/km com passageiro a 3 minutos.'
        : 'Excelente taxa horária (~R$ 85/h líquido) e busca curtíssima.',
      ruleAlerts: [],
      pickupAddress: isUber ? 'Av. Brigadeiro Faria Lima, 2232' : 'Rua Augusta, 1508',
      dropoffAddress: isUber ? 'Av. Paulista, 1578 (Masp)' : 'Aeroporto de Congonhas',
      timestamp: new Date().toISOString(),
    };

    addRideOpportunity(sampleRide);
    updateOverlayPref({ isExpanded: true });
    setIsMenuOpen(false);
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
    const screenMiddle = screenWidth / 2;
    const isRight = effectiveX + cardWidth / 2 >= screenMiddle;
    const snappedX = isRight ? Math.max(16, screenWidth - bubbleSize - 16) : 16;
    const boundedY = Math.min(Math.max(60, effectiveY), screenHeight - bubbleSize - 80);
    setPosition({ x: snappedX, y: boundedY });
  };

  // Accept current selected ride and AUTO-DISCARD competing rides
  const handleAcceptRide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentRide) return;

    const acceptedPlatform = currentRide.platform;
    acceptRideOpportunity(currentRide.id);
    playCopilotSound('good');

    // Automatically discard competing rides
    const competingRides = pendingRides.filter((r) => r.id !== currentRide.id);
    if (competingRides.length > 0) {
      competingRides.forEach((comp) => {
        rejectRideOpportunity(
          comp.id,
          `Recusada automaticamente pelo DriveWise (Aceita corrida mais lucrativa da ${acceptedPlatform})`
        );
      });
      speakCopilotMessage(
        `Chamada da ${acceptedPlatform} aceita! Concorrente recusada automaticamente para você focar no passageiro.`
      );
    } else {
      speakCopilotMessage(`Chamada da ${acceptedPlatform} aceita! Bom trajeto.`);
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
    playCopilotSound('bad');

    const remaining = pendingRides.filter((r) => r.id !== rejectedId);
    if (remaining.length > 0) {
      setSelectedRideId(remaining[0].id);
      speakCopilotMessage(`Chamada recusada. Visualizando chamada concorrente da ${remaining[0].platform}.`);
    } else {
      handleMinimize();
    }
  };

  // Complete active in-progress trip
  const handleCompleteActiveTrip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRideInProgress) {
      completeRideOpportunity(activeRideInProgress.id);
      playCopilotSound('good');
      speakCopilotMessage(
        `Viagem finalizada com sucesso! Total faturado: ${
          activeRideInProgress.finalValue || activeRideInProgress.offeredValue
        } reais. Excelente trabalho!`
      );
      handleMinimize();
    }
  };

  // Simulate in-route deviation
  const handleSimulateDeviation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRideInProgress) {
      rerouteOrUpdateRide(activeRideInProgress.id, {
        additionalKm: 3.5,
        additionalTimeMin: 7,
        priceAdjustment: 4.8,
        reason: 'Desvio por trânsito e rota recalculada',
      });
    }
  };

  // Simulate in-route price adjustment
  const handleSimulatePriceAdjustment = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRideInProgress) {
      rerouteOrUpdateRide(activeRideInProgress.id, {
        priceAdjustment: 6.5,
        reason: 'Parada excedente e tempo no trânsito',
      });
    }
  };

  // Simulate passenger cancellation
  const handleSimulatePassengerCancellation = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeRideInProgress) {
      cancelRideOpportunity(
        activeRideInProgress.id,
        'Passageiro cancelou a viagem após 5 minutos de espera',
        6.5
      );
    } else if (currentRide && currentRide.status === 'received') {
      cancelRideOpportunity(currentRide.id, 'Passageiro cancelou a chamada antes do embarque', 0);
    }
  };

  const handleVoiceSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentRide) {
      if (currentRide.status === 'accepted') {
        const text = `Corrida da ${currentRide.platform} em andamento. Destino: ${
          currentRide.dropoffAddress || 'definido no app'
        }. Faturamento atual de ${currentRide.finalValue || currentRide.offeredValue} reais.`;
        speakCopilotMessage(text);
      } else {
        const text = `Nota ${currentRide.score}. ${currentRide.scoreTier}. Plataforma ${
          currentRide.platform
        }. Faturamento de ${currentRide.offeredValue.toFixed(0)} reais. Lucro líquido de ${
          currentRide.netProfit.toFixed(0)
        } reais. ${currentRide.recommendation || ''}`;
        speakCopilotMessage(text);
      }
    }
  };

  if (!overlayPref.isEnabled) return null;
  if (overlayPref.showDuringJourneyOnly && !isJourneyActive) return null;

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

              {/* Action Buttons */}
              <div className="space-y-1.5 pt-1">
                {/* SIMULTANEOUS DISPUTE BUTTON */}
                <button
                  type="button"
                  id="btn-trigger-simultaneous-dispute"
                  onClick={() => {
                    triggerSimultaneousRides();
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-emerald-500/20 to-sky-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-400/40 text-xs font-mono font-black text-amber-300 transition-all flex items-center justify-between shadow-lg shadow-amber-500/10 group"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>⚡ Simular Uber vs 99 (Abas)</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {activeRideInProgress ? (
                  <div className="pt-1 space-y-1 border-t border-white/[0.06]">
                    <div className="text-[10px] font-mono text-sky-400 uppercase font-bold">
                      Viagem em Andamento ({activeRideInProgress.platform})
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleSimulateDeviation(e);
                        setIsMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-amber-300 flex items-center justify-between"
                    >
                      <span>Simular Desvio Rota (+3.5km)</span>
                      <CornerUpRight className="w-3 h-3 text-amber-400" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleSimulatePriceAdjustment(e);
                        setIsMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-emerald-300 flex items-center justify-between"
                    >
                      <span>Simular Reajuste (+R$ 6,50)</span>
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleSimulatePassengerCancellation(e);
                        setIsMenuOpen(false);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-[11px] font-mono text-rose-300 flex items-center justify-between"
                    >
                      <span>Simular Cancelamento Passageiro</span>
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => triggerSampleRide('Uber')}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-white/[0.06] border border-white/[0.08] text-xs font-mono font-bold text-slate-200 transition-all flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        Testar Chamada Uber
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerSampleRide('99')}
                      className="w-full py-2 px-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 text-xs font-mono font-bold text-amber-300 transition-all flex items-center justify-between group"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Testar Chamada 99
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsSimulatorOpen(true);
                    setIsMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-[11px] font-mono text-slate-300 transition-all flex items-center justify-between"
                >
                  <span>Abrir Simulador Completo</span>
                  <Settings className="w-3 h-3 text-slate-400" />
                </button>
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
                  onClick={handleVoiceSpeak}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Ouvir análise em viva-voz"
                >
                  <Volume2 className="w-4 h-4" />
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

                  {/* Real-time Lifecycle Simulation Controls */}
                  <div className="pt-1 space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      Detectores de Percurso em Tempo Real
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={handleSimulateDeviation}
                        className="py-1.5 px-2 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center justify-center gap-1"
                      >
                        <CornerUpRight className="w-3 h-3 text-amber-400" />
                        <span>Simular Desvio (+3.5km)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulatePriceAdjustment}
                        className="py-1.5 px-2 rounded-xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center justify-center gap-1"
                      >
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>Reajuste (+R$ 6,50)</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulatePassengerCancellation}
                      className="w-full py-1.5 px-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-[10px] font-mono text-rose-300 flex items-center justify-center gap-1"
                    >
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>Simular Passageiro Cancelou (Taxa R$ 6,50)</span>
                    </button>
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
