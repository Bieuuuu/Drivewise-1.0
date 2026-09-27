import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  UserProfile,
  WorkSession,
  Expense,
  FuelEntry,
  RideOpportunity,
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  };
}

/**
 * Recursively strips `undefined` properties so Firestore setDoc / batch.set never throws
 * "Unsupported field value: undefined".
 */
function sanitizeForFirestore<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof value === 'object' && !(value instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean as T;
  }
  return value;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncUserProfileToCloud(uid: string, profile: UserProfile): Promise<void> {
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...profile,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncSessionToCloud(uid: string, session: WorkSession): Promise<void> {
  const path = `users/${uid}/sessions/${session.id}`;
  try {
    const ref = doc(db, 'users', uid, 'sessions', session.id);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...session,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSessionFromCloud(uid: string, sessionId: string): Promise<void> {
  const path = `users/${uid}/sessions/${sessionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'sessions', sessionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncExpenseToCloud(uid: string, expense: Expense): Promise<void> {
  const path = `users/${uid}/expenses/${expense.id}`;
  try {
    const ref = doc(db, 'users', uid, 'expenses', expense.id);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...expense,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromCloud(uid: string, expenseId: string): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncFuelToCloud(uid: string, entry: FuelEntry): Promise<void> {
  const path = `users/${uid}/fuelEntries/${entry.id}`;
  try {
    const ref = doc(db, 'users', uid, 'fuelEntries', entry.id);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...entry,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFuelFromCloud(uid: string, entryId: string): Promise<void> {
  const path = `users/${uid}/fuelEntries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'fuelEntries', entryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncRideToCloud(uid: string, ride: RideOpportunity): Promise<void> {
  const path = `users/${uid}/rides/${ride.id}`;
  try {
    const ref = doc(db, 'users', uid, 'rides', ride.id);
    await setDoc(
      ref,
      sanitizeForFirestore({
        ...ride,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncAllToCloud(
  uid: string,
  payload: {
    user: UserProfile;
    sessions: WorkSession[];
    expenses: Expense[];
    fuelEntries: FuelEntry[];
    rides: RideOpportunity[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();

    const userRef = doc(db, 'users', uid);
    batch.set(
      userRef,
      sanitizeForFirestore({ ...payload.user, updatedAt: now }),
      { merge: true }
    );

    payload.sessions.slice(0, 100).forEach((s) => {
      const ref = doc(db, 'users', uid, 'sessions', s.id);
      batch.set(ref, sanitizeForFirestore({ ...s, updatedAt: now }), { merge: true });
    });

    payload.expenses.slice(0, 100).forEach((e) => {
      const ref = doc(db, 'users', uid, 'expenses', e.id);
      batch.set(ref, sanitizeForFirestore({ ...e, updatedAt: now }), { merge: true });
    });

    payload.fuelEntries.slice(0, 100).forEach((f) => {
      const ref = doc(db, 'users', uid, 'fuelEntries', f.id);
      batch.set(ref, sanitizeForFirestore({ ...f, updatedAt: now }), { merge: true });
    });

    payload.rides.slice(0, 100).forEach((r) => {
      const ref = doc(db, 'users', uid, 'rides', r.id);
      batch.set(ref, sanitizeForFirestore({ ...r, updatedAt: now }), { merge: true });
    });

    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.warn('Batch sync failed:', error);
    return { success: false, error: error?.message || 'Erro ao sincronizar com o Firestore' };
  }
}

export async function fetchAllFromCloud(uid: string): Promise<{
  success: boolean;
  data?: {
    user?: UserProfile;
    sessions: WorkSession[];
    expenses: Expense[];
    fuelEntries: FuelEntry[];
    rides: RideOpportunity[];
  };
  error?: string;
}> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.exists() ? (userDoc.data() as UserProfile) : undefined;

    const sessionsSnap = await getDocs(
      query(collection(db, 'users', uid, 'sessions'), orderBy('date', 'desc'), limit(100))
    );
    const sessions: WorkSession[] = [];
    sessionsSnap.forEach((d) => sessions.push(d.data() as WorkSession));

    const expensesSnap = await getDocs(
      query(collection(db, 'users', uid, 'expenses'), orderBy('date', 'desc'), limit(100))
    );
    const expenses: Expense[] = [];
    expensesSnap.forEach((d) => expenses.push(d.data() as Expense));

    const fuelSnap = await getDocs(
      query(collection(db, 'users', uid, 'fuelEntries'), orderBy('date', 'desc'), limit(100))
    );
    const fuelEntries: FuelEntry[] = [];
    fuelSnap.forEach((d) => fuelEntries.push(d.data() as FuelEntry));

    const ridesSnap = await getDocs(query(collection(db, 'users', uid, 'rides'), limit(100)));
    const rides: RideOpportunity[] = [];
    ridesSnap.forEach((d) => rides.push(d.data() as RideOpportunity));

    return {
      success: true,
      data: {
        user: userData,
        sessions,
        expenses,
        fuelEntries,
        rides,
      },
    };
  } catch (error: any) {
    console.warn('Fetch from cloud failed:', error);
    return { success: false, error: error?.message || 'Erro ao baixar dados da nuvem' };
  }
}
