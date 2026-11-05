import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, Input, Sheet } from '../../components';
import { fieldClass } from '../../components/Input';
import { create, db, softDelete, update, useActive } from '../../db';
import type { JournalEntry } from '../../db';

/** Date locale du jour au format ISO yyyy-mm-dd. */
export function todayIso(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Plus récentes d'abord (date, puis création). */
export function sortJournal(entries: readonly JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const formatDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? iso : dayFmt.format(d);
};

export function JournalSection({ projectId }: { projectId: string }) {
  const all = useActive(db.journalEntries);
  const entries = sortJournal((all ?? []).filter((e) => e.projectId === projectId));
  const [editing, setEditing] = useState<JournalEntry | 'new' | null>(null);

  return (
    <Card aria-label="Journal de bord" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Journal de bord</h3>
        <Button variant="secondary" onClick={() => setEditing('new')}>
          <Plus aria-hidden size={20} /> Note
        </Button>
      </div>
      {entries.length === 0 && (
        <p className="text-sm text-stone-600 dark:text-stone-400">Aucune note pour l’instant.</p>
      )}
      <ul className="flex flex-col gap-2">
        {entries.map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-1 rounded-xl bg-stone-100 pl-3 dark:bg-stone-900"
          >
            <div className="flex-1 py-2">
              <div className="text-sm font-medium text-stone-600 dark:text-stone-400">
                {formatDay(e.date)}
              </div>
              <p className="whitespace-pre-wrap">{e.text}</p>
            </div>
            <Button variant="ghost" aria-label="Modifier la note" onClick={() => setEditing(e)}>
              <Pencil aria-hidden size={20} />
            </Button>
            <Button
              variant="ghost"
              aria-label="Supprimer la note"
              onClick={() => void softDelete(db.journalEntries, e.id)}
            >
              <Trash2 aria-hidden size={20} />
            </Button>
          </li>
        ))}
      </ul>
      {editing && (
        <EntryEditor
          entry={editing === 'new' ? undefined : editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

function EntryEditor({
  entry,
  projectId,
  onClose,
}: {
  entry?: JournalEntry;
  projectId: string;
  onClose: () => void;
}) {
  const [text, setText] = useState(entry?.text ?? '');
  const [date, setDate] = useState(entry?.date ?? todayIso());

  async function save() {
    if (entry) await update(db.journalEntries, entry.id, { text: text.trim(), date });
    else await create(db.journalEntries, { projectId, text: text.trim(), date });
    onClose();
  }

  return (
    <Sheet open onClose={onClose} title={entry ? 'Modifier la note' : 'Nouvelle note'}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label htmlFor="journal-text" className="text-sm font-medium">
            Note
          </label>
          <textarea
            id="journal-text"
            rows={5}
            className={`${fieldClass} py-2`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={text.trim() === '' || date === ''}>
          Enregistrer
        </Button>
      </form>
    </Sheet>
  );
}
