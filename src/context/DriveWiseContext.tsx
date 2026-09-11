import React, { createContext, useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Expense,
  FuelEntry,
  SmartInsight,
  UserProfile,
  WorkSession,
  DailySummary,
  RideOpportunity,
  DecisionRule,
  VehicleCostProfile,
  OverlayPreference,
  DrivingModeSettings,
  CopilotNotificationSettings,
  RideStatus,
  SubscriptionState,
  PaymentMethodType,
  LAUNCH_PROMO_PLAN,
} from '../types';
import { safeStorage } from '../utils/safeStorage';
import {
  initialExpenses,
  initialFuelEntries,
  initialSmartInsights,
  initialSessions,
  initialUserProfile,
} from '../data/initialData';
import {
  defaultDecisionRules,
  defaultVehicleProfiles,
  defaultOverlayPreference,
  defaultDrivingModeSettings,
  defaultCopilotNotifications,
  initialRideOpportunities,
} from '../data/copilotInitialData';
import { computeDistanceBetweenCoords } from '../utils/calculations';
import { playCopilotSound, speakCopilotMessage } from '../utils/copilotCalculations';
import {
  auth,
  googleProvider,
  testConnection,
} from '../firebase';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { syncAllToCloud, fetchAllFromCloud } from '../services/cloudSync';

interface DriveWiseContextType {
  // FIREBASE CLOUD & USER
  firebaseUser: FirebaseUser | null;
  isAuthLoading: boolean;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastCloudSync: Date | null;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logoutFromCloud: () => Promise<void>;
  syncDataToCloud: () => Promise<{ success: boolean; error?: string }>;
  isCloudConfigured: boolean;

  user: UserProfile;
  updateUser: (updated: Partial<UserProfile>) => void;
  sessions: WorkSession[];
  activeSession: WorkSession | null;
  isJourneyActive: boolean;
  elapsedSeconds: number;
  currentGpsDistance: number;
  isSimulatingMovement: boolean;
  gpsStatus: 'idle' | 'tracking' | 'error' | 'simulated';
  gpsAccuracy: number | null;
  currentCoords: { lat: number; lng: number } | null;
  currentSpeedKmH: number;
  toggleMovementSimulation: () => void;
  startJourney: () => void;
  endJourney: (summaryData: {
    income: number;
    platformEarnings: { Uber: number; '99': number; InDrive: number; Outros: number };
    distanceKm: number;
    manualCorrection?: number;
    notes?: string;
  }) => WorkSession;
  cancelActiveJourney: () => void;
  addSession: (session: Omit<WorkSession, 'id' | 'createdAt'>) => void;
  updateSession: (id: string, updated: Partial<WorkSession>) => void;
  deleteSession: (id: string) => void;
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  fuelEntries: FuelEntry[];
  addFuelEntry: (entry: Omit<FuelEntry, 'id'>) => void;
  deleteFuelEntry: (id: string) => void;
  insights: SmartInsight[];
  dismissInsight: (id: string) => void;
  postJourneyData: WorkSession | null;
  closePostJourneyModal: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (open: boolean) => void;
  isFuelModalOpen: boolean;
  setIsFuelModalOpen: (open: boolean) => void;
  exportCSV: () => void;
  exportJSON: () => void;
  importJSON: (jsonString: string) => {
    success: boolean;
    message: string;
    count?: { sessions: number; expenses: number; fuel: number; rides: number };
  };
  getBackupJSONString: () => string;
  resetToSampleData: () => void;
  clearAllWorkData: () => void;
  currentDateStr: string; // Dynamic YYYY-MM-DD format

  // DRIVEWISE RIDE COPILOT PROPERTIES & ACTIONS
  rides: RideOpportunity[];
  addRideOpportunity: (ride: Omit<RideOpportunity, 'id' | 'createdAt' | 'updatedAt'>) => RideOpportunity;
  updateRideOpportunity: (id: string, updated: Partial<RideOpportunity>) => void;
  deleteRideOpportunity: (id: string) => void;
  acceptRideOpportunity: (id: string, customFinalValue?: number) => void;
  rejectRideOpportunity: (id: string, reason: string) => void;
  completeRideOpportunity: (id: string, actualTripDistanceKm?: number, actualTripTimeMin?: number, finalValue?: number) => void;
  cancelRideOpportunity: (id: string, reason: string, cancelFee?: number) => void;
  rerouteOrUpdateRide: (id: string, update: { additionalKm?: number; additionalTimeMin?: number; priceAdjustment?: number; reason?: string }) => void;
  triggerSimultaneousRides: () => void;
  lastAnalyzedRide: RideOpportunity | null;
  setLastAnalyzedRide: (ride: RideOpportunity | null) => void;
  decisionRules: DecisionRule;
  updateDecisionRules: (rules: Partial<DecisionRule>) => void;
  vehicleProfiles: VehicleCostProfile[];
  activeVehicleProfile: VehicleCostProfile;
  updateVehicleProfile: (id: string, updated: Partial<VehicleCostProfile>) => void;
  addVehicleProfile: (profile: Omit<VehicleCostProfile, 'id'>) => void;
  setActiveVehicleProfile: (id: string) => void;
  overlayPref: OverlayPreference;
  updateOverlayPref: (pref: Partial<OverlayPreference>) => void;
  toggleOverlay: () => void;
  toggleOverlayExpanded: () => void;
  drivingMode: DrivingModeSettings;
  updateDrivingMode: (settings: Partial<DrivingModeSettings>) => void;
  toggleDrivingMode: () => void;
  copilotNotifications: CopilotNotificationSettings;
  updateCopilotNotifications: (settings: Partial<CopilotNotificationSettings>) => void;
  isRideAnalysisModalOpen: boolean;
  setIsRideAnalysisModalOpen: (open: boolean) => void;
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  hasOverlayPermission: boolean;
  isOverlayPermissionModalOpen: boolean;
  setIsOverlayPermissionModalOpen: (open: boolean) => void;
  grantOverlayPermission: () => void;
  dismissOverlayPermissionModal: () => void;
  isMinimalistMode: boolean;
  setIsMinimalistMode: (value: boolean) => void;
  toggleMinimalistMode: () => void;

