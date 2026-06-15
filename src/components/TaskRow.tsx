import { motion } from 'framer-motion';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { formatShortDate, formatTime, viennaDate } from '../lib/dates';
import type { Task } from '../types';

const PRIORITY_COLOR: Record<Task['priority'], string> = {
  low: 'var(--ink-3)',
  normal: 'var(--accent)',
  high: 'var(--danger)',
};

function dueLabel(dueAt: string) {
  const day = viennaDate(new Date(dueAt));
  const today = viennaDate();
  if (day === today) return formatTime(dueAt);
  return formatShortDate(day);
}

export function TaskRow({ task, onToggle, onDelete, onEdit }: { task: Task; onToggle: (id: string) => void; onDelete?: (id: string) => void; onEdit?: (task: Task) => void }) {
  const overdue = !task.done && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  return (
    <motion.div className="task-row" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -16 }}>
      <button className="task-row__main" type="button" onClick={() => onToggle(task.id)}>
        <span className={task.done ? 'task-check task-check--done' : 'task-check'}>
          {task.done ? <Check size={14} /> : null}
        </span>
        <span className="task-row__body">
          <span className={task.done ? 'task-title task-title--done' : 'task-title'}>{task.title}</span>
          {task.description ? <span className="task-row__desc">{task.description}</span> : null}
        </span>
        <span className="task-row__meta">
          {task.priority !== 'normal' ? <span className="priority-dot" style={{ background: PRIORITY_COLOR[task.priority] }} /> : null}
          {task.dueAt ? <span className={overdue ? 'muted-chip muted-chip--due' : 'muted-chip'}>{dueLabel(task.dueAt)}</span> : null}
          {task.scope === 'shared' ? <span className="owner-chip">{task.ownerInitials}</span> : null}
        </span>
      </button>
      {onEdit ? (
        <button className="row-icon" type="button" onClick={() => onEdit(task)} title="Bearbeiten"><Pencil size={15} /></button>
      ) : null}
      {onDelete ? (
        <button className="delete-button" type="button" onClick={() => onDelete(task.id)} title="Löschen"><Trash2 size={16} /></button>
      ) : null}
    </motion.div>
  );
}
