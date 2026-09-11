import {
  DecisionRule,
  RideOpportunity,
  VehicleCostProfile,
  OverlayPreference,
  DrivingModeSettings,
  CopilotNotificationSettings,
} from '../types';

export const defaultDecisionRules: DecisionRule = {
  minGrossPerKm: 2.5,
  minNetPerKm: 1.8,
  minGrossPerHour: 40.0,
  minNetPerHour: 30.0,
  minRideValue: 12.0,
  maxDistanceToPassengerKm: 3.0,
  maxTimeToPassengerMin: 8,
  maxDeadheadPercent: 30,
  considerEmptyReturn: false,
  emptyReturnPercent: 50,
  prioritizeDailyGoal: true,
  costPerKm: 0.86,
  costPerHour: 4.5,
};

export const defaultVehicleProfiles: VehicleCostProfile[] = [
  {
    id: 'veh-1',
    name: 'Chevrolet Onix Plus 1.0 Turbo',
    plate: 'BRA-2026',
    type: 'Carro',
    fuelType: 'Gasolina',
    avgConsumptionKmPerLiter: 11.5,
    avgFuelPrice: 5.89,
    costMode: 'auto',
    monthlyFixedCosts: {
      financingOrRental: 1400,
      insurance: 280,
      ipvaAndLicensing: 160,
      washing: 120,
      other: 60,
    },
    perKmVariableCosts: {
      maintenancePerKm: 0.12,
      tiresPerKm: 0.08,
      depreciationPerKm: 0.15,
    },
    estimatedMonthlyHours: 180,
    isActive: true,
  },
  {
    id: 'veh-2',
    name: 'Renault Kwid E-Tech (100% Elétrico)',
    plate: 'ELE-2026',
    type: 'Elétrico',
    fuelType: 'Eletricidade',
    avgConsumptionKmPerLiter: 10.0, // km/kWh eq
    avgFuelPrice: 0.95, // R$/kWh
    costMode: 'auto',
    monthlyFixedCosts: {
      financingOrRental: 1850,
      insurance: 310,
      ipvaAndLicensing: 80,
      washing: 100,
      other: 40,
    },
    perKmVariableCosts: {
      maintenancePerKm: 0.05,
      tiresPerKm: 0.07,
      depreciationPerKm: 0.18,
    },
    estimatedMonthlyHours: 180,
    isActive: false,
  },
];

export const defaultOverlayPreference: OverlayPreference = {
  isEnabled: true,
  isExpanded: false,
  showDuringJourneyOnly: false,
  enableSoundAlerts: true,
  enableVoiceAlerts: false,
  iosFallbackMode: 'live_activity',
  dockPosition: 'top-right',
};

export const defaultDrivingModeSettings: DrivingModeSettings = {
  isActive: false,
  hugeFonts: true,
  highContrast: true,
  soundAlerts: true,
  voiceAlerts: false,
  vibrationAlerts: true,
};

export const defaultCopilotNotifications: CopilotNotificationSettings = {
  goalReached: true,
  nearGoal: true,
  peakHourReminder: true,
  lowScoreAlert: true,
  acceptanceRateWarning: true,
  dailySummaryReport: true,
};

// Initial RideOpportunity dataset (starts empty for production launch)
export const initialRideOpportunities: RideOpportunity[] = [];
