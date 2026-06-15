import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Moon } from 'lucide-react';
import { getNextPrayer } from '../lib/prayer-times';
import type { PrayerDay } from '../types';

export function PrayerCard({ prayerDay, now, onOpen, isFallback }: { prayerDay: PrayerDay; now: Date; onOpen?: () => void; isFallback?: boolean }) {
  // Sunrise is shown in the list but is not a prayer target for the countdown.
  const targets = useMemo(() => prayerDay.times.filter((t) => t.name !== 'Sunrise'), [prayerDay]);
  const next = useMemo(() => getNextPrayer(targets, now), [targets, now]);

  return (
    <motion.button
      className="prayer-card"
      type="button"
      onClick={onOpen}
      whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="prayer-card__glow" aria-hidden />
      <div className="prayer-card__header">
        <span className="eyebrow"><Moon size={11} /> Nächstes Gebet{isFallback ? ' · Beispiel' : ''}</span>
        <h2>{next.next.name}</h2>
        <p>{next.next.time} Uhr</p>
      </div>
      <div className="prayer-card__countdown">
        <div>
          <strong>{next.countdown}</strong>
          <span>{next.seconds}</span>
        </div>
        <small>bis zum Gebet</small>
      </div>
      <svg className="progress-ring" width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
        <circle cx="46" cy="46" r="40" />
        <circle cx="46" cy="46" r="40" style={{ strokeDashoffset: 251.3 * (1 - next.progress) }} />
      </svg>
      <div className="prayer-dots">
        {targets.map((p, i) => (
          <span className={i === next.index ? 'active' : ''} key={p.name} title={`${p.name} ${p.time}`} />
        ))}
      </div>
    </motion.button>
  );
}
