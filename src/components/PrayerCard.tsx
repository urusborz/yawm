import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { getNextPrayer } from '../lib/prayer-times';
import type { PrayerDay } from '../types';

export function PrayerCard({ prayerDay, now, onOpen, isFallback }: { prayerDay: PrayerDay; now: Date; onOpen?: () => void; isFallback?: boolean }) {
  const targets = useMemo(() => prayerDay.times.filter((t) => t.name !== 'Sunrise'), [prayerDay]);
  const next = useMemo(() => getNextPrayer(targets, now), [targets, now]);

  return (
    <motion.button className="prayer-card" type="button" onClick={onOpen} whileTap={{ scale: 0.99 }}>
      <div className="prayer-card__top">
        <span className="label">Nächstes Gebet{isFallback ? ' · Beispiel' : ''}</span>
        {onOpen ? <ChevronRight size={16} className="prayer-card__chev" /> : null}
      </div>

      <div className="prayer-card__main">
        <div className="prayer-card__name">{next.next.name}</div>
        <div className="prayer-card__count">
          {next.countdown}<span>{next.seconds}</span>
        </div>
      </div>

      <div className="prayer-card__bar"><motion.span initial={false} animate={{ width: `${Math.round(next.progress * 100)}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} /></div>

      <div className="prayer-card__times">
        {targets.map((p, i) => (
          <div className={i === next.index ? 'prayer-tick prayer-tick--active' : 'prayer-tick'} key={p.name}>
            <span>{p.name.slice(0, 3)}</span>
            <b>{p.time}</b>
          </div>
        ))}
      </div>
    </motion.button>
  );
}
