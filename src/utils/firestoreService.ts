import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import {OperationType, db, handleFirestoreError} from '../firebase';
import type {CodeEntry, PrizeRates, PrizeResult, WinnerLog} from '../types/game';
import {DEFAULT_FREE_FOOD_RATE, rollPrizeByProbability} from './storage';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'chat4kwankao@gmail.com';

function formatTimestamp(ts: unknown): string {
  if (ts instanceof Timestamp) {
    return ts.toDate().toLocaleString('th-TH');
  }
  if (typeof ts === 'string') {
    return ts;
  }
  return '-';
}

export function subscribePrizeRates(
  onUpdate: (rates: PrizeRates) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = 'settings/prizeRates';
  const ref = doc(db, 'settings', 'prizeRates');

  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const freeFood =
          typeof data.freeFoodRate === 'number'
            ? Math.min(100, Math.max(0, Math.round(data.freeFoodRate)))
            : DEFAULT_FREE_FOOD_RATE;
        onUpdate({
          freeFoodRate: freeFood,
          discountRate: 100 - freeFood,
        });
      } else {
        onUpdate({
          freeFoodRate: DEFAULT_FREE_FOOD_RATE,
          discountRate: 100 - DEFAULT_FREE_FOOD_RATE,
        });
      }
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    },
  );
}

export function subscribeActiveCode(
  codeId: string,
  onUpdate: (entry: CodeEntry | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `codes/${codeId}`;
  const ref = doc(db, 'codes', codeId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const d = snap.data();
      onUpdate({
        code: String(d.code ?? codeId),
        maxUses: Number(d.maxUses ?? 0),
        usedCount: Number(d.usedCount ?? 0),
        redeemed: Boolean(d.redeemed),
        redeemedBy: String(d.redeemedBy ?? ''),
        redeemedAt: d.redeemedAt ? formatTimestamp(d.redeemedAt) : undefined,
        createdAt: formatTimestamp(d.createdAt),
      });
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, path);
      }
    },
  );
}

