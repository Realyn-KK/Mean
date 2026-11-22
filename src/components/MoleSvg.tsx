import type {MolePalette} from '../types/game';
import {MOLE_COLOR_PALETTES} from '../utils/storage';

interface MoleSvgProps {
  mode: 'normal' | 'bonked' | 'prize';
  prizeIcon?: string;
  palette?: MolePalette;
}

export function WelcomeMoleSvg() {
  return (
    <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden="true">
      <ellipse cx="60" cy="68" rx="42" ry="44" fill="#9C6644" stroke="#4A3531" strokeWidth="4" />
      <ellipse cx="60" cy="86" rx="26" ry="22" fill="#FDE4CF" />
      <path d="M22 46 Q60 36 98 46 L96 56 Q60 46 24 56 Z" fill="#FFFFFF" stroke="#4A3531" strokeWidth="3" />
      <circle cx="60" cy="46" r="7" fill="#E63946" />
      <path d="M97 48 L112 40 L108 52 Z" fill="#FFFFFF" stroke="#4A3531" strokeWidth="2.5" />
      <path d="M97 52 L114 58 L106 65 Z" fill="#FFFFFF" stroke="#4A3531" strokeWidth="2.5" />
      <circle cx="43" cy="66" r="5.5" fill="#4A3531" />
      <circle cx="41.5" cy="64" r="2" fill="#FFFFFF" />
      <circle cx="77" cy="66" r="5.5" fill="#4A3531" />
      <circle cx="75.5" cy="64" r="2" fill="#FFFFFF" />
      <ellipse cx="33" cy="74" rx="6.5" ry="4" fill="#FF8FAB" opacity="0.8" />
      <ellipse cx="87" cy="74" rx="6.5" ry="4" fill="#FF8FAB" opacity="0.8" />
      <ellipse cx="60" cy="72" rx="7" ry="5" fill="#FF758F" stroke="#4A3531" strokeWidth="2.5" />
      <path d="M53 80 Q60 86 67 80" fill="none" stroke="#4A3531" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="26" cy="85" rx="9" ry="7" fill="#DDB892" stroke="#4A3531" strokeWidth="3" transform="rotate(-20 26 85)" />
      <ellipse cx="94" cy="85" rx="9" ry="7" fill="#DDB892" stroke="#4A3531" strokeWidth="3" transform="rotate(20 94 85)" />
    </svg>
  );
}

