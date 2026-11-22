/**
 * Phase 0 Security Test Specification for Mogu-Mogu Matsuri Firestore Rules.
 * Verifies invariants and Dirty Dozen adversarial payload rejections.
 */

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'List Scraping Codes by non-admin',
    operation: 'list',
    path: '/codes',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unauthorized Code Creation by non-admin',
    operation: 'create',
    path: '/codes/9999',
    payload: {
      code: '9999',
      maxUses: 10,
      usedCount: 0,
      redeemed: false,
      redeemedBy: '',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Re-redeeming an already redeemed code',
    operation: 'update',
    path: '/codes/8888',
    payload: {
      redeemed: false,
      redeemedBy: 'Attacker',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Increasing maxUses during play',
    operation: 'update',
    path: '/codes/8888',
    payload: {
      maxUses: 99,
      usedCount: 1,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow field injection on CodeEntry',
    operation: 'update',
    path: '/codes/8888',
    payload: {
      usedCount: 1,
      isVip: true,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Skipping or decrementing usedCount',
    operation: 'update',
    path: '/codes/8888',
    payload: {
      usedCount: -1,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Creating WinnerLog without atomic code consumption',
    operation: 'create',
    path: '/logs/fake-log-1',
    payload: {
      refId: 'MG-123456',
      playerName: 'Cheater',
      code: '8888',
      prizeType: 'FREE_FOOD',
      prizeTitle: 'แจกอาหารฟรี!',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'WinnerLog playerName mismatch against redeemedBy',
    operation: 'create',
    path: '/logs/spoof-log-1',
    payload: {
      refId: 'MG-654321',
      playerName: 'DifferentPerson',
      code: '8888',
      prizeType: 'FREE_FOOD',
      prizeTitle: 'แจกอาหารฟรี!',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-forged timestamp on WinnerLog',
    operation: 'create',
    path: '/logs/forged-time-1',
    payload: {
      refId: 'MG-111111',
      playerName: 'Mochi',
      code: '8888',
      prizeType: 'DISCOUNT_50',
      prizeTitle: 'ส่วนลด 50%!',
      createdAt: '2020-01-01T00:00:00Z',
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Unauthorized listing of WinnerLogs',
    operation: 'list',
    path: '/logs',
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized modification of PrizeSettings',
    operation: 'update',
    path: '/settings/prizeRates',
    payload: {
      freeFoodRate: 100,
    },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unverified admin email spoofing attempt',
    operation: 'delete',
    path: '/codes/8888',
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
