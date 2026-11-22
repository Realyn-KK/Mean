import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {auth, googleProvider} from '../firebase';
import type {CodeEntry, PrizeRates, WinnerLog} from '../types/game';
import {
  clearAllLogsInFirestore,
  createCodeInFirestore,
  deleteCodeInFirestore,
  ensureInitialFirestoreDefaults,
  savePrizeRateInFirestore,
  subscribeAllCodes,
  subscribeAllLogs,
  verifyAdminAccess,
} from '../utils/firestoreService';
import type {SoundEffectType} from '../utils/sound';
import {ADMIN_PASSWORD, DEFAULT_FREE_FOOD_RATE} from '../utils/storage';

interface AdminModalProps {
  isOpen: boolean;
  isPinVerified: boolean;
  livePrizeRates: PrizeRates;
  onPinVerified: () => void;
  onClose: () => void;
  onPlaySound: (type: SoundEffectType) => void;
}

type AdminTab = 'codes' | 'logs';

export function AdminModal({
  isOpen,
  isPinVerified,
  livePrizeRates,
  onPinVerified,
  onClose,
  onPlaySound,
}: AdminModalProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isGoogleAdmin, setIsGoogleAdmin] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [showRedirectFallback, setShowRedirectFallback] = useState(false);
  const isInIframe =
    typeof window !== 'undefined' && window.self !== window.top;

  const [codes, setCodes] = useState<CodeEntry[]>([]);
  const [logs, setLogs] = useState<WinnerLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newCodeUses, setNewCodeUses] = useState('1');
  const [freeFoodRate, setFreeFoodRate] = useState(DEFAULT_FREE_FOOD_RATE);
  const [activeTab, setActiveTab] = useState<AdminTab>('codes');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const hasSeededCodeRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 3500);
  };

  const generateRandom4DigitCode = (currentCodes: CodeEntry[]) => {
    let candidate = '';
    let attempts = 0;
    do {
      candidate = String(Math.floor(1000 + Math.random() * 9000));
      attempts += 1;
    } while (currentCodes.some((c) => c.code === candidate) && attempts < 50);
    setNewCode(candidate);
  };

  useEffect(() => {
    setFreeFoodRate(livePrizeRates.freeFoodRate);
  }, [livePrizeRates.freeFoodRate]);

  const formatGoogleAuthError = (error: unknown): string => {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as {code?: unknown}).code ?? '')
        : '';
    const message = error instanceof Error ? error.message : String(error);
    const host = typeof window !== 'undefined' ? window.location.hostname : '';

    switch (code) {
      case 'auth/unauthorized-domain':
        return `⚠️ โดเมน "${host}" ยังไม่ได้รับอนุญาตใน Firebase Authentication (กรุณาเพิ่มโดเมนนี้ใน Firebase Console > Authentication > Settings > Authorized domains)`;
      case 'auth/popup-blocked':
        setShowRedirectFallback(true);
        return isInIframe
          ? '⚠️ เบราว์เซอร์บล็อกป๊อปอัปภายในหน้าต่างตัวอย่าง กรุณากดเปิดเว็บในแท็บใหม่ด้านล่างเพื่อล็อกอิน Google'
          : '⚠️ เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาตป๊อปอัป หรือกดปุ่ม "เข้าสู่ระบบแบบเปิดเต็มหน้า" ด้านล่าง';
      case 'auth/popup-closed-by-user':
        setShowRedirectFallback(true);
        return isInIframe
          ? '⚠️ หน้าต่างล็อกอินถูกปิดลงก่อนสำเร็จ (มักเกิดจากข้อจำกัดป๊อปอัปในหน้าต่างตัวอย่าง) แนะนำให้เปิดเว็บในแท็บใหม่ด้านล่างแล้วลองอีกครั้ง'
          : '⚠️ หน้าต่างล็อกอินถูกปิดก่อนทำรายการเสร็จสิ้น กรุณาลองใหม่อีกครั้ง';
      case 'auth/cancelled-popup-request':
        return '⚠️ มีคำขอล็อกอินซ้อนกัน กรุณารอสักครู่แล้วกดใหม่อีกครั้ง';
      case 'auth/operation-not-allowed':
        return '⚠️ ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase Console (Authentication > Sign-in method > Google)';
      case 'auth/network-request-failed':
        return '⚠️ เชื่อมต่อเครือข่ายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
      default:
        setShowRedirectFallback(true);
        return `⚠️ เข้าสู่ระบบ Google ไม่สำเร็จ (${code || 'unknown'}): ${message}`;
    }
  };

  useEffect(() => {
    let mounted = true;
    void getRedirectResult(auth).catch((error) => {
      if (!mounted) return;
      console.error('Google Redirect Error:', error);
      setAuthErrorMsg(formatGoogleAuthError(error));
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!mounted) return;
      setFirebaseUser(user);
      setAuthErrorMsg(null);
      if (user) {
        setIsCheckingAccess(true);
        const ok = await verifyAdminAccess(user);
        if (!mounted) return;
        setIsGoogleAdmin(ok);
        setIsCheckingAccess(false);
      } else {
        setIsGoogleAdmin(false);
        setIsCheckingAccess(false);
      }
      setAuthReady(true);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !isPinVerified || !authReady || !isGoogleAdmin || !firebaseUser) {
      return;
    }

    let unsubCodes: (() => void) | undefined;
    let unsubLogs: (() => void) | undefined;
    let cancelled = false;

    const startSync = async () => {
      setIsSyncing(true);
      try {
        await ensureInitialFirestoreDefaults();
        if (cancelled) return;

        unsubCodes = subscribeAllCodes(
          (items) => {
            setCodes(items);
            if (!hasSeededCodeRef.current) {
              hasSeededCodeRef.current = true;
              generateRandom4DigitCode(items);
            }
            setIsSyncing(false);
          },
          () => {
            setIsSyncing(false);
            showToast('⚠️ ไม่สามารถซิงค์รายการโค้ดแบบ Real-time ได้');
          },
        );

        unsubLogs = subscribeAllLogs(
          (items) => {
            setLogs(items);
          },
          () => {
            showToast('⚠️ ไม่สามารถซิงค์ประวัติรางวัลแบบ Real-time ได้');
          },
        );
      } catch {
        if (!cancelled) {
          setIsSyncing(false);
          showToast('⚠️ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูลออนไลน์');
        }
      }
    };

    void startSync();

    return () => {
      cancelled = true;
      unsubCodes?.();
      unsubLogs?.();
    };
  }, [isOpen, isPinVerified, authReady, isGoogleAdmin, firebaseUser]);

  useEffect(() => {
    if (!isOpen) return;
    if (!isPinVerified) {
      setPasswordInput('');
      setLoginError(false);
    }
  }, [isOpen, isPinVerified]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handlePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === ADMIN_PASSWORD) {
      setLoginError(false);
      onPlaySound('win');
      onPinVerified();
    } else {
      setLoginError(true);
      onPlaySound('error');
    }
  };

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;
    setAuthErrorMsg(null);
    setIsSigningIn(true);
    onPlaySound('click');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google SignIn Popup Error:', error);
      onPlaySound('error');
      setAuthErrorMsg(formatGoogleAuthError(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleRedirectSignIn = async () => {
    if (isSigningIn) return;
    setAuthErrorMsg(null);
    setIsSigningIn(true);
    onPlaySound('click');
    try {
      sessionStorage.setItem('mogumogu_admin_redirect_pending', '1');
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      sessionStorage.removeItem('mogumogu_admin_redirect_pending');
      console.error('Google SignIn Redirect Error:', error);
      onPlaySound('error');
      setAuthErrorMsg(formatGoogleAuthError(error));
      setIsSigningIn(false);
    }
  };

  const handleCreateCode = async () => {
    if (isSubmitting) return;
    const trimmedCode = newCode.trim();
    const usesVal = parseInt(newCodeUses, 10);

    if (!/^\d{4}$/.test(trimmedCode)) {
      onPlaySound('error');
      showToast('⚠️ กรุณาระบุรหัสโค้ดเป็นตัวเลข 4 หลักเท่านั้น');
      return;
    }

    if (Number.isNaN(usesVal) || usesVal < 1 || usesVal > 99) {
      onPlaySound('error');
      showToast('⚠️ กรุณาระบุจำนวนสิทธิ์ระหว่าง 1 - 99 ครั้ง');
      return;
    }

    if (codes.some((c) => c.code === trimmedCode)) {
      onPlaySound('error');
      showToast(`⚠️ รหัสโค้ด ${trimmedCode} มีอยู่ในระบบแล้ว กรุณาสุ่มรหัสใหม่`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createCodeInFirestore(trimmedCode, usesVal);
      onPlaySound('pop');
      showToast(`✅ สร้างโค้ด ${trimmedCode} (${usesVal} สิทธิ์ • ใช้ได้ 1 ครั้ง) ออนไลน์เรียบร้อย!`);
      generateRandom4DigitCode([...codes, {code: trimmedCode} as CodeEntry]);
    } catch {
      onPlaySound('error');
      showToast('⚠️ บันทึกโค้ดออนไลน์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = async (codeStr: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeStr);
      } else {
        const tempInput = document.createElement('input');
        tempInput.value = codeStr;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
      }
      onPlaySound('click');
      showToast(`📋 คัดลอกรหัสโค้ด "${codeStr}" ลงคลิปบอร์ดแล้ว!`);
    } catch {
      onPlaySound('error');
      showToast('⚠️ ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกรหัสด้วยตนเอง');
    }
  };

  const handleDeleteCode = async (codeStr: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteCodeInFirestore(codeStr);
      onPlaySound('click');
      showToast(`🗑️ ลบรหัสโค้ด ${codeStr} เรียบร้อยแล้ว`);
    } catch {
      onPlaySound('error');
      showToast('⚠️ ลบโค้ดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearLogs = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await clearAllLogsInFirestore();
      onPlaySound('click');
      showToast('🗑️ ล้างประวัติผู้ได้รับรางวัลทั้งหมดแล้ว');
    } catch {
      onPlaySound('error');
      showToast('⚠️ ล้างประวัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRates = async () => {
    if (isSubmitting) return;
    const clamped = Math.min(100, Math.max(0, freeFoodRate));
    setIsSubmitting(true);
    try {
      await savePrizeRateInFirestore(clamped);
      onPlaySound('pop');
      showToast(`💾 บันทึกเรทรางวัลออนไลน์เรียบร้อย (อาหารฟรี ${clamped}% / ส่วนลด 50% ${100 - clamped}%)`);
    } catch {
      onPlaySound('error');
      showToast('⚠️ บันทึกเรทรางวัลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetRates = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await savePrizeRateInFirestore(DEFAULT_FREE_FOOD_RATE);
      setFreeFoodRate(DEFAULT_FREE_FOOD_RATE);
      onPlaySound('click');
      showToast('🔄 รีเซ็ตเรทรางวัลเป็นค่าเริ่มต้น (อาหารฟรี 40% / ส่วนลด 50% 60%) แล้ว');
    } catch {
      onPlaySound('error');
      showToast('⚠️ รีเซ็ตเรทรางวัลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const discountPreview = 100 - freeFoodRate;

  return (
    <div
      id="adminModal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminModalHeading"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
    >
      <div className="kawaii-card modal-pop w-full max-w-3xl bg-[#FFFDF9] p-5 sm:p-7 my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b-3 border-[#FFE5EC]">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">👑</span>
            <h3 id="adminModalHeading" className="font-cute font-bold text-xl sm:text-2xl text-[#4A3531]">
              ระบบจัดการแอดมิน (Admin Panel)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างแอดมิน"
            className="kawaii-btn bg-[#FFE5EC] hover:bg-[#FFCCD5] text-[#D9385A] w-9 h-9 rounded-xl font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {!isPinVerified ? (
          <div id="adminLoginSection" className="py-8 max-w-sm mx-auto w-full text-center">
            <div className="text-4xl mb-2" aria-hidden="true">🔐</div>
            <h4 className="font-cute font-bold text-lg text-[#4A3531] mb-1">เข้าสู่ระบบผู้ดูแลร้าน</h4>
            <p className="text-xs text-[#7D5A50] mb-4">
              กรุณากรอกรหัสผ่านแอดมินเพื่อสร้างโค้ดและดูประวัติรางวัล
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-3">
              <input
                type="password"
                id="adminPasswordInput"
                maxLength={10}
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  if (loginError) setLoginError(false);
                }}
                placeholder="รหัสผ่านแอดมิน"
                className="w-full px-4 py-2.5 rounded-2xl border-3 border-[#4A3531] text-center text-lg font-bold focus:outline-none focus:ring-4 focus:ring-[#BDE0FE]"
              />
              {loginError && (
                <div id="adminLoginError" role="alert" className="text-xs font-bold text-[#E63946]">
                  รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง!
                </div>
              )}
              <button
                type="submit"
                className="w-full kawaii-btn bg-[#4EA8DE] hover:bg-[#3A86FF] text-white font-cute font-bold py-2.5 px-4 rounded-2xl cursor-pointer"
              >
                เข้าสู่ระบบแอดมิน
              </button>
            </form>
          </div>
        ) : !authReady || isCheckingAccess ? (
          <div className="py-12 text-center text-sm font-bold text-[#7D5A50]">
            กำลังตรวจสอบสิทธิ์การเชื่อมต่อ Firebase...
          </div>
        ) : !firebaseUser || !isGoogleAdmin ? (
          <div className="py-8 max-w-md mx-auto w-full text-center space-y-4">
            <div className="text-4xl" aria-hidden="true">☁️</div>
            <h4 className="font-cute font-bold text-lg text-[#4A3531]">
              เชื่อมต่อบัญชีผู้ดูแลกับระบบออนไลน์
            </h4>
            <p className="text-xs sm:text-sm text-[#7D5A50]">
              ยืนยันตัวตนด้วย Google เพื่อซิงค์ข้อมูลโค้ด เรทออกรางวัล และประวัติผู้โชคดีแบบ Real-time
            </p>

            {firebaseUser && !isGoogleAdmin && (
              <div
                role="alert"
                className="bg-[#FFE5EC] border-2 border-[#E63946] text-[#B51738] text-xs font-semibold px-4 py-2.5 rounded-2xl"
              >
                บัญชี {firebaseUser.email || firebaseUser.uid} ยังไม่มีสิทธิ์ผู้ดูแลระบบ
              </div>
            )}

            {authErrorMsg && (
              <div
                role="alert"
                className="bg-[#FFE5EC] border-2 border-[#E63946] text-[#B51738] text-xs font-semibold px-4 py-2.5 rounded-2xl"
              >
                {authErrorMsg}
              </div>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isSigningIn}
                onClick={() => void handleGoogleSignIn()}
                className="w-full kawaii-btn bg-[#4EA8DE] hover:bg-[#3A86FF] text-white font-cute font-bold py-3 px-4 rounded-2xl cursor-pointer"
              >
                {isSigningIn
                  ? 'กำลังเปิดหน้าต่าง Google...'
                  : firebaseUser
                    ? 'สลับบัญชี Google ผู้ดูแล'
                    : 'เข้าสู่ระบบด้วย Google'}
              </button>

              {showRedirectFallback && isInIframe && typeof window !== 'undefined' && (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full kawaii-btn bg-[#FFF3B0] hover:bg-[#FFE66D] text-[#4A3531] font-cute font-bold py-2.5 px-4 rounded-2xl text-sm text-center cursor-pointer"
                >
                  ↗️ เปิดเว็บในแท็บใหม่เพื่อล็อกอิน Google
                </a>
              )}

              {showRedirectFallback && !isInIframe && (
                <button
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => void handleGoogleRedirectSignIn()}
                  className="w-full kawaii-btn bg-[#FFF3B0] hover:bg-[#FFE66D] text-[#4A3531] font-cute font-bold py-2.5 px-4 rounded-2xl text-sm cursor-pointer"
                >
                  เข้าสู่ระบบแบบเปิดเต็มหน้า (กรณีป๊อปอัปถูกบล็อก)
                </button>
              )}
            </div>
          </div>
        ) : (
          <div id="adminDashboardSection" className="flex-1 overflow-y-auto pt-4 space-y-5 pr-1">
            {/* Signed-in admin bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#7D5A50]">
              <span>
                บัญชีผู้ดูแล: <strong className="text-[#4A3531]">{firebaseUser.email}</strong>
                {isSyncing ? ' · กำลังซิงค์ข้อมูล...' : ' · ซิงค์ข้อมูลออนไลน์แบบ Real-time'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onPlaySound('click');
                  void signOut(auth);
                }}
                className="text-xs font-bold text-[#D9385A] hover:underline cursor-pointer"
              >
                ออกจากระบบบัญชี Google
              </button>
            </div>

            {/* Create New 4-Digit Code */}
            <div className="bg-[#FFF0F5] border-3 border-[#FF8FAB] rounded-2xl p-4">
              <h4 className="font-cute font-bold text-base sm:text-lg text-[#D9385A] mb-3 flex items-center gap-1.5">
                <span aria-hidden="true">🎟️</span> สร้างโค้ดปลดล็อก 4 หลักใหม่ (1 โค้ดใช้ได้ 1 ครั้ง)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label htmlFor="newCodeInput" className="block text-xs font-bold text-[#4A3531] mb-1">
                    รหัส 4 หลัก (ตัวเลข)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      id="newCodeInput"
                      maxLength={4}
                      inputMode="numeric"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="เช่น 4592"
                      className="w-full px-3 py-2 rounded-xl border-2 border-[#4A3531] bg-white text-center font-bold text-lg tracking-widest text-[#D9385A] tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        onPlaySound('click');
                        generateRandom4DigitCode(codes);
                      }}
                      title="สุ่มรหัส 4 หลัก"
                      className="kawaii-btn bg-[#FFD166] hover:bg-[#FFC300] text-[#4A3531] px-3 py-2 rounded-xl text-xs font-bold shrink-0 whitespace-nowrap cursor-pointer"
                    >
                      🎲 สุ่ม
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="newCodeUsesInput" className="block text-xs font-bold text-[#4A3531] mb-1">
                    จำนวนสิทธิ์ (ตัวตุ่น)
                  </label>
                  <input
                    type="number"
                    id="newCodeUsesInput"
                    min={1}
                    max={99}
                    value={newCodeUses}
                    onChange={(e) => setNewCodeUses(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-[#4A3531] bg-white text-center font-bold text-lg text-[#4A3531] tabular-nums"
                  />
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleCreateCode()}
                    className="w-full kawaii-btn bg-[#52B788] hover:bg-[#40916C] text-white font-bold py-2.5 px-3 rounded-xl text-sm whitespace-nowrap cursor-pointer"
                  >
                    + สร้างโค้ด
                  </button>
                </div>
              </div>

              {toastMsg && (
                <div
                  id="adminToastMsg"
                  role="status"
                  className="mt-2 text-xs font-bold text-[#1B4332] bg-[#D8F3DC] px-3 py-1.5 rounded-xl"
                >
                  {toastMsg}
                </div>
              )}
            </div>

            {/* Prize Rate Settings */}
            <div className="bg-[#FFF9E6] border-3 border-[#FFD166] rounded-2xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="font-cute font-bold text-base sm:text-lg text-[#4A3531] flex items-center gap-1.5">
                  <span aria-hidden="true">🎯</span> ตั้งค่าเรทออกรางวัล (เฉพาะแอดมิน)
                </h4>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleResetRates()}
                  className="text-xs font-bold text-[#D9385A] hover:underline cursor-pointer"
                >
                  รีเซ็ตค่าเริ่มต้น (40% / 60%)
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm font-bold mb-1.5 tabular-nums">
                    <span className="text-[#D9385A]">
                      🍱 แจกอาหารฟรี: <span id="freeFoodRateLabel">{freeFoodRate}</span>%
                    </span>
                    <span className="text-[#1982C4]">
                      🎟️ ส่วนลด 50%: <span id="discountRateLabel">{discountPreview}</span>%
                    </span>
                  </div>
                  <input
                    type="range"
                    id="freeFoodRateSlider"
                    aria-label="ตั้งค่าอัตราการออกรางวัลอาหารฟรี"
                    min={0}
                    max={100}
                    step={5}
                    value={freeFoodRate}
                    onChange={(e) => setFreeFoodRate(parseInt(e.target.value, 10) || 0)}
                    className="w-full accent-[#FF758F] cursor-pointer h-2.5 bg-[#FFE5EC] rounded-lg"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <p className="text-[11px] text-[#7D5A50]">
                    * ใช้ระบบสุ่มความน่าจะเป็นมาตรฐาน (Crypto Random) อัปเดตผลทันทีทุกเครื่อง
                  </p>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleSaveRates()}
                    className="kawaii-btn bg-[#FFD166] hover:bg-[#FFC300] text-[#4A3531] font-bold py-2 px-4 rounded-xl text-xs sm:text-sm shrink-0 whitespace-nowrap cursor-pointer"
                  >
                    💾 บันทึกเรทรางวัล
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b-2 border-[#E2ECE9] pb-2">
              <button
                type="button"
                id="tabCodesBtn"
                onClick={() => {
                  onPlaySound('click');
                  setActiveTab('codes');
                }}
                className={`px-4 py-1.5 rounded-xl font-bold text-sm transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'codes'
                    ? 'bg-[#4A3531] text-white'
                    : 'bg-[#F8EDEB] text-[#4A3531] hover:bg-[#FCD5CE]'
                }`}
              >
                📋 รายการโค้ดทั้งหมด (<span className="tabular-nums">{codes.length}</span>)
              </button>
              <button
                type="button"
                id="tabLogsBtn"
                onClick={() => {
                  onPlaySound('click');
                  setActiveTab('logs');
                }}
                className={`px-4 py-1.5 rounded-xl font-bold text-sm transition whitespace-nowrap cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-[#4A3531] text-white'
                    : 'bg-[#F8EDEB] text-[#4A3531] hover:bg-[#FCD5CE]'
                }`}
              >
                🏆 ประวัติผู้ได้รับรางวัล (<span className="tabular-nums">{logs.length}</span>)
              </button>
            </div>

            {activeTab === 'codes' ? (
              <div id="adminCodesTab" className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FFE5EC] text-[#4A3531] border-b-2 border-[#4A3531]">
                      <th className="py-2.5 px-3 rounded-tl-xl">รหัสโค้ด</th>
                      <th className="py-2.5 px-3 text-center">สิทธิ์ในรอบ (ทุบไป/ทั้งหมด)</th>
                      <th className="py-2.5 px-3 text-center">สถานะโค้ด (1 ครั้ง)</th>
                      <th className="py-2.5 px-3 text-right rounded-tr-xl">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody id="adminCodesTableBody" className="divide-y divide-[#FFE5EC]">
                    {codes.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-[#8C6D65]">
                          ยังไม่มีโค้ดในระบบ กดสร้างโค้ดด้านบนได้เลย
                        </td>
                      </tr>
                    ) : (
                      codes.map((item) => {
                        const isUsed = item.redeemed === true || item.usedCount >= item.maxUses;
                        return (
                          <tr key={item.code} className="hover:bg-[#FFF8FA]">
                            <td className="py-2.5 px-3 font-mono font-bold text-base text-[#D9385A] tabular-nums">
                              {item.code}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold tabular-nums">
                              {item.usedCount} / {item.maxUses}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {isUsed ? (
                                <span className="inline-block bg-[#FFE5EC] text-[#D9385A] font-bold text-xs px-2.5 py-1 rounded-full">
                                  ถูกใช้แล้ว{item.redeemedBy ? ` (${item.redeemedBy})` : ''}
                                </span>
                              ) : (
                                <span className="inline-block bg-[#D8F3DC] text-[#1B4332] font-bold text-xs px-2.5 py-1 rounded-full">
                                  พร้อมใช้งาน
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => void handleCopyCode(item.code)}
                                className="bg-[#FFF3B0] hover:bg-[#FFE66D] border border-[#4A3531] text-[#4A3531] text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                              >
                                คัดลอก
                              </button>
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => void handleDeleteCode(item.code)}
                                className="bg-[#FFE5EC] hover:bg-[#FFCCD5] border border-[#4A3531] text-[#D9385A] text-xs font-bold px-2.5 py-1 rounded-lg cursor-pointer"
                              >
                                ลบ
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div id="adminLogsTab" className="space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span id="adminRateSummaryText" className="text-xs text-[#7D5A50] tabular-nums">
                    เรทปัจจุบัน: อาหารฟรี {livePrizeRates.freeFoodRate}% | ส่วนลด 50% (
                    {livePrizeRates.discountRate}%)
                  </span>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleClearLogs()}
                    className="text-xs text-[#E63946] hover:underline font-bold cursor-pointer"
                  >
                    🗑️ ล้างประวัติรางวัล
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-[#E2ECE9] text-[#4A3531] border-b-2 border-[#4A3531]">
                        <th className="py-2.5 px-3 rounded-tl-xl">เวลา</th>
                        <th className="py-2.5 px-3">ชื่อผู้เล่น</th>
                        <th className="py-2.5 px-3 text-center">โค้ด</th>
                        <th className="py-2.5 px-3 rounded-tr-xl">ของรางวัลที่ได้</th>
                      </tr>
                    </thead>
                    <tbody id="adminLogsTableBody" className="divide-y divide-[#E2ECE9]">
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-[#8C6D65]">
                            ยังไม่มีประวัติผู้ได้รับรางวัล
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => {
                          const badgeColor =
                            log.prizeType === 'FREE_FOOD'
                              ? 'bg-[#FFD166] text-[#4A3531]'
                              : 'bg-[#BDE0FE] text-[#4A3531]';
                          return (
                            <tr key={log.id ?? log.refId} className="hover:bg-[#F8FAF9]">
                              <td className="py-2.5 px-3 text-xs text-[#7D5A50] tabular-nums">
                                {log.timestamp}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#4A3531]">
                                {log.playerName}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[#D9385A] tabular-nums">
                                {log.code}
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block ${badgeColor} border border-[#4A3531] text-xs font-bold px-2.5 py-0.5 rounded-full`}
                                >
                                  {log.prizeTitle}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
