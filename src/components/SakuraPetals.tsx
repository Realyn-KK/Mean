import {useMemo} from 'react';

const PETAL_SYMBOLS = ['🌸', '💮', '🍃'] as const;

interface PetalConfig {
  id: number;
  symbol: string;
  left: string;
  duration: string;
  delay: string;
}

export function SakuraPetals() {
  const petals = useMemo<PetalConfig[]>(() => {
    return Array.from({length: 14}, (_, i) => ({
      id: i,
      symbol: PETAL_SYMBOLS[i % PETAL_SYMBOLS.length],
      left: `${((i * 7.3 + 4) % 96).toFixed(1)}%`,
      duration: `${8 + (i % 7) * 1.25}s`,
      delay: `${(i % 6) * 0.95}s`,
    }));
  }, []);

  return (
    <div id="sakura-container" aria-hidden="true">
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="sakura-petal text-base sm:text-xl opacity-75"
          style={{
            left: petal.left,
            animationDuration: petal.duration,
            animationDelay: petal.delay,
          }}
        >
          {petal.symbol}
        </div>
      ))}
    </div>
  );
}