  // SUBSCRIPTION & TRIAL (OFFLINE BY DEFAULT FOR TESTING)
  subscription: SubscriptionState;
  isSubscriptionSystemOnline: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number;
  isPro: boolean;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (open: boolean) => void;
  toggleSubscriptionSystem: (online: boolean) => void;
  activateSubscription: (method: PaymentMethodType) => void;
  cancelSubscription: () => void;
  resetTrial: () => void;
  simulateTrialDaysRemaining: (daysRemaining: number) => void;
}

const DriveWiseContext = createContext<DriveWiseContextType | undefined>(undefined);

const STORAGE_KEY = 'drivewise_state_v2';

export const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CURRENT_DATE_STR = getTodayDateString();

export const DriveWiseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from LocalStorage or defaults
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_user`);
      if (saved) return JSON.parse(saved);
      // Fallback check legacy v1 and clean demo values
      const legacy = localStorage.getItem('drivewise_state_v1_user');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        return { ...parsed, dailyGoal: parsed.dailyGoal || 0 };
      }
      return initialUserProfile;
    } catch {
      return initialUserProfile;
    }
  });

  const [sessions, setSessions] = useState<WorkSession[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_sessions`);
      if (saved) {
        const parsed: WorkSession[] = JSON.parse(saved);
        return parsed.filter(
          (s) =>
            !s.id.startsWith('ws-20260903') &&
            !s.id.startsWith('ws-20260902') &&
            !s.id.startsWith('ws-20260901') &&
            !s.id.startsWith('ws-202608')
        );
      }
      return initialSessions;
    } catch {
      return initialSessions;
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
      if (saved) {
        const parsed: Expense[] = JSON.parse(saved);
        return parsed.filter((e) => !e.id.startsWith('exp-'));
      }
      return initialExpenses;
    } catch {
      return initialExpenses;
    }
  });

  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_fuel`);
      if (saved) {
        const parsed: FuelEntry[] = JSON.parse(saved);
        return parsed.filter((f) => !f.id.startsWith('fuel-'));
      }
      return initialFuelEntries;
    } catch {
      return initialFuelEntries;
    }
  });

  const [insights, setInsights] = useState<SmartInsight[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_insights`);
      return saved ? JSON.parse(saved) : initialSmartInsights;
    } catch {
      return initialSmartInsights;
    }
  });

  // DRIVEWISE RIDE COPILOT STATE
  const [rides, setRides] = useState<RideOpportunity[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_rides`);
      if (saved) {
        const parsed: RideOpportunity[] = JSON.parse(saved);
        return parsed.filter((r) => !r.id.startsWith('ride-'));
      }
      return initialRideOpportunities;
    } catch {
      return initialRideOpportunities;
    }
  });

  const [decisionRules, setDecisionRules] = useState<DecisionRule>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_rules`);
      return saved ? JSON.parse(saved) : defaultDecisionRules;
    } catch {
      return defaultDecisionRules;
    }
  });

  const [vehicleProfiles, setVehicleProfiles] = useState<VehicleCostProfile[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_vehicles`);
      return saved ? JSON.parse(saved) : defaultVehicleProfiles;
    } catch {
      return defaultVehicleProfiles;
    }
  });

  const [overlayPref, setOverlayPref] = useState<OverlayPreference>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_overlay`);
      return saved ? JSON.parse(saved) : defaultOverlayPreference;
    } catch {
      return defaultOverlayPreference;
    }
  });

  const [drivingMode, setDrivingMode] = useState<DrivingModeSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_driving_mode`);
      return saved ? JSON.parse(saved) : defaultDrivingModeSettings;
    } catch {
      return defaultDrivingModeSettings;
    }
  });

  const [copilotNotifications, setCopilotNotifications] = useState<CopilotNotificationSettings>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_copilot_notifs`);
      return saved ? JSON.parse(saved) : defaultCopilotNotifications;
    } catch {
      return defaultCopilotNotifications;
    }
  });

  const [lastAnalyzedRide, setLastAnalyzedRide] = useState<RideOpportunity | null>(null);

  const [isRideAnalysisModalOpen, setIsRideAnalysisModalOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      const completed = localStorage.getItem('drivewise_cockpit_onboarding_v3');
      return completed !== 'true';
    } catch {
      return true;
    }
  });

  // Floating Overlay Permission State
  const [hasOverlayPermission, setHasOverlayPermission] = useState<boolean>(() => {
    try {
      return localStorage.getItem('drivewise_overlay_permission_v1') === 'granted';
    } catch {
      return false;
    }
  });

  const [isOverlayPermissionModalOpen, setIsOverlayPermissionModalOpen] = useState<boolean>(() => {
    try {
      const granted = localStorage.getItem('drivewise_overlay_permission_v1') === 'granted';
      const promptSeen = localStorage.getItem('drivewise_overlay_permission_seen') === 'true';
      // If user hasn't seen the overlay permission prompt, display on entrance
      return !granted && !promptSeen;
    } catch {
      return false;
    }
  });

  const grantOverlayPermission = useCallback(() => {
    try {
      localStorage.setItem('drivewise_overlay_permission_v1', 'granted');
      localStorage.setItem('drivewise_overlay_permission_seen', 'true');
    } catch {
      // ignore
    }
    setHasOverlayPermission(true);
    setIsOverlayPermissionModalOpen(false);
    setOverlayPref((prev) => ({ ...prev, isEnabled: true }));
  }, []);

  const dismissOverlayPermissionModal = useCallback(() => {
    try {
      localStorage.setItem('drivewise_overlay_permission_seen', 'true');
    } catch {
      // ignore
    }
    setIsOverlayPermissionModalOpen(false);
  }, []);

  // Minimalist Mode State (persisted locally)
  const [isMinimalistMode, setIsMinimalistModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('drivewise_minimalist_mode_v1');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const setIsMinimalistMode = useCallback((value: boolean) => {
    setIsMinimalistModeState(value);
    try {
      localStorage.setItem('drivewise_minimalist_mode_v1', String(value));
    } catch {
      // ignore
    }
  }, []);

  const toggleMinimalistMode = useCallback(() => {
    setIsMinimalistModeState((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('drivewise_minimalist_mode_v1', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Subscription & Trial System (OFFLINE by default for testing phase)
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    try {
      const saved = safeStorage.getItem(`${STORAGE_KEY}_subscription`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          isSystemOnline: false,
          status: 'trial',
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          planId: LAUNCH_PROMO_PLAN.id,
          planName: LAUNCH_PROMO_PLAN.name,
          priceMonthly: LAUNCH_PROMO_PLAN.price,
          isSubscribed: false,
          ...parsed,
        };
      }
    } catch {
      // ignore
    }
    const now = new Date();
    return {
      isSystemOnline: false, // OFFLINE por enquanto
      status: 'trial',
      trialStartDate: now.toISOString(),
      trialEndDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      planId: LAUNCH_PROMO_PLAN.id,
      planName: LAUNCH_PROMO_PLAN.name,
      priceMonthly: LAUNCH_PROMO_PLAN.price,
      isSubscribed: false,
    };
  });

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState<boolean>(false);

  // Computed Subscription Values
  const isTrialActive = useMemo(() => {
    if (subscription.isSubscribed) return false;
    const end = new Date(subscription.trialEndDate).getTime();
    return Date.now() < end;
  }, [subscription.isSubscribed, subscription.trialEndDate]);

  const isTrialExpired = useMemo(() => {
    if (subscription.isSubscribed) return false;
    const end = new Date(subscription.trialEndDate).getTime();
    return Date.now() >= end;
  }, [subscription.isSubscribed, subscription.trialEndDate]);

  const trialDaysRemaining = useMemo(() => {
    if (subscription.isSubscribed) return 0;
    const end = new Date(subscription.trialEndDate).getTime();
    const diffMs = end - Date.now();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }, [subscription.isSubscribed, subscription.trialEndDate]);

  // CRITICAL LOGIC: If subscription system is OFFLINE, isPro is ALWAYS true for testing!
  const isPro = useMemo(() => {
    if (!subscription.isSystemOnline) {
      return true; // Sistema offline: Acesso livre ilimitado para testes!
    }
    return subscription.isSubscribed || isTrialActive;
  }, [subscription.isSystemOnline, subscription.isSubscribed, isTrialActive]);

  const toggleSubscriptionSystem = useCallback((online: boolean) => {
    setSubscription((prev) => {
      const next = { ...prev, isSystemOnline: online };
      try {
        safeStorage.setItem(`${STORAGE_KEY}_subscription`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const activateSubscription = useCallback((method: PaymentMethodType) => {
    setSubscription((prev) => {
      const now = new Date();
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next: SubscriptionState = {
        ...prev,
        status: 'active',
        isSubscribed: true,
        subscribedAt: now.toISOString(),
        paymentMethod: method,
        nextBillingDate: nextMonth.toISOString(),
      };
      try {
        safeStorage.setItem(`${STORAGE_KEY}_subscription`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const cancelSubscription = useCallback(() => {
    setSubscription((prev) => {
      const next: SubscriptionState = {
        ...prev,
        status: 'canceled',
        isSubscribed: false,
      };
      try {
        safeStorage.setItem(`${STORAGE_KEY}_subscription`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const resetTrial = useCallback(() => {
    setSubscription((prev) => {
      const now = new Date();
      const tenDays = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      const next: SubscriptionState = {
        ...prev,
        status: 'trial',
        isSubscribed: false,
        trialStartDate: now.toISOString(),
        trialEndDate: tenDays.toISOString(),
      };
      try {
        safeStorage.setItem(`${STORAGE_KEY}_subscription`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const simulateTrialDaysRemaining = useCallback((daysRemaining: number) => {
    setSubscription((prev) => {
      const now = new Date();
      const targetEnd =
        daysRemaining <= 0
          ? new Date(now.getTime() - 10000)
          : new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
      const next: SubscriptionState = {
        ...prev,
        isSubscribed: false,
        status: daysRemaining <= 0 ? 'expired' : 'trial',
        trialEndDate: targetEnd.toISOString(),
      };
      try {
        safeStorage.setItem(`${STORAGE_KEY}_subscription`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Firebase Auth & Cloud Sync State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('idle');
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  const isCloudConfigured = true;

  // Boot connection check & Auth state listener
  useEffect(() => {
    testConnection().then((connected) => {
      if (!connected) {
        setCloudSyncStatus('offline');
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setFirebaseUser(authUser);
      setIsAuthLoading(false);

      if (authUser) {
        setCloudSyncStatus('syncing');
        try {
          const cloudRes = await fetchAllFromCloud(authUser.uid);
          if (cloudRes.success && cloudRes.data && cloudRes.data.sessions && cloudRes.data.sessions.length > 0) {
            setSessions(cloudRes.data.sessions);
            if (cloudRes.data.expenses) setExpenses(cloudRes.data.expenses);
            if (cloudRes.data.fuelEntries) setFuelEntries(cloudRes.data.fuelEntries);
            if (cloudRes.data.rides && cloudRes.data.rides.length > 0) setRides(cloudRes.data.rides);
            if (cloudRes.data.user) setUser((prev) => ({ ...prev, ...cloudRes.data!.user }));
            setCloudSyncStatus('synced');
            setLastCloudSync(new Date());
          } else {
            // New user in cloud: migrate local state to cloud
            await syncAllToCloud(authUser.uid, {
              user: {
                ...user,
                name: authUser.displayName || user.name,
                email: authUser.email || user.email,
              },
              sessions,
              expenses,
              fuelEntries,
              rides,
            });
            setCloudSyncStatus('synced');
            setLastCloudSync(new Date());
          }
        } catch (e) {
          console.warn('Sync error on auth change:', e);
          setCloudSyncStatus('error');
        }
      } else {
        setCloudSyncStatus('idle');
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsAuthLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        setFirebaseUser(result.user);
        const cloudRes = await fetchAllFromCloud(result.user.uid);
        if (cloudRes.success && cloudRes.data && cloudRes.data.sessions && cloudRes.data.sessions.length > 0) {
          setSessions(cloudRes.data.sessions);
          if (cloudRes.data.expenses) setExpenses(cloudRes.data.expenses);
          if (cloudRes.data.fuelEntries) setFuelEntries(cloudRes.data.fuelEntries);
          if (cloudRes.data.rides && cloudRes.data.rides.length > 0) setRides(cloudRes.data.rides);
          if (cloudRes.data.user) setUser((prev) => ({ ...prev, ...cloudRes.data!.user }));
        } else {
          await syncAllToCloud(result.user.uid, {
            user: {
              ...user,
              name: result.user.displayName || user.name,
              email: result.user.email || user.email,
            },
            sessions,
            expenses,
            fuelEntries,
            rides,
          });
        }
        setCloudSyncStatus('synced');
        setLastCloudSync(new Date());
        setIsAuthLoading(false);
        return { success: true };
      }
      setIsAuthLoading(false);
      return { success: false, error: 'Login cancelado.' };
    } catch (err: any) {
      setIsAuthLoading(false);
      console.warn('Google Sign-In error:', err);
      return {
        success: false,
        error: err?.message || 'Falha ao autenticar com a conta Google.',
      };
    }
  };

  const logoutFromCloud = async (): Promise<void> => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setCloudSyncStatus('idle');
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  const syncDataToCloud = async (): Promise<{ success: boolean; error?: string }> => {
    if (!firebaseUser) {
      return { success: false, error: 'Você precisa estar conectado com sua conta Google.' };
    }
    setCloudSyncStatus('syncing');
    const res = await syncAllToCloud(firebaseUser.uid, {
      user,
      sessions,
      expenses,
      fuelEntries,
      rides,
    });
    if (res.success) {
      setCloudSyncStatus('synced');
      setLastCloudSync(new Date());
    } else {
      setCloudSyncStatus('error');
    }
    return res;
  };

  // Active Journey state
  const [activeSession, setActiveSession] = useState<WorkSession | null>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY}_active_session`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [currentGpsDistance, setCurrentGpsDistance] = useState<number>(0);
  const [isSimulatingMovement, setIsSimulatingMovement] = useState<boolean>(false);
  const [currentSpeedKmH, setCurrentSpeedKmH] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'tracking' | 'error' | 'simulated'>('idle');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Modals & summaries
  const [postJourneyData, setPostJourneyData] = useState<WorkSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);

  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Persist to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_user`, JSON.stringify(user));
      localStorage.setItem(`${STORAGE_KEY}_sessions`, JSON.stringify(sessions));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_fuel`, JSON.stringify(fuelEntries));
      localStorage.setItem(`${STORAGE_KEY}_insights`, JSON.stringify(insights));
      localStorage.setItem(`${STORAGE_KEY}_rides`, JSON.stringify(rides));
      localStorage.setItem(`${STORAGE_KEY}_rules`, JSON.stringify(decisionRules));
      localStorage.setItem(`${STORAGE_KEY}_vehicles`, JSON.stringify(vehicleProfiles));
      localStorage.setItem(`${STORAGE_KEY}_overlay`, JSON.stringify(overlayPref));
      localStorage.setItem(`${STORAGE_KEY}_driving_mode`, JSON.stringify(drivingMode));
      localStorage.setItem(`${STORAGE_KEY}_copilot_notifs`, JSON.stringify(copilotNotifications));
      if (activeSession) {
        localStorage.setItem(`${STORAGE_KEY}_active_session`, JSON.stringify(activeSession));
      } else {
        localStorage.removeItem(`${STORAGE_KEY}_active_session`);
      }
    } catch (err) {
      console.warn('Storage quota or error:', err);
    }
  }, [
    user,
    sessions,
    expenses,
    fuelEntries,
    insights,
    activeSession,
    rides,
    decisionRules,
    vehicleProfiles,
    overlayPref,
    drivingMode,
    copilotNotifications,
  ]);

  const isJourneyActive = activeSession !== null;

  // Real-time stopwatch ticker when journey is active
  useEffect(() => {
    if (!isJourneyActive || !activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const startTimestamp = new Date(activeSession.startTime).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTimestamp) / 1000));
      setElapsedSeconds(diffSec);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isJourneyActive, activeSession]);

  // GPS geolocation tracking
  useEffect(() => {
    if (!isJourneyActive) {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('idle');
      setCurrentSpeedKmH(0);
      return;
    }

    if (isSimulatingMovement) {
      setGpsStatus('simulated');
      setGpsAccuracy(8);
      setCurrentSpeedKmH(35);
      // Steady progress if specifically requested
      const simInterval = setInterval(() => {
        setCurrentGpsDistance((prev) => +(prev + 0.015).toFixed(2));
      }, 1500);
      return () => clearInterval(simInterval);
    }

    // Real GPS via navigator.geolocation
    if ('geolocation' in navigator) {
      setGpsStatus('tracking');
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords;
          setGpsAccuracy(accuracy);
          setCurrentCoords({ lat: latitude, lng: longitude });

          if (typeof speed === 'number' && speed >= 0) {
            setCurrentSpeedKmH(Math.round(speed * 3.6));
          } else {
            setCurrentSpeedKmH(0);
          }

          if (prevCoordsRef.current) {
            const distanceAdded = computeDistanceBetweenCoords(
              prevCoordsRef.current.lat,
              prevCoordsRef.current.lng,
              latitude,
              longitude
            );
            // Ignore tiny jitter under 5 meters (0.005 km) to prevent stationary drift
            if (distanceAdded > 0.005) {
              setCurrentGpsDistance((prev) => +(prev + distanceAdded).toFixed(2));
              prevCoordsRef.current = { lat: latitude, lng: longitude };
            }
          } else {
            prevCoordsRef.current = { lat: latitude, lng: longitude };
          }
        },
        (error) => {
          console.warn('GPS status error:', error);
          setGpsStatus('error');
          setCurrentSpeedKmH(0);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );
    } else {
      setGpsStatus('error');
      setCurrentSpeedKmH(0);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isJourneyActive, isSimulatingMovement]);

  const toggleMovementSimulation = () => {
    setIsSimulatingMovement((prev) => !prev);
  };

  const startJourney = () => {
    // Count shifts already completed today to determine turn number (e.g. 1º turno, 2º turno)
    const todaySessions = sessions.filter((s) => s.date === CURRENT_DATE_STR);
    const nextShiftNumber = todaySessions.length + 1;

    const newActive: WorkSession = {
      id: `ws-${Date.now()}`,
      userId: 'user-1',
      date: CURRENT_DATE_STR,
      shiftNumber: nextShiftNumber,
      startTime: new Date().toISOString(),
      durationMinutes: 0,
      startLocation: 'Localização atual (GPS)',
      distanceKm: 0,
      income: 0,
      platformEarnings: {
        Uber: 0,
        '99': 0,
        InDrive: 0,
        Outros: 0,
      },
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setActiveSession(newActive);
    setCurrentGpsDistance(0);
    prevCoordsRef.current = null;
  };

  const endJourney = (summaryData: {
    income: number;
    platformEarnings: { Uber: number; '99': number; InDrive: number; Outros: number };
    distanceKm: number;
    manualCorrection?: number;
    notes?: string;
  }): WorkSession => {
    if (!activeSession) throw new Error('Nenhuma jornada ativa para encerrar');

    const endTime = new Date().toISOString();
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const effectiveKm =
      summaryData.manualCorrection !== undefined
        ? summaryData.manualCorrection
        : summaryData.distanceKm;

    // Estimate fuel cost: (distanceKm / avgConsumption) * avgFuelPrice
    const fuelConsumption = effectiveKm / (user.avgConsumptionKmPerLiter || 11.5);
    const estimatedFuelCost = Number((fuelConsumption * (user.avgFuelPrice || 5.89)).toFixed(2));

    const completedSession: WorkSession = {
      ...activeSession,
      endTime,
      durationMinutes,
      distanceKm: summaryData.distanceKm,
      manualDistanceCorrection: summaryData.manualCorrection,
      income: summaryData.income,
      platformEarnings: summaryData.platformEarnings,
      notes: summaryData.notes,
      status: 'completed',
      estimatedFuelCost,
    };

    setSessions((prev) => [completedSession, ...prev]);
    setActiveSession(null);
    setCurrentGpsDistance(0);
    setPostJourneyData(completedSession);

    return completedSession;
  };

  const cancelActiveJourney = () => {
    setActiveSession(null);
    setCurrentGpsDistance(0);
  };

  const addSession = (sessionData: Omit<WorkSession, 'id' | 'createdAt'>) => {
    const newSession: WorkSession = {
      ...sessionData,
      id: `ws-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => [newSession, ...prev]);
  };

  const updateSession = (id: string, updated: Partial<WorkSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
    );
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const addExpense = (expenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
    };
    setExpenses((prev) => [newExpense, ...prev]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addFuelEntry = (entryData: Omit<FuelEntry, 'id'>) => {
    const newEntry: FuelEntry = {
      ...entryData,
      id: `fuel-${Date.now()}`,
    };
    setFuelEntries((prev) => [newEntry, ...prev]);

    // Also automatically register as an expense in fuel category
    addExpense({
      userId: user.email,
      date: entryData.date,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      category: 'Combustível',
      amount: entryData.totalCost,
      notes: `${entryData.fuelType} - ${entryData.liters.toFixed(1)}L no odômetro ${entryData.odometer}km`,
      odometer: entryData.odometer,
    });
  };

  const deleteFuelEntry = (id: string) => {
    setFuelEntries((prev) => prev.filter((f) => f.id !== id));
  };

  const dismissInsight = (id: string) => {
    setInsights((prev) => prev.filter((i) => i.id !== id));
  };

  const updateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => ({ ...prev, ...updated }));
  };

  const closePostJourneyModal = () => {
    setPostJourneyData(null);
  };

  // ==========================================
  // DRIVEWISE RIDE COPILOT IMPLEMENTATIONS
  // ==========================================

  const activeVehicleProfile: VehicleCostProfile =
    vehicleProfiles.find((v) => v.isActive) || vehicleProfiles[0] || defaultVehicleProfiles[0];

  const addRideOpportunity = (rideData: Omit<RideOpportunity, 'id' | 'createdAt' | 'updatedAt'>): RideOpportunity => {
    const now = new Date().toISOString();
    const newRide: RideOpportunity = {
      ...rideData,
      id: `ride-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    setRides((prev) => [newRide, ...prev]);
    setLastAnalyzedRide(newRide);

    // Audio & voice triggers based on settings
    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      if (newRide.scoreTier === 'Excelente') playCopilotSound('good');
      else if (newRide.scoreTier === 'Baixa') playCopilotSound('bad');
    }

    if ((drivingMode.isActive && drivingMode.voiceAlerts) || overlayPref.enableVoiceAlerts) {
      const net = Math.round(newRide.netProfit || 0);
      const voiceText = `${newRide.platform}. Nota ${newRide.score}. Lucro ${net} reais.`;
      speakCopilotMessage(voiceText);
    }

    return newRide;
  };

  const updateRideOpportunity = (id: string, updated: Partial<RideOpportunity>) => {
    setRides((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated, updatedAt: new Date().toISOString() } : r))
    );
  };

  const deleteRideOpportunity = (id: string) => {
    setRides((prev) => prev.filter((r) => r.id !== id));
  };

  const acceptRideOpportunity = (id: string, customFinalValue?: number) => {
    setRides((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const updatedRide: RideOpportunity = {
            ...r,
            status: 'accepted',
            finalValue: customFinalValue !== undefined ? customFinalValue : r.offeredValue,
            workSessionId: activeSession ? activeSession.id : r.workSessionId,
            updatedAt: new Date().toISOString(),
          };
          return updatedRide;
        }
        return r;
      })
    );

    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      playCopilotSound('good');
    }
  };

  const rejectRideOpportunity = (id: string, reason: string) => {
    setRides((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'rejected',
              decisionReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : r
      )
    );

    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      playCopilotSound('bad');
    }
  };

  const completeRideOpportunity = (
    id: string,
    actualTripDistanceKm?: number,
    actualTripTimeMin?: number,
    finalValue?: number
  ) => {
    let completedTarget: RideOpportunity | undefined;

    setRides((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const finalTripDist = actualTripDistanceKm ?? r.actualTripDistanceKm ?? r.estimatedTripDistanceKm;
          const finalTripTime = actualTripTimeMin ?? r.actualTripTimeMin ?? r.estimatedTripTimeMin;
          const finalVal = finalValue ?? r.finalValue ?? r.offeredValue;

          const updated: RideOpportunity = {
            ...r,
            status: 'completed',
            actualTripDistanceKm: finalTripDist,
            actualTripTimeMin: finalTripTime,
            finalValue: finalVal,
            updatedAt: new Date().toISOString(),
          };
          completedTarget = updated;
          return updated;
        }
        return r;
      })
    );

    // If an active session is running, automatically integrate this completed ride's earnings and km
    if (activeSession && completedTarget) {
      const earned = (completedTarget as RideOpportunity).finalValue || (completedTarget as RideOpportunity).offeredValue || 0;
      const tripKm = (completedTarget as RideOpportunity).actualTripDistanceKm || (completedTarget as RideOpportunity).estimatedTripDistanceKm || 0;
      const platformKey = (completedTarget as RideOpportunity).platform;

      setActiveSession((prev) => {
        if (!prev) return null;
        const currentEarnings = { ...prev.platformEarnings };
        if (platformKey in currentEarnings) {
          const key = platformKey as keyof typeof currentEarnings;
          currentEarnings[key] = Number(((currentEarnings[key] || 0) + earned).toFixed(2));
        } else {
          currentEarnings.Outros = Number(((currentEarnings.Outros || 0) + earned).toFixed(2));
        }

        return {
          ...prev,
          income: Number((prev.income + earned).toFixed(2)),
          distanceKm: Number((prev.distanceKm + tripKm).toFixed(1)),
          platformEarnings: currentEarnings,
        };
      });
    }
  };

  const cancelRideOpportunity = (id: string, reason: string, cancelFee = 0) => {
    let canceledTarget: RideOpportunity | undefined;

    setRides((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const costPerKm = activeVehicleProfile.manualCostPerKm || 0.86;
          const costSpent = (r.distanceToPassengerKm || 0) * costPerKm;
          const netProfit = cancelFee - costSpent;

          const updated: RideOpportunity = {
            ...r,
            status: 'canceled',
            cancellationReason: reason,
            cancellationFee: cancelFee,
            finalValue: cancelFee,
            netProfit: Number(netProfit.toFixed(2)),
            updatedAt: new Date().toISOString(),
          };
          canceledTarget = updated;
          return updated;
        }
        return r;
      })
    );

    // If an active session is running and a fee was paid, credit it to current shift
    if (activeSession && canceledTarget && cancelFee > 0) {
      const platformKey = (canceledTarget as RideOpportunity).platform;
      setActiveSession((prev) => {
        if (!prev) return null;
        const currentEarnings = { ...prev.platformEarnings };
        if (platformKey in currentEarnings) {
          const key = platformKey as keyof typeof currentEarnings;
          currentEarnings[key] = Number(((currentEarnings[key] || 0) + cancelFee).toFixed(2));
        } else {
          currentEarnings.Outros = Number(((currentEarnings.Outros || 0) + cancelFee).toFixed(2));
        }

        return {
          ...prev,
          income: Number((prev.income + cancelFee).toFixed(2)),
          platformEarnings: currentEarnings,
        };
      });
    }

    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      playCopilotSound('bad');
    }

    if (overlayPref.enableVoiceAlerts || drivingMode.voiceAlerts) {
      const feeMsg = cancelFee > 0 ? `Taxa R$ ${Math.round(cancelFee)}.` : '';
      speakCopilotMessage(`Cancelada pelo passageiro. ${feeMsg}`.trim());
    }
  };

  const rerouteOrUpdateRide = (
    id: string,
    update: {
      additionalKm?: number;
      additionalTimeMin?: number;
      priceAdjustment?: number;
      reason?: string;
    }
  ) => {
    setRides((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const addKm = update.additionalKm || 0;
          const addTime = update.additionalTimeMin || 0;
          const priceAdj = update.priceAdjustment || 0;

          const newTotalDist = (r.actualTripDistanceKm ?? r.estimatedTripDistanceKm) + addKm;
          const newTotalTime = (r.actualTripTimeMin ?? r.estimatedTripTimeMin) + addTime;
          const newFinalValue = (r.finalValue ?? r.offeredValue) + priceAdj;

          const costPerKm = activeVehicleProfile.manualCostPerKm || 0.86;
          const newTotalCost = (newTotalDist + r.distanceToPassengerKm) * costPerKm;
          const newNetProfit = Number((newFinalValue - newTotalCost).toFixed(2));
          const newNetPerKm = newTotalDist > 0 ? Number((newNetProfit / newTotalDist).toFixed(2)) : r.netPerKm;

          return {
            ...r,
            actualTripDistanceKm: newTotalDist,
            actualTripTimeMin: newTotalTime,
            finalValue: newFinalValue,
            routeDeviationKm: (r.routeDeviationKm || 0) + addKm,
            priceAdjustment: (r.priceAdjustment || 0) + priceAdj,
            priceAdjustmentReason: update.reason || 'Desvio de trajeto recalculado',
            netProfit: newNetProfit,
            netPerKm: newNetPerKm,
            updatedAt: new Date().toISOString(),
          };
        }
        return r;
      })
    );

    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      playCopilotSound('good');
    }

    if (overlayPref.enableVoiceAlerts || drivingMode.voiceAlerts) {
      const voiceMsg =
        update.priceAdjustment && update.priceAdjustment > 0
          ? `Ajuste mais R$ ${Math.round(update.priceAdjustment)}.`
          : `Desvio mais ${update.additionalKm?.toFixed(1)} km.`;
      speakCopilotMessage(voiceMsg);
    }
  };

  const triggerSimultaneousRides = () => {
    const now = new Date().toISOString();
    // Uber Ride - High Profitability
    const uberRide: RideOpportunity = {
      id: `ride-uber-${Date.now()}`,
      userId: user.email,
      platform: 'Uber',
      status: 'received',
      offeredValue: 34.5,
      distanceToPassengerKm: 1.2,
      estimatedTripDistanceKm: 7.8,
      estimatedTimeToPassengerMin: 3,
      estimatedTripTimeMin: 18,
      surgeMultiplier: 1.3,
      extraCosts: 0,
      estimatedProfit: 26.8,
      netProfit: 24.15,
      grossPerKm: 3.83,
      netPerKm: 2.68,
      grossPerHour: 98.57,
      netPerHour: 69.0,
      deadheadPercent: 13.3,
      score: 94,
      scoreTier: 'Excelente',
      scoreReason: 'Alta rentabilidade por KM e retorno em área de alta demanda.',
      recommendation: 'Corrida campeã! R$ 2,68 líquido por km com busca curtíssima (3 min).',
      ruleAlerts: [],
      pickupAddress: 'Av. Brigadeiro Faria Lima, 2232',
      dropoffAddress: 'Av. Paulista, 1578 (Masp)',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    };

    // 99 Ride - Lower Profitability / Far away
    const nineNineRide: RideOpportunity = {
      id: `ride-99-${Date.now() + 1}`,
      userId: user.email,
      platform: '99',
      status: 'received',
      offeredValue: 21.8,
      distanceToPassengerKm: 4.5,
      estimatedTripDistanceKm: 8.0,
      estimatedTimeToPassengerMin: 12,
      estimatedTripTimeMin: 24,
      surgeMultiplier: 1.0,
      extraCosts: 0,
      estimatedProfit: 11.05,
      netProfit: 9.2,
      grossPerKm: 1.74,
      netPerKm: 0.74,
      grossPerHour: 36.33,
      netPerHour: 15.33,
      deadheadPercent: 36.0,
      score: 52,
      scoreTier: 'Regular',
      scoreReason: 'Deslocamento vazio excessivo (4,5 km) e margem líquida comprimida.',
      recommendation: 'Atenção: Passageiro muito longe (12 min) com ganho de apenas R$ 0,74/km líquido.',
      ruleAlerts: ['Busca muito longa (> 3.0 km)', 'Taxa líquida/km abaixo da meta'],
      pickupAddress: 'Rua Augusta, 1508',
      dropoffAddress: 'Av. Ibirapuera, 3103',
      timestamp: now,
      createdAt: now,
      updatedAt: now,
    };

    setRides((prev) => [uberRide, nineNineRide, ...prev]);
    setLastAnalyzedRide(uberRide);
    updateOverlayPref({ isExpanded: true });

    if (overlayPref.enableSoundAlerts || drivingMode.soundAlerts) {
      playCopilotSound('good');
    }
    if (overlayPref.enableVoiceAlerts || drivingMode.voiceAlerts) {
      speakCopilotMessage('Uber e 99. Uber melhor, nota 94.');
    }
  };

  const updateDecisionRules = (updated: Partial<DecisionRule>) => {
    setDecisionRules((prev) => ({ ...prev, ...updated }));
  };

  const updateVehicleProfile = (id: string, updated: Partial<VehicleCostProfile>) => {
    setVehicleProfiles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updated } : v))
    );
  };

  const addVehicleProfile = (profile: Omit<VehicleCostProfile, 'id'>) => {
    const newProfile: VehicleCostProfile = {
      ...profile,
      id: `veh-${Date.now()}`,
    };
    // If setting active, deactivate others
    if (newProfile.isActive) {
      setVehicleProfiles((prev) => [...prev.map((v) => ({ ...v, isActive: false })), newProfile]);
    } else {
      setVehicleProfiles((prev) => [...prev, newProfile]);
    }
  };

  const setActiveVehicleProfile = (id: string) => {
    setVehicleProfiles((prev) =>
      prev.map((v) => ({ ...v, isActive: v.id === id }))
    );
  };

  const updateOverlayPref = (updated: Partial<OverlayPreference>) => {
    setOverlayPref((prev) => ({ ...prev, ...updated }));
  };

  const toggleOverlay = () => {
    setOverlayPref((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  };

  const toggleOverlayExpanded = () => {
    setOverlayPref((prev) => ({ ...prev, isExpanded: !prev.isExpanded }));
  };

  const updateDrivingMode = (updated: Partial<DrivingModeSettings>) => {
    setDrivingMode((prev) => ({ ...prev, ...updated }));
  };

  const toggleDrivingMode = () => {
    setDrivingMode((prev) => ({ ...prev, isActive: !prev.isActive }));
  };

  const updateCopilotNotifications = (updated: Partial<CopilotNotificationSettings>) => {
    setCopilotNotifications((prev) => ({ ...prev, ...updated }));
  };

  const exportCSV = () => {
    const headers = [
      'ID',
      'Data',
      'Turno',
      'Hora Início',
      'Hora Fim',
      'Duração (min)',
      'Distância (km)',
      'Ganho Total (R$)',
      'Uber (R$)',
      '99 (R$)',
      'InDrive (R$)',
      'Outros (R$)',
      'Ganho/Hora (R$)',
      'Ganho/Km (R$)',
      'Combustível Estimado (R$)',
      'Observações',
    ];

    const rows = sessions
      .filter((s) => s.status === 'completed')
      .map((s) => {
        const hourly = s.durationMinutes > 0 ? ((s.income / s.durationMinutes) * 60).toFixed(2) : '0';
        const perKm = s.distanceKm > 0 ? (s.income / s.distanceKm).toFixed(2) : '0';
        return [
          s.id,
          s.date,
          `${s.shiftNumber}º turno`,
          s.startTime ? new Date(s.startTime).toLocaleTimeString('pt-BR') : '',
          s.endTime ? new Date(s.endTime).toLocaleTimeString('pt-BR') : '',
          s.durationMinutes,
          s.manualDistanceCorrection || s.distanceKm,
          s.income.toFixed(2),
          s.platformEarnings?.Uber || 0,
          s.platformEarnings?.['99'] || 0,
          s.platformEarnings?.InDrive || 0,
          s.platformEarnings?.Outros || 0,
          hourly,
          perKm,
          s.estimatedFuelCost || 0,
          `"${(s.notes || '').replace(/"/g, '""')}"`,
        ].join(';');
      });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `drivewise_relatorio_${CURRENT_DATE_STR}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getBackupJSONString = () => {
    const data = {
      version: '2.0',
      system: 'DriveWise & Ride Copilot',
      exportedAt: new Date().toISOString(),
      user,
      sessions,
      expenses,
      fuelEntries,
      insights,
      rides,
      decisionRules,
      vehicleProfiles,
      overlayPref,
      drivingMode,
      copilotNotifications,
    };
    return JSON.stringify(data, null, 2);
  };

  const importJSON = (jsonString: string): {
    success: boolean;
    message: string;
    count?: { sessions: number; expenses: number; fuel: number; rides: number };
  } => {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, message: 'Arquivo de backup vazio ou formato inválido.' };
      }
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Estrutura JSON inválida.' };
      }

      // Validate presence of at least some DriveWise data
      const hasData =
        data.user ||
        Array.isArray(data.sessions) ||
        Array.isArray(data.expenses) ||
        Array.isArray(data.fuelEntries) ||
        Array.isArray(data.rides);

      if (!hasData) {
        return {
          success: false,
          message: 'O arquivo informado não contém registros válidos do DriveWise.',
        };
      }

      if (data.user && typeof data.user === 'object') {
        setUser((prev) => ({ ...prev, ...data.user }));
      }
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
      }
      if (Array.isArray(data.expenses)) {
        setExpenses(data.expenses);
      }
      if (Array.isArray(data.fuelEntries)) {
        setFuelEntries(data.fuelEntries);
      }
      if (Array.isArray(data.insights)) {
        setInsights(data.insights);
      }
      if (Array.isArray(data.rides)) {
        setRides(data.rides);
      }
      if (data.decisionRules && typeof data.decisionRules === 'object') {
        setDecisionRules((prev) => ({ ...prev, ...data.decisionRules }));
      }
      if (Array.isArray(data.vehicleProfiles)) {
        setVehicleProfiles(data.vehicleProfiles);
      }
      if (data.overlayPref && typeof data.overlayPref === 'object') {
        setOverlayPref((prev) => ({ ...prev, ...data.overlayPref }));
      }
      if (data.drivingMode && typeof data.drivingMode === 'object') {
        setDrivingMode((prev) => ({ ...prev, ...data.drivingMode }));
      }
      if (data.copilotNotifications && typeof data.copilotNotifications === 'object') {
        setCopilotNotifications((prev) => ({ ...prev, ...data.copilotNotifications }));
      }

      return {
        success: true,
        message: 'Backup restaurado com sucesso!',
        count: {
          sessions: Array.isArray(data.sessions) ? data.sessions.length : 0,
          expenses: Array.isArray(data.expenses) ? data.expenses.length : 0,
          fuel: Array.isArray(data.fuelEntries) ? data.fuelEntries.length : 0,
          rides: Array.isArray(data.rides) ? data.rides.length : 0,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Falha ao processar arquivo: ${err?.message || 'JSON mal formatado'}`,
      };
    }
  };

  const exportJSON = () => {
    const jsonStr = getBackupJSONString();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivewise_copilot_backup_${CURRENT_DATE_STR}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetToSampleData = () => {
    setUser(initialUserProfile);
    setSessions(initialSessions);
    setExpenses(initialExpenses);
    setFuelEntries(initialFuelEntries);
    setInsights(initialSmartInsights);
    setRides(initialRideOpportunities);
    setDecisionRules(defaultDecisionRules);
    setVehicleProfiles(defaultVehicleProfiles);
    setOverlayPref(defaultOverlayPreference);
    setDrivingMode(defaultDrivingModeSettings);
    setCopilotNotifications(defaultCopilotNotifications);
    setLastAnalyzedRide(initialRideOpportunities[initialRideOpportunities.length - 1] || null);
    setActiveSession(null);
    setCurrentGpsDistance(0);
    localStorage.clear();
  };

  const clearAllWorkData = () => {
    setSessions([]);
    setExpenses([]);
    setFuelEntries([]);
    setRides([]);
    setActiveSession(null);
    setCurrentGpsDistance(0);
    setCurrentSpeedKmH(0);
    setLastAnalyzedRide(null);
    try {
      localStorage.setItem(`${STORAGE_KEY}_sessions`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_fuel`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_fuelEntries`, JSON.stringify([]));
      localStorage.setItem(`${STORAGE_KEY}_rides`, JSON.stringify([]));
      localStorage.removeItem(`${STORAGE_KEY}_active_session`);
      localStorage.removeItem(`${STORAGE_KEY}_activeSession`);
      // Also clear legacy v1 keys
      localStorage.removeItem('drivewise_state_v1_sessions');
      localStorage.removeItem('drivewise_state_v1_expenses');
      localStorage.removeItem('drivewise_state_v1_fuel');
      localStorage.removeItem('drivewise_state_v1_rides');
      localStorage.removeItem('drivewise_state_v1_active_session');
    } catch {}
  };

  return (
    <DriveWiseContext.Provider
      value={{
        user,
        updateUser,
        firebaseUser,
        isAuthLoading,
        cloudSyncStatus,
        lastCloudSync,
        loginWithGoogle,
        logoutFromCloud,
        syncDataToCloud,
        isCloudConfigured,
        sessions,
        activeSession,
        isJourneyActive,
        elapsedSeconds,
        currentGpsDistance,
        isSimulatingMovement,
        gpsStatus,
        gpsAccuracy,
        currentCoords,
        currentSpeedKmH,
        toggleMovementSimulation,
        startJourney,
        endJourney,
        cancelActiveJourney,
        addSession,
        updateSession,
        deleteSession,
        expenses,
        addExpense,
        deleteExpense,
        fuelEntries,
        addFuelEntry,
        deleteFuelEntry,
        insights,
        dismissInsight,
        postJourneyData,
        closePostJourneyModal,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isExpenseModalOpen,
        setIsExpenseModalOpen,
        isFuelModalOpen,
        setIsFuelModalOpen,
        exportCSV,
        exportJSON,
        importJSON,
        getBackupJSONString,
        resetToSampleData,
        clearAllWorkData,
        currentDateStr: CURRENT_DATE_STR,

        // Ride Copilot
        rides,
        addRideOpportunity,
        updateRideOpportunity,
        deleteRideOpportunity,
        acceptRideOpportunity,
        rejectRideOpportunity,
        completeRideOpportunity,
        cancelRideOpportunity,
        rerouteOrUpdateRide,
        triggerSimultaneousRides,
        lastAnalyzedRide,
        setLastAnalyzedRide,
        decisionRules,
        updateDecisionRules,
        vehicleProfiles,
        activeVehicleProfile,
        updateVehicleProfile,
        addVehicleProfile,
        setActiveVehicleProfile,
        overlayPref,
        updateOverlayPref,
        toggleOverlay,
        toggleOverlayExpanded,
        drivingMode,
        updateDrivingMode,
        toggleDrivingMode,
        copilotNotifications,
        updateCopilotNotifications,
        isRideAnalysisModalOpen,
        setIsRideAnalysisModalOpen,
        isSimulatorOpen,
        setIsSimulatorOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        hasOverlayPermission,
        isOverlayPermissionModalOpen,
        setIsOverlayPermissionModalOpen,
        grantOverlayPermission,
        dismissOverlayPermissionModal,
        isMinimalistMode,
        setIsMinimalistMode,
        toggleMinimalistMode,

        // Subscription & Trial
        subscription,
        isSubscriptionSystemOnline: subscription.isSystemOnline,
        isTrialActive,
        isTrialExpired,
        trialDaysRemaining,
        isPro,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        toggleSubscriptionSystem,
        activateSubscription,
        cancelSubscription,
        resetTrial,
        simulateTrialDaysRemaining,
      }}
    >
      {children}
    </DriveWiseContext.Provider>
  );
};

export function useDriveWise(): DriveWiseContextType {
  const context = useContext(DriveWiseContext);
  if (!context) {
    throw new Error('useDriveWise must be used within a DriveWiseProvider');
  }
  return context;
}
