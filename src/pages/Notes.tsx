import { FormEvent, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NotebookPen, Plus, Search, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState } from '../components/ui';
import { useData } from '../store';
import type { Scope } from '../types';

export default function Notes() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [tagsInput, setTagsInput] = useState('');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.notes;
    return data.notes.filter((n) =>
      n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [data.notes, query]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    await data.createNote({ title: title.trim() || 'Notiz', content: content.trim(), tags, scope });
    setTitle(''); setContent(''); setTagsInput('');
  }

  return (
    <Screen>
      <SimpleHeader title="Notizen" subtitle={`${data.notes.length} gespeichert`} icon={<NotebookPen size={24} />} />

      <form className="panel compose" onSubmit={submit}>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <textarea className="field field--textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Gedanke festhalten…" />
        <input className="field" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags, mit Komma getrennt" />
        <div className="form-grid form-grid--2">
          <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
          <button className="primary-button" type="submit"><Plus size={18} /> Speichern</button>
        </div>
      </form>

      <div className="search-field">
        <Search size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Notizen durchsuchen" />
      </div>

      <div className="note-grid">
        <AnimatePresence initial={false}>
          {filtered.length ? filtered.map((n) => (
            <motion.article className="note-card" key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div className="note-card__header">
                <span className={`pill pill--${n.scope === 'shared' ? 'success' : 'soft'}`}>{n.scope === 'shared' ? 'Geteilt' : 'Privat'}</span>
                <button className="delete-button" type="button" onClick={() => data.deleteNote(n.id)} title="Löschen"><Trash2 size={15} /></button>
              </div>
              <h2>{n.title}</h2>
              {n.content ? <p>{n.content}</p> : null}
              {n.tags.length ? <div className="tag-row">{n.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div> : null}
            </motion.article>
          )) : <EmptyState icon={<NotebookPen size={26} />} title="Keine Notizen" hint="Halte oben deinen ersten Gedanken fest." />}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
