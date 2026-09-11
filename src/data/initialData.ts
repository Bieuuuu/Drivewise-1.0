import { Expense, FuelEntry, SmartInsight, UserProfile, WorkSession } from '../types';

export const initialUserProfile: UserProfile = {
  name: '',
  email: '',
  city: '',
  avatarUrl: '',
  currency: 'R$',
  distanceUnit: 'km',
  vehicleModel: '',
  vehiclePlate: '',
  vehicleYear: '',
  fuelType: 'Gasolina',
  avgFuelPrice: 5.89,
  avgConsumptionKmPerLiter: 10.0,
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
