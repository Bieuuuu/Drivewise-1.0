import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { UserProfile, WorkSession, Expense, FuelEntry, RideOpportunity } from '../types';

export interface CloudSyncResult {
  success: boolean;
  message: string;
  data?: {
    user?: UserProfile;
    sessions?: WorkSession[];
    expenses?: Expense[];
    fuelEntries?: FuelEntry[];
    rides?: RideOpportunity[];
  };
}

/**
 * Sync entire driver state to Firestore in the background
 */
export async function syncAllToCloud(
  userId: string,
  state: {
    user: UserProfile;
    sessions: WorkSession[];
    expenses: Expense[];
    fuelEntries: FuelEntry[];
    rides: RideOpportunity[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'Usuário não autenticado' };

  try {
    // 1. Save user profile
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        ...state.user,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // 2. Batch write recent sessions (up to 100)
    for (const session of state.sessions.slice(0, 50)) {
      if (!session.id) continue;
      const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
      await setDoc(
        sessionRef,
        {
          ...session,
          userId,
        },
        { merge: true }
      );
    }

    // 3. Batch write expenses
    for (const exp of state.expenses.slice(0, 50)) {
      if (!exp.id) continue;
      const expRef = doc(db, 'users', userId, 'expenses', exp.id);
      await setDoc(
        expRef,
        {
          ...exp,
          userId,
        },
        { merge: true }
      );
    }

    // 4. Batch write fuel entries
    for (const fuel of state.fuelEntries.slice(0, 50)) {
      if (!fuel.id) continue;
      const fuelRef = doc(db, 'users', userId, 'fuelEntries', fuel.id);
      await setDoc(
        fuelRef,
        {
          ...fuel,
          userId,
        },
        { merge: true }
      );
    }

    // 5. Batch write rides opportunities
    for (const ride of (state.rides || []).slice(0, 50)) {
      if (!ride.id) continue;
      const rideRef = doc(db, 'users', userId, 'rides', ride.id);
      await setDoc(
        rideRef,
        {
          ...ride,
          userId,
        },
        { merge: true }
      );
    }

    return { success: true };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}`);
    return { success: false, error: err instanceof Error ? err.message : 'Falha na sincronização' };
  }
}

/**
 * Fetch all driver data from Firestore
 */
export async function fetchAllFromCloud(userId: string): Promise<CloudSyncResult> {
  if (!userId) {
    return { success: false, message: 'Usuário não autenticado' };
  }

  try {
    // Fetch profile
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);

    // Fetch sessions
    const sessionsCol = collection(db, 'users', userId, 'sessions');
    const sessionsSnap = await getDocs(sessionsCol);
    const sessions: WorkSession[] = [];
    sessionsSnap.forEach((d) => sessions.push(d.data() as WorkSession));

    // Fetch expenses
    const expensesCol = collection(db, 'users', userId, 'expenses');
    const expensesSnap = await getDocs(expensesCol);
    const expenses: Expense[] = [];
    expensesSnap.forEach((d) => expenses.push(d.data() as Expense));

    // Fetch fuel entries
    const fuelCol = collection(db, 'users', userId, 'fuelEntries');
    const fuelSnap = await getDocs(fuelCol);
    const fuelEntries: FuelEntry[] = [];
    fuelSnap.forEach((d) => fuelEntries.push(d.data() as FuelEntry));

    // Fetch rides
    const ridesCol = collection(db, 'users', userId, 'rides');
    const ridesSnap = await getDocs(ridesCol);
    const rides: RideOpportunity[] = [];
    ridesSnap.forEach((d) => rides.push(d.data() as RideOpportunity));

    const userData = userSnap.exists() ? (userSnap.data() as UserProfile) : undefined;

    return {
      success: true,
      message: 'Dados recuperados com sucesso da nuvem',
      data: {
        user: userData,
        sessions: sessions.length > 0 ? sessions : undefined,
        expenses: expenses.length > 0 ? expenses : undefined,
        fuelEntries: fuelEntries.length > 0 ? fuelEntries : undefined,
        rides: rides.length > 0 ? rides : undefined,
      },
    };
  } catch (err: unknown) {
    handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Falha ao buscar dados na nuvem',
    };
  }
}