export function MoleSvg({mode, prizeIcon = '🎁', palette = MOLE_COLOR_PALETTES[0]}: MoleSvgProps) {
  const {body, belly, band, dot, paws} = palette;

  if (mode === 'bonked') {
    return (
      <svg viewBox="0 0 120 125" className="w-full h-full drop-shadow-md" aria-hidden="true">
        <ellipse cx="60" cy="74" rx="42" ry="46" fill={body} stroke="#4A3531" strokeWidth="4" />
        <ellipse cx="60" cy="94" rx="26" ry="22" fill={belly} />
        <path d="M22 50 Q60 40 98 50 L96 60 Q60 50 24 60 Z" fill={band} stroke="#4A3531" strokeWidth="3" />
        <circle cx="60" cy="50" r="7" fill={dot} />
        <path d="M36 66 L48 74 M48 66 L36 74" stroke="#4A3531" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M72 66 L84 74 M84 66 L72 74" stroke="#4A3531" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="60" cy="78" rx="7" ry="5" fill="#FF758F" stroke="#4A3531" strokeWidth="2.5" />
        <circle cx="60" cy="90" r="6" fill="#E63946" stroke="#4A3531" strokeWidth="2.5" />
        <text x="20" y="34" fontSize="18">💫</text>
        <text x="86" y="34" fontSize="18">⭐</text>
      </svg>
    );
  }

  if (mode === 'prize') {
    return (
      <svg viewBox="0 0 120 125" className="w-full h-full drop-shadow-md" aria-hidden="true">
        <ellipse cx="60" cy="74" rx="42" ry="46" fill={body} stroke="#4A3531" strokeWidth="4" />
        <ellipse cx="60" cy="94" rx="26" ry="22" fill={belly} />
        <path d="M22 48 Q60 38 98 48 L96 58 Q60 48 24 58 Z" fill={band} stroke="#4A3531" strokeWidth="3" />
        <circle cx="60" cy="48" r="7" fill={dot} />
        <path d="M36 69 Q43 61 50 69" fill="none" stroke="#4A3531" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M70 69 Q77 61 84 69" fill="none" stroke="#4A3531" strokeWidth="3.5" strokeLinecap="round" />
        <ellipse cx="32" cy="76" rx="7" ry="4.5" fill="#FF758F" opacity="0.85" />
        <ellipse cx="88" cy="76" rx="7" ry="4.5" fill="#FF758F" opacity="0.85" />
        <ellipse cx="60" cy="74" rx="7" ry="5" fill="#FF758F" stroke="#4A3531" strokeWidth="2.5" />
        <path d="M52 82 Q60 90 68 82" fill="none" stroke="#4A3531" strokeWidth="3" strokeLinecap="round" />
        <rect x="36" y="84" width="48" height="34" rx="10" fill="#FFF3B0" stroke="#4A3531" strokeWidth="3" />
        <text x="60" y="108" textAnchor="middle" fontSize="22">{prizeIcon}</text>
        <ellipse cx="33" cy="98" rx="8" ry="6" fill={paws} stroke="#4A3531" strokeWidth="3" />
        <ellipse cx="87" cy="98" rx="8" ry="6" fill={paws} stroke="#4A3531" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 120 125" className="w-full h-full drop-shadow-md" aria-hidden="true">
      <ellipse cx="60" cy="74" rx="42" ry="46" fill={body} stroke="#4A3531" strokeWidth="4" />
      <ellipse cx="60" cy="94" rx="26" ry="22" fill={belly} />
      <path d="M22 50 Q60 40 98 50 L96 60 Q60 50 24 60 Z" fill={band} stroke="#4A3531" strokeWidth="3" />
      <circle cx="60" cy="50" r="7" fill={dot} />
      <path d="M97 52 L111 45 L107 56 Z" fill={band} stroke="#4A3531" strokeWidth="2.5" />
      <circle cx="43" cy="70" r="5.5" fill="#4A3531" />
      <circle cx="41.5" cy="68" r="2" fill="#FFFFFF" />
      <circle cx="77" cy="70" r="5.5" fill="#4A3531" />
      <circle cx="75.5" cy="68" r="2" fill="#FFFFFF" />
      <ellipse cx="33" cy="78" rx="6.5" ry="4" fill="#FF8FAB" opacity="0.8" />
      <ellipse cx="87" cy="78" rx="6.5" ry="4" fill="#FF8FAB" opacity="0.8" />
      <ellipse cx="60" cy="76" rx="7" ry="5" fill="#FF758F" stroke="#4A3531" strokeWidth="2.5" />
      <path d="M53 84 Q60 90 67 84" fill="none" stroke="#4A3531" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="30" cy="94" rx="8" ry="6" fill={paws} stroke="#4A3531" strokeWidth="3" />
      <ellipse cx="90" cy="94" rx="8" ry="6" fill={paws} stroke="#4A3531" strokeWidth="3" />
    </svg>
  );
}

export function HammerSvg() {
  return (
    <svg viewBox="0 0 80 80" className="w-full h-full drop-shadow-md" aria-hidden="true">
      <rect x="35" y="34" width="10" height="40" rx="5" fill="#DDA15E" stroke="#4A3531" strokeWidth="3" />
      <rect x="14" y="12" width="52" height="26" rx="10" fill="#FF758F" stroke="#4A3531" strokeWidth="3.5" />
      <rect x="20" y="16" width="40" height="6" rx="3" fill="#FFB3C1" />
    </svg>
  );
}
