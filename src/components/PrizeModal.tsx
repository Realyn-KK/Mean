import type {ActivePrizePopup} from '../types/game';

interface PrizeModalProps {
  popup: ActivePrizePopup | null;
  playerName: string;
  code: string;
  remainingPlays: number;
  onContinueNext: () => void;
  onFinishAndReturn: () => void;
}

export function PrizeModal({
  popup,
  playerName,
  code,
  remainingPlays,
  onContinueNext,
  onFinishAndReturn,
}: PrizeModalProps) {
  if (!popup) return null;

  const {prize, refId, timestamp} = popup;

  return (
    <div
      id="prizeModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prizeTitleText"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div className="kawaii-card modal-pop w-full max-w-md p-6 sm:p-7 bg-gradient-to-b from-[#FFFDF7] to-[#FFF0F5] text-center relative">
        <div className="inline-block bg-[#FFD166] border-3 border-[#4A3531] px-4 py-1 rounded-full text-xs sm:text-sm font-bold text-[#4A3531] mb-3 shadow-xs">
          🎉 ยินดีด้วย! น้องตุ่นหยิบของรางวัลมาให้แล้ว 🎉
        </div>

        <div
          id="prizeVisualIcon"
          className="w-24 h-24 mx-auto my-2 rounded-3xl bg-white border-4 border-[#4A3531] flex items-center justify-center text-5xl shadow-[0_5px_0_#4A3531]"
        >
          {prize.icon}
        </div>

        <h3 id="prizeTitleText" className="font-cute font-bold text-2xl sm:text-3xl text-[#D9385A] mt-3">
          {prize.title}
        </h3>
        <p id="prizeSubText" className="text-sm text-[#7D5A50] mt-1">
          {prize.subtitle}
        </p>

        <div className="mt-4 bg-white border-3 border-dashed border-[#FF8FAB] rounded-2xl p-4 text-left space-y-1.5">
          <div className="flex justify-between text-xs sm:text-sm gap-2">
            <span className="text-[#7D5A50]">ผู้โชคดี:</span>
            <span id="receiptPlayerName" className="font-bold text-[#4A3531] text-right">
              {playerName}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm gap-2">
            <span className="text-[#7D5A50]">รหัสโค้ดที่ใช้:</span>
            <span id="receiptCodeUsed" className="font-bold text-[#D9385A] tabular-nums">
              {code}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm gap-2">
            <span className="text-[#7D5A50]">เลขอ้างอิงรางวัล:</span>
            <span id="receiptRefId" className="font-mono font-bold text-[#2D6A4F] tabular-nums">
              {refId}
            </span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm gap-2">
            <span className="text-[#7D5A50]">วัน-เวลา:</span>
            <span id="receiptTimestamp" className="font-medium text-[#4A3531] text-right tabular-nums">
              {timestamp}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#8C6D65] mt-2.5">
          📸 แคปหน้าจอนี้เพื่อแสดงให้พนักงานหน้าร้านรับสิทธิ์ได้เลย!
        </p>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          {remainingPlays > 0 && (
            <button
              type="button"
              id="playNextBtn"
              onClick={onContinueNext}
              className="flex-1 kawaii-btn bg-[#52B788] hover:bg-[#40916C] text-white font-cute font-bold py-3 px-4 rounded-2xl text-base cursor-pointer"
            >
              🔨 ทุบต่อ (เหลืออีก {remainingPlays} สิทธิ์)
            </button>
          )}
          <button
            type="button"
            id="finishAllBtn"
            onClick={onFinishAndReturn}
            className="flex-1 kawaii-btn bg-[#FF758F] hover:bg-[#FF5C7C] text-white font-cute font-bold py-3 px-4 rounded-2xl text-base cursor-pointer"
          >
            ✨ เสร็จสิ้น / กลับหน้าแรก
          </button>
        </div>
      </div>
    </div>
  );
}
