import {useEffect, useRef, useState} from 'react';
import type {ActivePrizePopup, GameSession, MolePalette, MoleVisualState} from '../types/game';
import type {SoundEffectType} from '../utils/sound';
import {HammerSvg, MoleSvg} from './MoleSvg';

interface GameBoardViewProps {
  session: GameSession;
  palettes: MolePalette[];
  boardKey: number;
  onWhackHole: (holeIndex: number) => Promise<ActivePrizePopup | null>;
  onShowPrizePopup: (popup: ActivePrizePopup) => void;
  onUnlockBoardOnError: () => void;
  onExit: () => void;
  onPlaySound: (type: SoundEffectType) => void;
}

interface HoleUiState {
  visualState: MoleVisualState;
  svgMode: 'normal' | 'bonked' | 'prize';
  prizeIcon: string;
  showWhackFx: boolean;
}

const createInitialHoles = (): HoleUiState[] =>
  Array.from({length: 9}, () => ({
    visualState: 'up',
    svgMode: 'normal',
    prizeIcon: '🎁',
    showWhackFx: false,
  }));

export function GameBoardView({
  session,
  palettes,
  boardKey,
  onWhackHole,
  onShowPrizePopup,
  onUnlockBoardOnError,
  onExit,
  onPlaySound,
}: GameBoardViewProps) {
  const [holes, setHoles] = useState<HoleUiState[]>(createInitialHoles);
  const [boardError, setBoardError] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearPendingTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => {
    clearPendingTimers();
    setHoles(createInitialHoles());
    setBoardError(null);
    return () => {
      clearPendingTimers();
    };
  }, [boardKey]);

  const remaining = Math.max(0, session.totalUses - session.usedCount);

  const handleHoleClick = async (holeIndex: number) => {
    if (session.isLocked) return;
    if (remaining <= 0) {
      onPlaySound('error');
      return;
    }

    setBoardError(null);
    onPlaySound('bonk');

    // Step 1: Immediate responsive bonk animation + hammer FX + Poko badge
    setHoles((prev) =>
      prev.map((h, idx) =>
        idx === holeIndex
          ? {
              visualState: 'bonked',
              svgMode: 'bonked',
              prizeIcon: '🎁',
              showWhackFx: true,
            }
          : h,
      ),
    );

    const t1 = window.setTimeout(() => {
      setHoles((prev) =>
        prev.map((h, idx) =>
          idx === holeIndex
            ? {
                ...h,
                visualState: 'hidden-down',
              }
            : h,
        ),
      );
    }, 420);

    const t2 = window.setTimeout(() => {
      setHoles((prev) =>
        prev.map((h, idx) =>
          idx === holeIndex
            ? {
                ...h,
                showWhackFx: false,
              }
            : h,
        ),
      );
    }, 700);

    timersRef.current.push(t1, t2);

    const waitMinHideTime = new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, 950);
      timersRef.current.push(t);
    });

    try {
      const [result] = await Promise.all([onWhackHole(holeIndex), waitMinHideTime]);

      if (!result) {
        clearPendingTimers();
        setHoles(createInitialHoles());
        onUnlockBoardOnError();
        setBoardError('⚠️ สิทธิ์ของโค้ดนี้ถูกใช้งานครบแล้ว');
        onPlaySound('error');
        return;
      }

      onPlaySound('pop');
      setHoles((prev) =>
        prev.map((h, idx) =>
          idx === holeIndex
            ? {
                visualState: 'holding-prize',
                svgMode: 'prize',
                prizeIcon: result.prize.icon,
                showWhackFx: false,
              }
            : h,
        ),
      );

      const t4 = window.setTimeout(() => {
        onPlaySound('win');
        onShowPrizePopup(result);
      }, 600);

      timersRef.current.push(t4);
    } catch {
      clearPendingTimers();
      setHoles(createInitialHoles());
      onUnlockBoardOnError();
      setBoardError('⚠️ ไม่สามารถบันทึกผลรางวัลลงระบบออนไลน์ได้ กรุณาลองใหม่อีกครั้ง');
      onPlaySound('error');
    }
  };

  return (
    <section id="gameView" className="w-full max-w-2xl transition-all duration-300">
      <div className="kawaii-card px-4 py-3 sm:px-6 sm:py-4 mb-5 bg-white/95 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#BDE0FE] border-3 border-[#4A3531] flex items-center justify-center text-xl">
            🦊
          </div>
          <div>
            <div className="text-xs text-[#7D5A50] font-semibold">ผู้เล่น</div>
            <div id="activePlayerName" className="font-cute font-bold text-lg text-[#4A3531] leading-tight">
              {session.playerName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-[#FFF3B0] border-2 border-[#4A3531] px-3 py-1.5 rounded-2xl text-center">
            <div className="text-[10px] font-bold text-[#7D5A50]">โค้ด</div>
            <div id="activeCodeDisplay" className="font-bold text-sm text-[#D9385A] tabular-nums">
              {session.code}
            </div>
          </div>

          <div className="bg-[#D8F3DC] border-2 border-[#4A3531] px-3.5 py-1.5 rounded-2xl text-center">
            <div className="text-[10px] font-bold text-[#2D6A4F]">สิทธิ์คงเหลือ</div>
            <div
              id="remainingPlaysDisplay"
              className="font-cute font-bold text-base sm:text-lg text-[#1B4332] tabular-nums"
            >
              {remaining} / {session.totalUses}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              clearPendingTimers();
              onExit();
            }}
            title="ออกจากรอบนี้"
            className="kawaii-btn bg-[#F8EDEB] hover:bg-[#FCD5CE] text-[#4A3531] px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            ออก
          </button>
        </div>
      </div>

      <div className="text-center mb-4">
        <span
          id="gameInstructionBadge"
          className="inline-block bg-[#FF758F] text-white border-3 border-[#4A3531] shadow-[0_4px_0_#4A3531] px-5 py-1.5 rounded-full font-cute font-bold text-sm sm:text-base"
        >
          {remaining > 0
            ? `🔨 จิ้มเลือกทุบน้องตุ่น 1 ตัวเพื่อรับของรางวัลเลย! (เหลือ ${remaining} สิทธิ์)`
            : '🎉 ใช้สิทธิ์ครบตามจำนวนแล้ว ขอบคุณที่ร่วมสนุกนะ!'}
        </span>
      </div>

      {boardError && (
        <div
          role="alert"
          className="mb-4 bg-[#FFE5EC] border-2 border-[#E63946] text-[#B51738] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl text-center"
        >
          {boardError}
        </div>
      )}

      <div className="kawaii-card p-4 sm:p-7 bg-gradient-to-b from-[#B7E4C7] via-[#95D5B2] to-[#74C69D] relative">
        <div className="flex justify-between text-lg sm:text-xl px-2 mb-1 pointer-events-none opacity-90" aria-hidden="true">
          <span>🌷🌿</span>
          <span>🌼🍀🌼</span>
          <span>🌿🌸</span>
        </div>

        <div id="moleGrid" className="grid grid-cols-3 gap-2 sm:gap-5 max-w-lg mx-auto">
          {holes.map((hole, i) => (
            <button
              key={i}
              type="button"
              id={`hole-${i}`}
              aria-label={`ทุบน้องตุ่นหลุมที่ ${i + 1}`}
              disabled={session.isLocked || remaining <= 0}
              onClick={() => void handleHoleClick(i)}
              className="mole-hole-container group focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#FF758F] rounded-2xl disabled:cursor-default"
            >
              <div className="hole-back" />
              <div className="mole-mask">
                <div
                  id={`mole-char-${i}`}
                  className={`mole-character ${hole.visualState}`}
                  style={{animationDelay: `${i * 0.14}s`}}
                >
                  <MoleSvg
                    mode={hole.svgMode}
                    prizeIcon={hole.prizeIcon}
                    palette={palettes[i % palettes.length]}
                  />
                </div>
              </div>
              <div className="hole-front-rim" />

              {hole.showWhackFx && (
                <>
                  <div className="hammer-fx">
                    <HammerSvg />
                  </div>
                  <div className="poko-badge bg-[#FFD166] border-2 border-[#4A3531] text-[#4A3531] font-cute font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                    ป๊อก! 💥
                  </div>
                </>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-between text-lg sm:text-xl px-2 mt-2 pointer-events-none opacity-90" aria-hidden="true">
          <span>🍄🌱</span>
          <span>🐾✨🐾</span>
          <span>🌱🍄</span>
        </div>
      </div>
    </section>
  );
}
