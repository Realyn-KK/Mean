import {useState, type FormEvent} from 'react';
import {WelcomeMoleSvg} from './MoleSvg';
import type {SoundEffectType} from '../utils/sound';

interface PlayerEntryViewProps {
  onStartGame: (playerName: string, code: string) => Promise<string | null>;
  onPlaySound: (type: SoundEffectType) => void;
}

export function PlayerEntryView({onStartGame, onPlaySound}: PlayerEntryViewProps) {
  const [playerName, setPlayerName] = useState('');
  const [unlockCode, setUnlockCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);

    const trimmedName = playerName.trim();
    const trimmedCode = unlockCode.trim();

    if (!trimmedName) {
      setErrorMessage('⚠️ กรุณากรอกชื่อเล่นก่อนเข้าเล่นนะ!');
      onPlaySound('error');
      return;
    }

    if (!/^\d{4}$/.test(trimmedCode)) {
      setErrorMessage('⚠️ กรุณากรอกรหัสปลดล็อกเป็นตัวเลข 4 หลัก!');
      onPlaySound('error');
      return;
    }

    setIsSubmitting(true);
    try {
      const error = await onStartGame(trimmedName, trimmedCode);
      if (error) {
        setErrorMessage(error);
        onPlaySound('error');
      } else {
        setUnlockCode('');
      }
    } catch {
      setErrorMessage('⚠️ เชื่อมต่อระบบออนไลน์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      onPlaySound('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="entryView" className="w-full max-w-md transition-all duration-300">
      <div className="kawaii-card p-6 sm:p-8 relative overflow-hidden bg-gradient-to-b from-white to-[#FFF8FA]">
        <div className="flex justify-between items-start -mt-2 mb-2 pointer-events-none">
          <div className="lantern-sway text-2xl sm:text-3xl" aria-hidden="true">🏮</div>
          <div className="bg-[#FFEDF2] border-2 border-[#FF8FAB] text-[#D9385A] text-xs font-bold px-3 py-1 rounded-full">
            ✨ 1 โค้ด ใช้ได้ 1 ครั้ง ✨
          </div>
          <div
            className="lantern-sway text-2xl sm:text-3xl"
            style={{animationDelay: '1s'}}
            aria-hidden="true"
          >
            🏮
          </div>
        </div>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mb-2 drop-shadow-md">
            <WelcomeMoleSvg />
          </div>
          <h2 className="font-cute font-bold text-2xl sm:text-3xl text-[#4A3531] text-balance">
            พร้อมลุ้นรางวัลหรือยัง?
          </h2>
          <p className="text-sm text-[#7D5A50] mt-1">
            กรอกชื่อเล่นและรหัส 4 หลักจากทางร้านเพื่อเริ่มทุบตุ่น!
          </p>
        </div>

        <form id="playerLoginForm" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerNameInput" className="block text-sm font-bold text-[#4A3531] mb-1.5">
              🌸 ชื่อเล่นของคุณ <span className="text-[#E63946]">*</span>
            </label>
            <input
              type="text"
              id="playerNameInput"
              maxLength={25}
              disabled={isSubmitting}
              value={playerName}
              onChange={(e) => {
                setPlayerName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="เช่น น้องโมจิ, พี่ซากุระ..."
              className="w-full px-4 py-3 rounded-2xl border-3 border-[#4A3531] bg-[#FFFDF9] text-[#4A3531] font-medium focus:outline-none focus:ring-4 focus:ring-[#FFCCD5] transition disabled:opacity-60"
              required
            />
          </div>

          <div>
            <label htmlFor="unlockCodeInput" className="block text-sm font-bold text-[#4A3531] mb-1.5">
              🎟️ รหัสปลดล็อก 4 หลัก <span className="text-[#E63946]">*</span>
            </label>
            <input
              type="text"
              id="unlockCodeInput"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={isSubmitting}
              value={unlockCode}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
                setUnlockCode(digitsOnly);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="0000"
              className="w-full px-4 py-3 rounded-2xl border-3 border-[#4A3531] bg-[#FFFDF9] text-center text-2xl tracking-[0.4em] font-bold text-[#D9385A] tabular-nums focus:outline-none focus:ring-4 focus:ring-[#FFCCD5] transition disabled:opacity-60"
              required
            />
          </div>

          {errorMessage && (
            <div
              id="entryErrorBox"
              role="alert"
              className="bg-[#FFE5EC] border-2 border-[#E63946] text-[#B51738] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-2xl text-center"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full kawaii-btn bg-gradient-to-r from-[#FF758F] to-[#FF8FA3] hover:from-[#FF5C7C] hover:to-[#FF758F] text-white font-cute font-bold text-lg sm:text-xl py-3.5 px-4 rounded-2xl mt-2 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span aria-hidden="true">🔨</span>
            <span>{isSubmitting ? 'กำลังตรวจสอบรหัสออนไลน์...' : 'ปลดล็อกเข้าสู่สนามทุบตุ่น!'}</span>
          </button>
        </form>
      </div>
    </section>
  );
}