export async function redeemUnlockCode(
  codeId: string,
  playerName: string,
): Promise<{ok: true; entry: CodeEntry} | {ok: false; error: string}> {
  const cleanName = playerName.trim().slice(0, 25);
  const path = `codes/${codeId}`;
  const codeRef = doc(db, 'codes', codeId);

  try {
    const result = await runTransaction(db, async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists()) {
        return {
          ok: false as const,
          error: '❌ ไม่พบรหัสโค้ดนี้ในระบบ กรุณาตรวจสอบกับพนักงานอีกครั้ง',
        };
      }

      const d = snap.data();
      const maxUses = Number(d.maxUses ?? 0);
      const usedCount = Number(d.usedCount ?? 0);
      const redeemed = Boolean(d.redeemed);
      const redeemedBy = String(d.redeemedBy ?? '');

      if (redeemed || usedCount >= maxUses) {
        const usedByText = redeemedBy ? ` (โดยคุณ ${redeemedBy})` : '';
        return {
          ok: false as const,
          error: `🚫 รหัสโค้ด ${codeId} นี้ถูกใช้งานไปแล้ว${usedByText} 1 โค้ดใช้ได้ 1 ครั้งเท่านั้น!`,
        };
      }

      tx.update(codeRef, {
        redeemed: true,
        redeemedBy: cleanName,
        redeemedAt: serverTimestamp(),
      });

      return {
        ok: true as const,
        entry: {
          code: String(d.code ?? codeId),
          maxUses,
          usedCount,
          redeemed: true,
          redeemedBy: cleanName,
          createdAt: formatTimestamp(d.createdAt),
        },
      };
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function consumePlayAndRecordPrize(
  codeId: string,
  playerName: string,
  prizeRates: PrizeRates,
): Promise<{
  prize: PrizeResult;
  refId: string;
  timestamp: string;
  nextUsedCount: number;
} | null> {
  const cleanName = playerName.trim().slice(0, 25);
  const codeRef = doc(db, 'codes', codeId);
  const logRef = doc(collection(db, 'logs'));
  const prize = rollPrizeByProbability(prizeRates.freeFoodRate);
  const refId = `MG-${Math.floor(100000 + Math.random() * 900000)}`;
  const displayTimestamp = new Date().toLocaleString('th-TH');

  try {
    const nextUsedCount = await runTransaction(db, async (tx) => {
      const snap = await tx.get(codeRef);
      if (!snap.exists()) {
        return null;
      }

      const d = snap.data();
      const maxUses = Number(d.maxUses ?? 0);
      const usedCount = Number(d.usedCount ?? 0);
      const redeemed = Boolean(d.redeemed);

      if (!redeemed || usedCount >= maxUses) {
        return null;
      }

      const incremented = usedCount + 1;
      tx.update(codeRef, {
        usedCount: incremented,
      });

      tx.set(logRef, {
        refId,
        playerName: cleanName,
        code: codeId,
        prizeType: prize.type,
        prizeTitle: prize.title,
        createdAt: serverTimestamp(),
      });

      return incremented;
    });

    if (nextUsedCount === null) {
      return null;
    }

    return {
      prize,
      refId,
      timestamp: displayTimestamp,
      nextUsedCount,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `codes/${codeId}`);
  }
}

export async function verifyAdminAccess(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (
    user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() &&
    user.emailVerified
  ) {
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

export async function ensureInitialFirestoreDefaults(): Promise<void> {
  try {
    const settingsRef = doc(db, 'settings', 'prizeRates');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, {
        freeFoodRate: DEFAULT_FREE_FOOD_RATE,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings/prizeRates');
  }
}

export function subscribeAllCodes(
  onUpdate: (codes: CodeEntry[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const path = 'codes';
  const q = query(collection(db, 'codes'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const items: CodeEntry[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          code: String(d.code ?? docSnap.id),
          maxUses: Number(d.maxUses ?? 0),
          usedCount: Number(d.usedCount ?? 0),
          redeemed: Boolean(d.redeemed),
          redeemedBy: String(d.redeemedBy ?? ''),
          redeemedAt: d.redeemedAt ? formatTimestamp(d.redeemedAt) : undefined,
          createdAt: formatTimestamp(d.createdAt),
        };
      });
      onUpdate(items);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeAllLogs(
  onUpdate: (logs: WinnerLog[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const path = 'logs';
  const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const items: WinnerLog[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          refId: String(d.refId ?? ''),
          timestamp: formatTimestamp(d.createdAt),
          playerName: String(d.playerName ?? ''),
          code: String(d.code ?? ''),
          prizeType: d.prizeType === 'FREE_FOOD' ? 'FREE_FOOD' : 'DISCOUNT_50',
          prizeTitle: String(d.prizeTitle ?? ''),
        };
      });
      onUpdate(items);
    },
    (error) => {
      onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function createCodeInFirestore(code: string, maxUses: number): Promise<void> {
  const path = `codes/${code}`;
  const ref = doc(db, 'codes', code);
  try {
    await setDoc(ref, {
      code,
      maxUses: Math.min(99, Math.max(1, Math.round(maxUses))),
      usedCount: 0,
      redeemed: false,
      redeemedBy: '',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCodeInFirestore(code: string): Promise<void> {
  const path = `codes/${code}`;
  try {
    await deleteDoc(doc(db, 'codes', code));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePrizeRateInFirestore(freeFoodRate: number): Promise<void> {
  const path = 'settings/prizeRates';
  const clamped = Math.min(100, Math.max(0, Math.round(freeFoodRate)));
  try {
    await setDoc(doc(db, 'settings', 'prizeRates'), {
      freeFoodRate: clamped,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function clearAllLogsInFirestore(): Promise<void> {
  const path = 'logs';
  try {
    const snap = await getDocs(collection(db, 'logs'));
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 450) {
      const batch = writeBatch(db);
      docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
