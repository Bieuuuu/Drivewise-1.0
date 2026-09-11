export type PlatformType = 'Uber' | '99' | 'InDrive' | 'Outros';

export type ExpenseCategory =
  | 'Combustível'
  | 'Energia elétrica'
  | 'Pedágio'
  | 'Estacionamento'
  | 'Lavagem'
  | 'Manutenção'
  | 'Seguro'
  | 'Aluguel do carro'
  | 'Financiamento'
  | 'Alimentação'
  | 'Outros';

export type FuelType = 'Gasolina' | 'Etanol' | 'GNV' | 'Diesel' | 'Eletricidade';

export interface UserProfile {
  name: string;
  email: string;
  city: string;
  avatarUrl?: string;
  currency: string;
  distanceUnit: 'km' | 'mi';
  vehicleModel: string;
  vehiclePlate: string;
  vehicleYear: string;
  fuelType: FuelType;
  avgFuelPrice: number;
  avgConsumptionKmPerLiter: number;
  dailyGoal: number;
  weeklyGoal: number;
  monthlyGoal: number;
  hoursGoalWeekly: number;
  hasCompletedOnboarding?: boolean;
  notificationsEnabled: {
    nearGoal: boolean;
    peakHoursReminder: boolean;
    dailyIncomeReminder: boolean;
    aboveAverageAlert: boolean;
    monthlyGoalReached: boolean;
  };
}

export interface WorkSession {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  shiftNumber: number; // 1, 2, 3...
  startTime: string; // ISO string
  endTime?: string; // ISO string
  durationMinutes: number;
  startLocation?: string;
  endLocation?: string;
  distanceKm: number;
  manualDistanceCorrection?: number;
  income: number;
  platformEarnings: {
    Uber: number;
    '99': number;
    InDrive: number;
    Outros: number;
  };
  notes?: string;
  status: 'active' | 'completed';
  estimatedFuelCost?: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time?: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
  odometer?: number;
}

export interface FuelEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  odometer: number;
  fuelType: FuelType;
  stationName?: string;
}

export interface DailySummary {
  date: string;
  totalHours: number;
  totalIncome: number;
  totalDistanceKm: number;
  totalExpenses: number;
  netProfit: number;
  sessionsCount: number;
  hourlyRate: number;
  kmRate: number;
  goalReached: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'positive' | 'warning' | 'tip' | 'info';
  title: string;
  message: string;
  category: 'horarios' | 'ganhos' | 'custos' | 'metas';
  metric?: string;
}

export interface HourlyStat {
  timeSlot: string; // e.g. "06:00 - 09:00"
  hourKey: string;
  avgHourlyRate: number;
  totalHours: number;
  rating: 'otimo' | 'bom' | 'regular' | 'baixo';
  description: string;
}

// ==========================================
// DRIVEWISE RIDE COPILOT ENTITIES & TYPES
// ==========================================

export type RideStatus = 'received' | 'accepted' | 'rejected' | 'completed' | 'canceled';
export type ScoreTier = 'Excelente' | 'Boa' | 'Regular' | 'Baixa';

export interface RideOpportunity {
  id: string;
  userId: string;
  workSessionId?: string;
  platform: PlatformType;
  status: RideStatus;
  offeredValue: number;
  finalValue?: number;
  distanceToPassengerKm: number;
  estimatedTripDistanceKm: number;
  actualTripDistanceKm?: number;
  estimatedTimeToPassengerMin: number;
  estimatedTripTimeMin: number;
  actualTripTimeMin?: number;
  surgeMultiplier: number; // e.g. 1.0, 1.2, 1.5
  extraCosts: number; // toll, parking etc.
  estimatedProfit: number;
  netProfit: number;
  grossPerKm: number;
  netPerKm: number;
  grossPerHour: number;
  netPerHour: number;
  deadheadPercent: number; // % of distance to passenger / total distance
  score: number; // 0 to 100
  scoreTier: ScoreTier;
  scoreReason: string;
  recommendation?: string;
  ruleAlerts: string[];
  decisionReason?: string; // reason for rejection e.g. "Valor baixo", "Longe do passageiro"
  pickupAddress?: string;
  dropoffAddress?: string;
  routeDeviationKm?: number; // Distance added due to traffic or passenger route change
  priceAdjustment?: number; // Final or live price change (+ or -)
  priceAdjustmentReason?: string; // e.g. "Desvio de trajeto", "Parada adicional"
  cancellationFee?: number; // If canceled with passenger fee
  cancellationReason?: string; // e.g. "Passageiro cancelou após 5 minutos"
  timestamp: string; // ISO string
  createdAt: string;
  updatedAt: string;
}

