import {useEffect, useState} from 'react';
import {AdminModal} from './components/AdminModal';
import {GameBoardView} from './components/GameBoardView';
import {PlayerEntryView} from './components/PlayerEntryView';
import {PrizeModal} from './components/PrizeModal';
import {SakuraPetals} from './components/SakuraPetals';
import type {
  ActivePrizePopup,
  GameScreen,
  GameSession,
  MolePalette,
  PrizeRates,
} from './types/game';
import {
  consumePlayAndRecordPrize,
  redeemUnlockCode,
  subscribeActiveCode,
  subscribePrizeRates,
} from './utils/firestoreService';
import {playSoundEffect, type SoundEffectType} from './utils/sound';
import {
  DEFAULT_FREE_FOOD_RATE,
  MOLE_COLOR_PALETTES,
  shuffleMolePalettes,
} from './utils/storage';

const INITIAL_SESSION: GameSession = {
  playerName: '',
  code: '',
  totalUses: 0,
  usedCount: 0,
  isLocked: false,
};

const INITIAL_RATES: PrizeRates = {
  freeFoodRate: DEFAULT_FREE_FOOD_RATE,
  discountRate: 100 - DEFAULT_FREE_FOOD_RATE,
};

export default function App() {
  const [screen, setScreen] = useState<GameScreen>('ENTRY');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [session, setSession] = useState<GameSession>(INITIAL_SESSION);
  const [livePrizeRates, setLivePrizeRates] = useState<PrizeRates>(INITIAL_RATES);
  const [molePalettes, setMolePalettes] = useState<MolePalette[]>(MOLE_COLOR_PALETTES);
  const [boardKey, setBoardKey] = useState(0);
  const [prizePopup, setPrizePopup] = useState<ActivePrizePopup | null>(null);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminPinVerified, setIsAdminPinVerified] = useState(false);

  // Real-time subscription to global prize rates
  useEffect(() => {
    const unsubscribe = subscribePrizeRates(
      (rates) => setLivePrizeRates(rates),
      () => {
        // Keep current rate fallback silently on transient read error
      },
    );
    return () => unsubscribe();
  }, []);

  // Real-time subscription to active player's code during gameplay
  useEffect(() => {
    if (screen !== 'PLAYING' || !session.code) return;
    const unsubscribe = subscribeActiveCode(
      session.code,
      (entry) => {
        if (!entry) return;
        setSession((prev) => {
          if (prev.code !== entry.code) return prev;
          return {
            ...prev,
            totalUses: entry.maxUses,
            usedCount: Math.max(prev.usedCount, entry.usedCount),
          };
        });
      },
      () => {
        // Ignore transient disconnect while playing
      },
    );
    return () => unsubscribe();
  }, [screen, session.code]);

  const triggerSound = (type: SoundEffectType) => {
    playSoundEffect(type, soundEnabled);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) {
      playSoundEffect('click', true);
    }
  };

  const handleStartGame = async (
    playerName: string,
    codeInput: string,
  ): Promise<string | null> => {
    const res = await redeemUnlockCode(codeInput, playerName);
    if (!res.ok) {
      return res.error;
    }

    setSession({
      playerName,
      code: res.entry.code,
      totalUses: res.entry.maxUses,
      usedCount: res.entry.usedCount,
      isLocked: false,
    });
    setMolePalettes(shuffleMolePalettes());
    setBoardKey((k) => k + 1);
    setPrizePopup(null);
    setScreen('PLAYING');
    triggerSound('pop');
    return null;
  };

  const handleWhackHole = async (): Promise<ActivePrizePopup | null> => {
    if (session.isLocked) return null;
    const remaining = session.totalUses - session.usedCount;
    if (remaining <= 0) {
      triggerSound('error');
      return null;
    }

    setSession((prev) => ({
      ...prev,
      isLocked: true,
    }));

    const outcome = await consumePlayAndRecordPrize(
      session.code,
      session.playerName,
      livePrizeRates,
    );

    if (!outcome) {
      return null;
    }

    setSession((prev) => ({
      ...prev,
      usedCount: outcome.nextUsedCount,
      isLocked: true,
    }));

    return {
      prize: outcome.prize,
      refId: outcome.refId,
      timestamp: outcome.timestamp,
    };
  };

  const handleUnlockBoardOnError = () => {
    setSession((prev) => ({
      ...prev,
      isLocked: false,
    }));
  };

  const handleShowPrizePopup = (popup: ActivePrizePopup) => {
    setPrizePopup(popup);
  };

  const handleExitToEntry = () => {
    triggerSound('click');
    setPrizePopup(null);
    setSession(INITIAL_SESSION);
    setScreen('ENTRY');
  };

  const handleContinueNextPlay = () => {
    triggerSound('click');
    setPrizePopup(null);
    setSession((prev) => ({...prev, isLocked: false}));
    setMolePalettes(shuffleMolePalettes());
    setBoardKey((k) => k + 1);
  };

  const handleFinishAndReturn = () => {
    handleExitToEntry();
  };

  const remainingPlays = Math.max(0, session.totalUses - session.usedCount);

  return (
    <div className="jp-pattern text-[#4A3531] relative min-h-screen flex flex-col justify-between">
      <SakuraPetals />

      <header className="w-full relative z-20 pt-3 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between bg-white/90 backdrop-blur-sm border-4 border-[#4A3531] rounded-3xl px-4 py-2.5 shadow-[0_5px_0_#4A3531]">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl bg-[#FF758F] border-2 border-[#4A3531] flex items-center justify-center text-white font-bold text-xl shadow-inner shrink-0"
              aria-hidden="true"
            >
              🐹
            </div>
            <div>
              <h1 className="font-cute font-bold text-base sm:text-xl text-[#D9385A] leading-tight">
                โมกุโมกุ! ทุบตุ่นนำโชค
              </h1>
              <p className="text-[11px] sm:text-xs text-[#7D5A50] font-medium">
                เทศกาลลุ้นรางวัลสุดคิ้วท์ 🌸
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="soundToggleBtn"
              onClick={handleToggleSound}
              title="เปิด/ปิดเสียงเอฟเฟกต์"
              className="kawaii-btn bg-[#FFF3B0] hover:bg-[#FFE66D] text-[#4A3531] p-2 sm:px-3 sm:py-2 rounded-2xl text-sm font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span id="soundIcon" aria-hidden="true">
                {soundEnabled ? '🔊' : '🔇'}
              </span>
              <span className="hidden sm:inline" id="soundLabel">
                {soundEnabled ? 'เปิดเสียง' : 'ปิดเสียง'}
              </span>
            </button>
            <button
              type="button"
              id="navAdminBtn"
              onClick={() => {
                triggerSound('click');
                setIsAdminOpen(true);
              }}
              className="kawaii-btn bg-[#E2ECE9] hover:bg-[#CDE0DA] text-[#4A3531] px-3 py-2 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span aria-hidden="true">🔑</span>
              <span>แอดมิน</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-3 py-6 relative z-10">
        {screen === 'ENTRY' ? (
          <PlayerEntryView onStartGame={handleStartGame} onPlaySound={triggerSound} />
        ) : (
          <GameBoardView
            session={session}
            palettes={molePalettes}
            boardKey={boardKey}
            onWhackHole={handleWhackHole}
            onShowPrizePopup={handleShowPrizePopup}
            onUnlockBoardOnError={handleUnlockBoardOnError}
            onExit={handleExitToEntry}
            onPlaySound={triggerSound}
          />
        )}
      </main>

      <footer className="w-full text-center py-3 px-4 text-xs text-[#7D5A50] relative z-10">
        🌸 กิจกรรมทุบตุ่นลุ้นรางวัลสุดพิเศษ • เล่นง่าย ลุ้นสนุกทุกสิทธิ์ 🌸
      </footer>

      <PrizeModal
        popup={prizePopup}
        playerName={session.playerName}
        code={session.code}
        remainingPlays={remainingPlays}
        onContinueNext={handleContinueNextPlay}
        onFinishAndReturn={handleFinishAndReturn}
      />

      <AdminModal
        isOpen={isAdminOpen}
        isPinVerified={isAdminPinVerified}
        livePrizeRates={livePrizeRates}
        onPinVerified={() => setIsAdminPinVerified(true)}
        onClose={() => {
          triggerSound('click');
          setIsAdminOpen(false);
        }}
        onPlaySound={triggerSound}
      />
    </div>
  );
}
