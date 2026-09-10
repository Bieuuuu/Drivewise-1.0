import {
  DecisionRule,
  RideOpportunity,
  ScoreTier,
  VehicleCostProfile,
  PlatformType,
  DecisionAnalytics,
} from '../types';

/**
 * Calculates vehicle running costs per km and per hour based on profile
 */
export function calculateVehicleCosts(profile: VehicleCostProfile): {
  costPerKm: number;
  costPerHour: number;
  fuelCostPerKm: number;
} {
  if (profile.costMode === 'manual' && profile.manualCostPerKm !== undefined && profile.manualCostPerHour !== undefined) {
    return {
      costPerKm: profile.manualCostPerKm,
      costPerHour: profile.manualCostPerHour,
      fuelCostPerKm: profile.manualCostPerKm * 0.6,
    };
  }

  // Auto calculation:
  // Fuel cost per km = fuel price / km per liter
  const fuelCostPerKm = profile.avgConsumptionKmPerLiter > 0
    ? profile.avgFuelPrice / profile.avgConsumptionKmPerLiter
    : 0.51;

  const variableCostPerKm =
    fuelCostPerKm +
    (profile.perKmVariableCosts.maintenancePerKm || 0.12) +
    (profile.perKmVariableCosts.tiresPerKm || 0.08) +
    (profile.perKmVariableCosts.depreciationPerKm || 0.15);

  const totalMonthlyFixed =
    (profile.monthlyFixedCosts.financingOrRental || 0) +
    (profile.monthlyFixedCosts.insurance || 0) +
    (profile.monthlyFixedCosts.ipvaAndLicensing || 0) +
    (profile.monthlyFixedCosts.washing || 0) +
    (profile.monthlyFixedCosts.other || 0);

  const hours = profile.estimatedMonthlyHours || 180;
  const fixedCostPerHour = hours > 0 ? totalMonthlyFixed / hours : 4.5;

  return {
    costPerKm: Number(variableCostPerKm.toFixed(2)),
    costPerHour: Number(fixedCostPerHour.toFixed(2)),
    fuelCostPerKm: Number(fuelCostPerKm.toFixed(2)),
  };
}

export interface RideEvaluationInput {
  platform: PlatformType;
  offeredValue: number;
  distanceToPassengerKm: number;
  estimatedTripDistanceKm: number;
  estimatedTimeToPassengerMin: number;
  estimatedTripTimeMin: number;
  surgeMultiplier?: number;
  extraCosts?: number;
  pickupAddress?: string;
  dropoffAddress?: string;
}

export interface EvaluatedRideResult {
  totalDistanceKm: number;
  totalTimeMin: number;
  deadheadPercent: number;
  costPerKm: number;
  costPerHour: number;
  estimatedTripCost: number;
  netRevenue: number;
  netProfit: number;
  grossPerKm: number;
  netPerKm: number;
  grossPerHour: number;
  netPerHour: number;
  score: number;
  scoreTier: ScoreTier;
  scoreReason: string;
  recommendation: string;
  ruleAlerts: string[];
}

/**
 * Core Algorithm: DRIVEWISE Ride Score (0-100) and full financial evaluation
 */
