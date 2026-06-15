import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NotebookPen, Pin, Plus, Save, Search, Trash2 } from 'lucide-react';
import { Screen, SimpleHeader, Segmented, EmptyState, Sheet } from '../components/ui';
import { useData } from '../store';
import type { Note, Scope } from '../types';

const PIN = 'pin';
const isPinned = (n: Note) => n.tags.includes(PIN);
const visibleTags = (n: Note) => n.tags.filter((t) => t !== PIN);

export default function Notes() {
  const data = useData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [scope, setScope] = useState<Scope>('private');
  const [tagsInput, setTagsInput] = useState('');
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [edit, setEdit] = useState<Note | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    data.notes.forEach((n) => visibleTags(n).forEach((t) => set.add(t)));
    return [...set].sort();
  }, [data.notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.notes
      .filter((n) => (activeTag ? n.tags.includes(activeTag) : true))
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .sort((a, b) => (isPinned(a) === isPinned(b) ? b.createdAt.localeCompare(a.createdAt) : isPinned(a) ? -1 : 1));
  }, [data.notes, query, activeTag]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() && !title.trim()) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    await data.createNote({ title: title.trim() || 'Notiz', content: content.trim(), tags, scope });
    setTitle(''); setContent(''); setTagsInput('');
  }

  function togglePin(n: Note) {
    const tags = isPinned(n) ? n.tags.filter((t) => t !== PIN) : [...n.tags, PIN];
    data.updateNote(n.id, { tags });
  }

  return (
    <Screen>
      <SimpleHeader title="Notizen" subtitle={`${data.notes.length} gespeichert`} icon={<NotebookPen size={22} />} />

      <form className="panel compose" onSubmit={submit}>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <textarea className="field field--textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Gedanke festhalten…" />
        <input className="field" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags, mit Komma getrennt" />
        <Segmented value={scope} onChange={setScope} options={[{ value: 'private', label: 'Privat' }, { value: 'shared', label: 'Geteilt' }]} />
        <button className="primary-button" type="submit"><Plus size={18} /> Speichern</button>
      </form>

      <div className="search-field">
        <Search size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Notizen durchsuchen" />
      </div>

      {allTags.length ? (
        <div className="chip-row">
          <button className={activeTag === null ? 'chip chip--active' : 'chip'} type="button" onClick={() => setActiveTag(null)}>Alle</button>
          {allTags.map((t) => <button key={t} className={activeTag === t ? 'chip chip--active' : 'chip'} type="button" onClick={() => setActiveTag(t)}>#{t}</button>)}
        </div>
      ) : null}

      <div className="note-grid">
        <AnimatePresence initial={false}>
          {filtered.length ? filtered.map((n) => (
            <motion.article className={isPinned(n) ? 'note-card note-card--pinned' : 'note-card'} key={n.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <div className="note-card__header">
                <span className={`pill pill--${n.scope === 'shared' ? 'success' : 'soft'}`}>{n.scope === 'shared' ? 'Geteilt' : 'Privat'}</span>
                <div className="note-card__actions">
                  <button className={isPinned(n) ? 'row-icon row-icon--on' : 'row-icon'} type="button" onClick={() => togglePin(n)} title="Anpinnen"><Pin size={15} /></button>
                  <button className="row-icon" type="button" onClick={() => setEdit(n)} title="Bearbeiten"><NotebookPen size={15} /></button>
                  <button className="delete-button" type="button" onClick={() => data.deleteNote(n.id)} title="Löschen"><Trash2 size={15} /></button>
                </div>
              </div>
              <button className="note-card__open" type="button" onClick={() => setEdit(n)}>
                <h2>{n.title}</h2>
                {n.content ? <p>{n.content}</p> : null}
              </button>
              {visibleTags(n).length ? <div className="tag-row">{visibleTags(n).map((t) => <span key={t} className="tag">#{t}</span>)}</div> : null}
            </motion.article>
          )) : <EmptyState icon={<NotebookPen size={26} />} title="Keine Notizen" hint="Halte oben deinen ersten Gedanken fest." />}
        </AnimatePresence>
      </div>

      <EditSheet note={edit} onClose={() => setEdit(null)} />
    </Screen>
  );
}

function EditSheet({ note, onClose }: { note: Note | null; onClose: () => void }) {
  const data = useData();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
    setTagsInput(visibleTags(note).join(', '));
  }, [note]);

  async function save() {
    if (!note) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    if (isPinned(note)) tags.push(PIN);
    await data.updateNote(note.id, { title: title.trim() || 'Notiz', content: content.trim(), tags });
    onClose();
  }

  return (
    <Sheet open={Boolean(note)} title="Notiz bearbeiten" onClose={onClose}>
      <div className="form-stack">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" />
        <textarea className="field field--textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Inhalt" />
        <input className="field" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="Tags, mit Komma getrennt" />
        <button className="primary-button" type="button" onClick={save}><Save size={18} /> Speichern</button>
      </div>
    </Sheet>
  );
}