export interface DecisionRule {
  minGrossPerKm: number; // e.g. 2.50
  minNetPerKm: number; // e.g. 1.80
  minGrossPerHour: number; // e.g. 40.00
  minNetPerHour: number; // e.g. 30.00
  minRideValue: number; // e.g. 12.00
  maxDistanceToPassengerKm: number; // e.g. 3.0
  maxTimeToPassengerMin: number; // e.g. 8
  maxDeadheadPercent: number; // e.g. 30%
  considerEmptyReturn: boolean;
  emptyReturnPercent: number; // e.g. 50%
  prioritizeDailyGoal: boolean;
  costPerKm: number; // e.g. 0.86
  costPerHour: number; // e.g. 4.50
}

export interface VehicleCostProfile {
  id: string;
  name: string;
  plate: string;
  type: 'Carro' | 'Moto' | 'Elétrico' | 'Híbrido';
  fuelType: FuelType;
  avgConsumptionKmPerLiter: number;
  avgFuelPrice: number;
  costMode: 'auto' | 'manual';
  manualCostPerKm?: number;
  manualCostPerHour?: number;
  monthlyFixedCosts: {
    financingOrRental: number;
    insurance: number;
    ipvaAndLicensing: number;
    washing: number;
    other: number;
  };
  perKmVariableCosts: {
    maintenancePerKm: number;
    tiresPerKm: number;
    depreciationPerKm: number;
  };
  estimatedMonthlyHours: number;
  isActive: boolean;
}

export interface OverlayPreference {
  isEnabled: boolean;
  isExpanded: boolean;
  showDuringJourneyOnly: boolean;
  enableSoundAlerts: boolean;
  enableVoiceAlerts: boolean;
  iosFallbackMode: 'live_activity' | 'pip' | 'widget' | 'compact_bar';
  dockPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating';
}

export interface DrivingModeSettings {
  isActive: boolean;
  hugeFonts: boolean;
  highContrast: boolean;
  soundAlerts: boolean;
  voiceAlerts: boolean;
  vibrationAlerts: boolean;
}

export interface CopilotNotificationSettings {
  goalReached: boolean;
  nearGoal: boolean;
  peakHourReminder: boolean;
  lowScoreAlert: boolean;
  acceptanceRateWarning: boolean;
  dailySummaryReport: boolean;
}

export interface DecisionAnalytics {
  totalAnalyzed: number;
  totalAccepted: number;
  totalRejected: number;
  acceptanceRate: number;
  avgScoreAccepted: number;
  avgScoreRejected: number;
  estimatedProfitAccepted: number;
  estimatedLostProfitRejected: number;
  rejectionReasons: { reason: string; count: number; percentage: number }[];
  platformComparison: {
    platform: PlatformType;
    analyzed: number;
    accepted: number;
    acceptanceRate: number;
    avgGrossPerKm: number;
    avgNetPerKm: number;
    avgGrossPerHour: number;
    avgNetPerHour: number;
    avgDeadheadPercent: number;
    avgScore: number;
    totalProfit: number;
  }[];
  hourlyProfitability: {
    slot: string;
    avgNetPerHour: number;
    count: number;
    rating: 'alta' | 'normal' | 'baixa';
  }[];
}

// ==========================================
// DRIVEWISE SUBSCRIPTION & TRIAL TYPES
// ==========================================

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled';
export type PaymentMethodType = 'pix' | 'credit_card';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number; // 9.99
  originalPrice: number; // 29.90
  currency: string; // 'R$'
  period: 'mês';
  trialDays: number; // 10
  badge: string; // 'Promoção de Lançamento'
  features: string[];
}

export interface SubscriptionState {
  // Master switch for the subscription system:
  // false = OFFLINE (Testing mode - all PRO features free and accessible)
  // true = ONLINE (Paywall active - requires trial or active subscription)
  isSystemOnline: boolean;
  status: SubscriptionStatus;
  trialStartDate: string; // ISO date
  trialEndDate: string; // ISO date (trialStartDate + 10 days)
  planId: string;
  planName: string;
  priceMonthly: number; // 9.99
  isSubscribed: boolean;
  subscribedAt?: string;
  paymentMethod?: PaymentMethodType;
  nextBillingDate?: string;
}

export const LAUNCH_PROMO_PLAN: SubscriptionPlan = {
  id: 'drivewise_pro_launch',
  name: 'DriveWise PRO',
  price: 9.99,
  originalPrice: 29.90,
  currency: 'R$',
  period: 'mês',
  trialDays: 10,
  badge: 'Promoção de Lançamento (66% OFF)',
  features: [
    '10 dias de teste 100% gratuito (sem cobrança inicial)',
    'Copiloto Veicular em tempo real sobreposto aos apps',
    'Cálculo instantâneo de R$/km líquido e R$/hora líquida',
    'Bloqueio automático de corridas no prejuízo',
    'Modo Batalha: comparação direta Uber vs 99 vs InDrive',
    'Controle de jornadas, faturamento e auditoria de combustível',
    'Sincronização ilimitada em nuvem segura com Google',
    'Relatórios fiscais e de rentabilidade para download',
    'Cancelamento fácil a qualquer momento com 1 clique',
  ],
};