export function evaluateRideOpportunity(
  input: RideEvaluationInput,
  rules: DecisionRule,
  vehicleProfile: VehicleCostProfile,
  currentDayEarnings = 0,
  dailyGoal = 400
): EvaluatedRideResult {
  const { costPerKm, costPerHour } = calculateVehicleCosts(vehicleProfile);

  const distanceToPassenger = Math.max(0, input.distanceToPassengerKm || 0);
  const tripDistance = Math.max(0.1, input.estimatedTripDistanceKm || 0);
  const timeToPassenger = Math.max(0, input.estimatedTimeToPassengerMin || 0);
  const tripTime = Math.max(1, input.estimatedTripTimeMin || 0);
  const extraCosts = Math.max(0, input.extraCosts || 0);
  const offeredValue = Math.max(0, input.offeredValue || 0);

  // Consider return distance/time if configured
  const returnFactor = rules.considerEmptyReturn ? (rules.emptyReturnPercent || 50) / 100 : 0;
  const returnDistanceKm = tripDistance * returnFactor;
  const returnTimeMin = tripTime * returnFactor;

  const totalDistanceKm = distanceToPassenger + tripDistance + returnDistanceKm;
  const totalTimeMin = timeToPassenger + tripTime + returnTimeMin;

  // Deadhead percentage: deadhead displacement / (deadhead + trip distance)
  const deadheadPercent =
    totalDistanceKm > 0 ? (distanceToPassenger / (distanceToPassenger + tripDistance)) * 100 : 0;

  // Costs
  const variableCost = totalDistanceKm * costPerKm;
  const timeCost = (totalTimeMin / 60) * costPerHour;
  const estimatedTripCost = variableCost + timeCost + extraCosts;

  const netRevenue = offeredValue - extraCosts;
  const netProfit = netRevenue - estimatedTripCost;

  // Rates
  const grossPerKm = totalDistanceKm > 0 ? offeredValue / totalDistanceKm : 0;
  const netPerKm = totalDistanceKm > 0 ? netProfit / totalDistanceKm : 0;
  const grossPerHour = totalTimeMin > 0 ? (offeredValue / totalTimeMin) * 60 : 0;
  const netPerHour = totalTimeMin > 0 ? (netProfit / totalTimeMin) * 60 : 0;

  // ----------------------------------------------------------------
  // Score Criteria (Total 100 points)
  // 1. Net R$/km vs rules.minNetPerKm (30 pts)
  // 2. Net R$/h vs rules.minNetPerHour (30 pts)
  // 3. Deadhead % vs rules.maxDeadheadPercent (15 pts)
  // 4. Total ride value vs rules.minRideValue (10 pts)
  // 5. Daily goal alignment (10 pts)
  // 6. Platform & surge boost (5 pts)
  // ----------------------------------------------------------------

  // 1. Net R$/km (30 max)
  const kmRatio = rules.minNetPerKm > 0 ? netPerKm / rules.minNetPerKm : 1;
  const scoreKm = Math.min(30, Math.max(0, kmRatio * 24));

  // 2. Net R$/h (30 max)
  const hourRatio = rules.minNetPerHour > 0 ? netPerHour / rules.minNetPerHour : 1;
  const scoreHour = Math.min(30, Math.max(0, hourRatio * 24));

  // 3. Deadhead (15 max)
  let scoreDeadhead = 15;
  if (deadheadPercent > rules.maxDeadheadPercent) {
    const excess = deadheadPercent - rules.maxDeadheadPercent;
    scoreDeadhead = Math.max(0, 15 - excess * 0.5);
  }

  // 4. Minimum value (10 max)
  let scoreValue = 6;
  if (offeredValue >= rules.minRideValue * 1.5) scoreValue = 10;
  else if (offeredValue >= rules.minRideValue) scoreValue = 8;
  else if (offeredValue < rules.minRideValue * 0.7) scoreValue = 2;

  // 5. Daily Goal compatibility (10 max)
  const remainingGoal = Math.max(0, dailyGoal - currentDayEarnings);
  let scoreGoal = 7;
  if (rules.prioritizeDailyGoal && remainingGoal > 0) {
    const contributionPercent = (offeredValue / remainingGoal) * 100;
    if (contributionPercent >= 20) scoreGoal = 10;
    else if (contributionPercent >= 10) scoreGoal = 8;
  }

  // 6. Surge & Peak (5 max)
  const surge = input.surgeMultiplier || 1.0;
  let scoreSurge = 3;
  if (surge >= 1.4) scoreSurge = 5;
  else if (surge >= 1.2) scoreSurge = 4;

  const rawScore = Math.round(scoreKm + scoreHour + scoreDeadhead + scoreValue + scoreGoal + scoreSurge);
  const score = Math.max(10, Math.min(99, rawScore));

  // Determine Tier
  let scoreTier: ScoreTier = 'Baixa';
  if (score >= 80) scoreTier = 'Excelente';
  else if (score >= 65) scoreTier = 'Boa';
  else if (score >= 50) scoreTier = 'Regular';
  else scoreTier = 'Baixa';

  // Generate Rules Alerts
  const ruleAlerts: string[] = [];

  if (rules.minNetPerKm > 0 && netPerKm < rules.minNetPerKm) {
    const diffPct = Math.round(((rules.minNetPerKm - netPerKm) / rules.minNetPerKm) * 100);
    ruleAlerts.push(`Essa corrida está ${diffPct}% abaixo do seu mínimo por km (R$ ${rules.minNetPerKm.toFixed(2)}/km).`);
  } else if (netPerKm >= rules.minNetPerKm * 1.2) {
    ruleAlerts.push(`R$/km líquido ${Math.round((netPerKm / rules.minNetPerKm - 1) * 100)}% acima do seu objetivo.`);
  }

  if (distanceToPassenger > rules.maxDistanceToPassengerKm) {
    ruleAlerts.push(
      `Deslocamento até o passageiro (${distanceToPassenger.toFixed(1)} km) excede seu limite de ${rules.maxDistanceToPassengerKm} km.`
    );
  }

  if (deadheadPercent > rules.maxDeadheadPercent) {
    ruleAlerts.push(
      `O deslocamento até o passageiro representa ${deadheadPercent.toFixed(0)}% do percurso total.`
    );
  }

  if (rules.minGrossPerHour > 0 && grossPerHour >= rules.minGrossPerHour * 1.15) {
    ruleAlerts.push(`Essa corrida está bem acima da sua média de R$/hora.`);
  }

  if (rules.prioritizeDailyGoal && remainingGoal > 0) {
    const pctOfGoal = Math.min(100, Math.round(((currentDayEarnings + offeredValue) / dailyGoal) * 100));
    ruleAlerts.push(`Essa corrida ajuda você a atingir ${pctOfGoal}% da meta diária.`);
  }

  // Honest textual recommendation (following guidelines: never guarantee, use honest probabilistic phrasing)
  let recommendation = '';
  let scoreReason = '';

  if (scoreTier === 'Excelente') {
    recommendation = `Vale a pena aceitar. Lucro estimado de R$ ${netProfit.toFixed(2)}.`;
    scoreReason = `Com base nos dados informados e no seu histórico, a estimativa é de excelente retorno por km e boa rentabilidade horária.`;
  } else if (scoreTier === 'Boa') {
    recommendation = `Corrida aceitável dentro do seu padrão habitual (lucro estimado R$ ${netProfit.toFixed(2)}).`;
    scoreReason = `Com base nos custos operacionais informados, a viagem cobre os custos e gera margem positiva.`;
  } else if (scoreTier === 'Regular') {
    if (deadheadPercent > 35) {
      recommendation = `Atenção: lucro reduzido por causa do deslocamento de ${distanceToPassenger.toFixed(1)} km até o passageiro.`;
    } else {
      recommendation = `Atenção: lucro estimado baixo (R$ ${netProfit.toFixed(2)}). Avalie se o destino é favorável.`;
    }
    scoreReason = `Com base no seu custo por km (R$ ${costPerKm.toFixed(2)}/km), a margem líquida é estreita para o tempo de deslocamento.`;
  } else {
    if (netProfit <= 2) {
      recommendation = `Corrida com margem quase nula ou negativa. Considere recusar.`;
    } else if (rules.minNetPerKm > 0 && netPerKm < rules.minNetPerKm) {
      recommendation = `Corrida abaixo do seu mínimo por km. Considere recusar.`;
    } else {
      recommendation = `Apesar do valor aparente, a distância vazia e tempo reduzem muito o resultado.`;
    }
    scoreReason = `Com base no seu histórico e custos, essa viagem compromete sua rentabilidade horária.`;
  }

  return {
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    totalTimeMin: Math.round(totalTimeMin),
    deadheadPercent: Math.round(deadheadPercent),
    costPerKm,
    costPerHour,
    estimatedTripCost: Number(estimatedTripCost.toFixed(2)),
    netRevenue: Number(netRevenue.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    grossPerKm: Number(grossPerKm.toFixed(2)),
    netPerKm: Number(netPerKm.toFixed(2)),
    grossPerHour: Number(grossPerHour.toFixed(2)),
    netPerHour: Number(netPerHour.toFixed(2)),
    score,
    scoreTier,
    scoreReason,
    recommendation,
    ruleAlerts,
  };
}

/**
 * Computes decision analytics from a list of RideOpportunity
 */
export function computeDecisionAnalytics(rides: RideOpportunity[]): DecisionAnalytics {
  const analyzed = rides.length;
  const acceptedRides = rides.filter((r) => r.status === 'accepted' || r.status === 'completed');
  const rejectedRides = rides.filter((r) => r.status === 'rejected');

  const totalAccepted = acceptedRides.length;
  const totalRejected = rejectedRides.length;
  const acceptanceRate = analyzed > 0 ? Math.round((totalAccepted / analyzed) * 100) : 0;

  const avgScoreAccepted =
    totalAccepted > 0
      ? Math.round(acceptedRides.reduce((acc, r) => acc + r.score, 0) / totalAccepted)
      : 0;

  const avgScoreRejected =
    totalRejected > 0
      ? Math.round(rejectedRides.reduce((acc, r) => acc + r.score, 0) / totalRejected)
      : 0;

  const estimatedProfitAccepted = Number(
    acceptedRides.reduce((acc, r) => acc + (r.netProfit || 0), 0).toFixed(2)
  );

  // Lost profit from rejected rides that actually had good score (>= 70)
  const estimatedLostProfitRejected = Number(
    rejectedRides
      .filter((r) => r.score >= 70)
      .reduce((acc, r) => acc + (r.netProfit || 0), 0)
      .toFixed(2)
  );

  // Rejection reasons breakdown
  const reasonMap = new Map<string, number>();
  rejectedRides.forEach((r) => {
    const reason = r.decisionReason || 'Outro motivo';
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
  });

  const rejectionReasons = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: totalRejected > 0 ? Math.round((count / totalRejected) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Platform breakdown
  const platforms: PlatformType[] = ['Uber', '99', 'InDrive', 'Outros'];
  const platformComparison = platforms.map((platform) => {
    const platformRides = rides.filter((r) => r.platform === platform);
    const platAccepted = platformRides.filter((r) => r.status === 'accepted' || r.status === 'completed');
    const platCount = platformRides.length;
    const accCount = platAccepted.length;

    const avgGrossPerKm =
      platCount > 0
        ? Number((platformRides.reduce((a, b) => a + b.grossPerKm, 0) / platCount).toFixed(2))
        : 0;

    const avgNetPerKm =
      platCount > 0
        ? Number((platformRides.reduce((a, b) => a + b.netPerKm, 0) / platCount).toFixed(2))
        : 0;

    const avgGrossPerHour =
      platCount > 0
        ? Number((platformRides.reduce((a, b) => a + b.grossPerHour, 0) / platCount).toFixed(2))
        : 0;

    const avgNetPerHour =
      platCount > 0
        ? Number((platformRides.reduce((a, b) => a + b.netPerHour, 0) / platCount).toFixed(2))
        : 0;

    const avgDeadhead =
      platCount > 0
        ? Math.round(platformRides.reduce((a, b) => a + b.deadheadPercent, 0) / platCount)
        : 0;

    const avgScore =
      platCount > 0 ? Math.round(platformRides.reduce((a, b) => a + b.score, 0) / platCount) : 0;

    const totalProfit = Number(
      platAccepted.reduce((a, b) => a + (b.netProfit || 0), 0).toFixed(2)
    );

    return {
      platform,
      analyzed: platCount,
      accepted: accCount,
      acceptanceRate: platCount > 0 ? Math.round((accCount / platCount) * 100) : 0,
      avgGrossPerKm,
      avgNetPerKm,
      avgGrossPerHour,
      avgNetPerHour,
      avgDeadheadPercent: avgDeadhead,
      avgScore,
      totalProfit,
    };
  });

  // Hourly profitability
  const timeSlots = [
    { slot: '06h - 09h', minHour: 6, maxHour: 9 },
    { slot: '09h - 12h', minHour: 9, maxHour: 12 },
    { slot: '12h - 15h', minHour: 12, maxHour: 15 },
    { slot: '15h - 18h', minHour: 15, maxHour: 18 },
    { slot: '18h - 21h', minHour: 18, maxHour: 21 },
    { slot: '21h - 00h', minHour: 21, maxHour: 24 },
  ];

  const hourlyProfitability = timeSlots.map(({ slot, minHour, maxHour }) => {
    const slotRides = rides.filter((r) => {
      const hour = new Date(r.timestamp).getHours();
      return hour >= minHour && hour < maxHour;
    });

    const count = slotRides.length;
    const avgNetPerHour =
      count > 0
        ? Number((slotRides.reduce((a, b) => a + b.netPerHour, 0) / count).toFixed(2))
        : 0;

    let rating: 'alta' | 'normal' | 'baixa' = 'normal';
    if (avgNetPerHour >= 45) rating = 'alta';
    else if (avgNetPerHour < 25) rating = 'baixa';

    return {
      slot,
      avgNetPerHour,
      count,
      rating,
    };
  });

  return {
    totalAnalyzed: analyzed,
    totalAccepted,
    totalRejected,
    acceptanceRate,
    avgScoreAccepted,
    avgScoreRejected,
    estimatedProfitAccepted,
    estimatedLostProfitRejected,
    rejectionReasons,
    platformComparison,
    hourlyProfitability,
  };
}

/**
 * Sound synthesis helper for Safe Driving Mode and Copilot chimes
 */
export function playCopilotSound(type: 'good' | 'warning' | 'bad' | 'goal') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'good') {
      // Upward pleasant major chord chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.25); // G5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start(ctx.currentTime + 0.08);
      osc1.stop(ctx.currentTime + 0.35);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (type === 'bad') {
      // Low alert beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(196, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'goal') {
      // Triumphant arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.25);
      });
    }
  } catch (e) {
    // Ignore audio failures if browser restricts autoplay
  }
}

/**
 * Text-to-speech voice announcer for Safe Driving Mode
 */
export function speakCopilotMessage(text: string) {
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  } catch (e) {
    // speech synthesis fallback
  }
}
