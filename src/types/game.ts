export type GameScreen = 'ENTRY' | 'PLAYING';

export type MoleVisualState = 'up' | 'bonked' | 'hidden-down' | 'holding-prize';

export type PrizeType = 'FREE_FOOD' | 'DISCOUNT_50';

export interface CodeEntry {
  code: string;
  maxUses: number;
  usedCount: number;
  redeemed: boolean;
  redeemedBy: string;
  redeemedAt?: string;
  createdAt: string;
}

export interface WinnerLog {
  id?: string;
  refId: string;
  timestamp: string;
  playerName: string;
  code: string;
  prizeType: PrizeType;
  prizeTitle: string;
}

export interface PrizeRates {
  freeFoodRate: number;
  discountRate: number;
}

export interface PrizeResult {
  type: PrizeType;
  title: string;
  subtitle: string;
  icon: string;
}

export interface GameSession {
  playerName: string;
  code: string;
  totalUses: number;
  usedCount: number;
  isLocked: boolean;
}

export interface MolePalette {
  name: string;
  body: string;
  belly: string;
  band: string;
  dot: string;
  paws: string;
}

export interface ActivePrizePopup {
  prize: PrizeResult;
  refId: string;
  timestamp: string;
}
