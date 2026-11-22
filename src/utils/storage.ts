import type {
  CodeEntry,
  MolePalette,
  PrizeRates,
  PrizeResult,
  WinnerLog,
} from '../types/game';

export const STORAGE_KEYS = {
  CODES: 'mogumogu_jp_codes_v1',
  LOGS: 'mogumogu_jp_logs_v1',
  RATES: 'mogumogu_jp_rates_v1',
} as const;

export const DEFAULT_FREE_FOOD_RATE = 25;
export const ADMIN_PASSWORD = '2323';

export const MOLE_COLOR_PALETTES: MolePalette[] = [
  { name: 'Sakura Pink', body: '#FF8FAB', belly: '#FFE5EC', band: '#FFFFFF', dot: '#E63946', paws: '#FFB3C6' },
  { name: 'Matcha Green', body: '#74C69D', belly: '#D8F3DC', band: '#FFF3B0', dot: '#E63946', paws: '#95D5B2' },
  { name: 'Yuzu Yellow', body: '#FFD166', belly: '#FFF8D6', band: '#FFFFFF', dot: '#FF6B6B', paws: '#FFE08A' },
  { name: 'Ramune Blue', body: '#72EFDD', belly: '#E0FBFC', band: '#FFFFFF', dot: '#3A86FF', paws: '#9BF6FF' },
  { name: 'Taro Purple', body: '#BDB2FF', belly: '#F3F0FF', band: '#FFF3B0', dot: '#FF758F', paws: '#D8D2FF' },
  { name: 'Peach Coral', body: '#FF9F68', belly: '#FFE8D6', band: '#FFFFFF', dot: '#D9385A', paws: '#FFBE98' },
  { name: 'Caramel Mocha', body: '#9C6644', belly: '#FDE4CF', band: '#FFFFFF', dot: '#E63946', paws: '#DDB892' },
  { name: 'Sky Soda', body: '#8ECAE6', belly: '#E8F6FC', band: '#FFF3B0', dot: '#FB8500', paws: '#B8E0F2' },
  { name: 'Cream Mochi', body: '#F4A261', belly: '#FFFDF7', band: '#FFCCD5', dot: '#E63946', paws: '#F8C291' },
];

export function shuffleMolePalettes(): MolePalette[] {
  return [...MOLE_COLOR_PALETTES].sort(() => Math.random() - 0.5);
}

export function initStorage(): void {
  try {
    if (!localStorage.getItem(STORAGE_KEYS.CODES)) {
      const initialCodes: CodeEntry[] = [
        {
          code: '8888',
          maxUses: 3,
          usedCount: 0,
          redeemed: false,
          redeemedBy: '',
          createdAt: new Date().toLocaleString('th-TH'),
        },
      ];
      localStorage.setItem(STORAGE_KEYS.CODES, JSON.stringify(initialCodes));
    }

    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    }

    if (!localStorage.getItem(STORAGE_KEYS.RATES)) {
      localStorage.setItem(
        STORAGE_KEYS.RATES,
        JSON.stringify({ freeFoodRate: DEFAULT_FREE_FOOD_RATE }),
      );
    }
  } catch (err) {
    console.error('LocalStorage Init Error:', err);
  }
}

export function getCodes(): CodeEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CODES);
    return raw ? (JSON.parse(raw) as CodeEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveCodes(codes: CodeEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.CODES, JSON.stringify(codes));
}

export function getLogs(): WinnerLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
    return raw ? (JSON.parse(raw) as WinnerLog[]) : [];
  } catch {
    return [];
  }
}

export function saveLogs(logs: WinnerLog[]): void {
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

export function getPrizeRates(): PrizeRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RATES);
    const parsed = raw ? (JSON.parse(raw) as { freeFoodRate?: number }) : null;
    const freeFood =
      parsed && typeof parsed.freeFoodRate === 'number'
        ? Math.min(100, Math.max(0, parsed.freeFoodRate))
        : DEFAULT_FREE_FOOD_RATE;
    return {
      freeFoodRate: freeFood,
      discountRate: 100 - freeFood,
    };
  } catch {
    return {
      freeFoodRate: DEFAULT_FREE_FOOD_RATE,
      discountRate: 100 - DEFAULT_FREE_FOOD_RATE,
    };
  }
}

export function saveFreeFoodRate(freeFoodRate: number): void {
  const clamped = Math.min(100, Math.max(0, freeFoodRate));
  localStorage.setItem(
    STORAGE_KEYS.RATES,
    JSON.stringify({ freeFoodRate: clamped }),
  );
}

function getSecureRandomPercentage(): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] / (0xffffffff + 1)) * 100;
  }
  return Math.random() * 100;
}

export function rollPrizeByProbability(overrideFreeFoodRate?: number): PrizeResult {
  const freeFoodRate =
    typeof overrideFreeFoodRate === 'number'
      ? Math.min(100, Math.max(0, overrideFreeFoodRate))
      : getPrizeRates().freeFoodRate;
  const roll = getSecureRandomPercentage();

  if (roll < freeFoodRate) {
    return {
      type: 'FREE_FOOD',
      title: 'แจกอาหารฟรี!',
      subtitle: 'คูปองรับประทานอาหารฟรี 1 เมนูที่ร่วมรายการ',
      icon: '🍱',
    };
  }

  return {
    type: 'DISCOUNT_50',
    title: 'ส่วนลด 50%!',
    subtitle: 'คูปองส่วนลดค่าอาหาร 50% สำหรับบิลถัดไปหรือเมนูที่ร่วมรายการ',
    icon: '🎟️',
  };
}
