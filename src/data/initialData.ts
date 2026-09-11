import { Expense, FuelEntry, SmartInsight, UserProfile, WorkSession } from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Gabriel',
  email: 'gabrieulopezz@gmail.com',
  city: 'São Paulo, SP',
  avatarUrl: '',
  currency: 'R$',
  distanceUnit: 'km',
  vehicleModel: 'Chevrolet Onix Plus 1.0 Turbo',
  vehiclePlate: 'BRA-2026',
  vehicleYear: '2024',
  fuelType: 'Gasolina',
  avgFuelPrice: 5.89,
  avgConsumptionKmPerLiter: 11.5,
  dailyGoal: 0,
  weeklyGoal: 0,
  monthlyGoal: 0,
  hoursGoalWeekly: 0,
  notificationsEnabled: {
    nearGoal: true,
    peakHoursReminder: true,
    dailyIncomeReminder: true,
    aboveAverageAlert: true,
    monthlyGoalReached: true,
  },
};

export const initialSessions: WorkSession[] = [];

export const initialExpenses: Expense[] = [];

export const initialFuelEntries: FuelEntry[] = [];

export const initialSmartInsights: SmartInsight[] = [];
