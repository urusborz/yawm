import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Animated page wrapper
// ---------------------------------------------------------------------------
export function Screen({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SimpleHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <header className="simple-header">
      <div>
        {subtitle ? <span>{subtitle}</span> : null}
        <h1>{title}</h1>
      </div>
      {action ?? (icon ? <div className="header-icon">{icon}</div> : null)}
    </header>
  );
}

// ---------------------------------------------------------------------------
// Staggered list — children fade/slide in one after another
// ---------------------------------------------------------------------------
export function StaggerList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <motion.div
      className={className}
      onClick={onClick}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
    >
      {children}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Progress ring
// ---------------------------------------------------------------------------
export function Ring({ progress, size = 92, stroke = 7, color = '#fff', track = 'rgba(255,255,255,0.24)', children }: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </svg>
      {children ? <div className="ring__center">{children}</div> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bottom sheet
// ---------------------------------------------------------------------------
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.button className="sheet__backdrop" type="button" onClick={onClose} aria-label="Schliessen"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="sheet__panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="sheet__handle" />
            <div className="sheet__header">
              <h2>{title}</h2>
              <button className="icon-button" type="button" onClick={onClose} title="Schliessen"><X size={18} /></button>
            </div>
            <div className="sheet__body">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Small bits
// ---------------------------------------------------------------------------
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)} role="tab" aria-selected={value === o.value}>
          {value === o.value ? <motion.span layoutId="seg-pill" className="segmented__pill" transition={{ type: 'spring', damping: 28, stiffness: 320 }} /> : null}
          <span className="segmented__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <motion.div className="empty-state" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="empty-state__icon">{icon}</div>
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </motion.div>
  );
}

export function Pill({ children, tone = 'soft' }: { children: ReactNode; tone?: 'soft' | 'danger' | 'success' | 'ghost' }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

/** Height-animated disclosure. Children are collapsed (and unmounted) when closed. */
export function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function Avatar({ text, tone }: { text: string; tone?: string }) {
  return <span className="avatar" style={tone ? { background: tone } : undefined}>{text}</span>;
}
