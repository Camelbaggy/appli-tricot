import { useState, type ChangeEvent, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { create, db, saveFile, update, useActiveById } from '../../db';
import type { Pattern, PatternCategory, YarnWeight } from '../../db';
import { Button, Input, Select, Sheet } from '../../components';
import { DriveImportButton } from '../sync';
import { CATEGORY_LABELS, CATEGORY_ORDER, YARN_WEIGHT_LABELS, parseTags } from './logic';

export interface PatternFormProps {
  open: boolean;
  onClose: () => void;
  /** Patron à modifier ; absent = création. */
  pattern?: Pattern;
  onSaved?: (pattern: Pattern) => void;
}

export function PatternForm(props: PatternFormProps) {
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title={props.pattern ? 'Modifier le patron' : 'Nouveau patron'}
    >
      <PatternFormBody {...props} />
    </Sheet>
  );
}

const num = (s: string): number | undefined => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

function FileName({ fileId, onRemove }: { fileId: string; onRemove: () => void }) {
  const file = useActiveById(db.files, fileId);
  return (
    <li className="flex items-center justify-between gap-2 rounded-xl bg-stone-100 px-3 dark:bg-stone-700">
      <span className="truncate">{file?.name ?? 'Fichier'}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Retirer ${file?.name ?? 'le fichier'}`}
        className="inline-flex min-h-touch min-w-touch items-center justify-center"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

function PatternFormBody({ onClose, pattern, onSaved }: PatternFormProps) {
  const [title, setTitle] = useState(pattern?.title ?? '');
  const [designer, setDesigner] = useState(pattern?.designer ?? '');
  const [category, setCategory] = useState<PatternCategory>(pattern?.category ?? 'femme');
  const [tags, setTags] = useState(pattern?.tags.join(', ') ?? '');
  const [yarnWeight, setYarnWeight] = useState<string>(pattern?.yarnWeight ?? '');
  const [yardageMin, setYardageMin] = useState(pattern?.yardageMin?.toString() ?? '');
  const [yardageMax, setYardageMax] = useState(pattern?.yardageMax?.toString() ?? '');
  const [needle, setNeedle] = useState(pattern?.needleSizeMm?.toString() ?? '');
  const [sourceUrl, setSourceUrl] = useState(pattern?.sourceUrl ?? '');
  const [fileIds, setFileIds] = useState<string[]>(pattern?.fileIds ?? []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setBusy(true);
    try {
      const saved = await Promise.all(files.map((f) => saveFile(f)));
      setFileIds((ids) => [...ids, ...saved.map((s) => s.id)]);
    } finally {
      setBusy(false);
    }
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    const data = {
      title: title.trim(),
      designer: designer.trim() || undefined,
      category,
      tags: parseTags(tags),
      fileIds,
      knitted: pattern?.knitted,
      yarnWeight: (yarnWeight || undefined) as YarnWeight | undefined,
      yardageMin: num(yardageMin),
      yardageMax: num(yardageMax),
      needleSizeMm: num(needle),
      sourceUrl: sourceUrl.trim() || undefined,
    };
    const saved = pattern
      ? await update(db.patterns, pattern.id, data)
      : await create(db.patterns, data);
    if (saved) onSaved?.(saved);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        label="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={error}
        autoFocus
      />
      <Input label="Créateur" value={designer} onChange={(e) => setDesigner(e.target.value)} />
      <Select
        label="Catégorie"
        value={category}
        onChange={(e) => setCategory(e.target.value as PatternCategory)}
        options={CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
      />
      <Input
        label="Tags (séparés par des virgules)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <Select
        label="Grosseur de fil"
        value={yarnWeight}
        onChange={(e) => setYarnWeight(e.target.value)}
        options={[
          { value: '', label: 'Non précisée' },
          ...(Object.keys(YARN_WEIGHT_LABELS) as YarnWeight[]).map((w) => ({
            value: w,
            label: YARN_WEIGHT_LABELS[w],
          })),
        ]}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Métrage min (m)"
          inputMode="numeric"
          value={yardageMin}
          onChange={(e) => setYardageMin(e.target.value)}
        />
        <Input
          label="Métrage max (m)"
          inputMode="numeric"
          value={yardageMax}
          onChange={(e) => setYardageMax(e.target.value)}
        />
      </div>
      <Input
        label="Aiguilles (mm)"
        inputMode="decimal"
        value={needle}
        onChange={(e) => setNeedle(e.target.value)}
      />
      <Input
        label="Lien source"
        type="url"
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="pattern-files"
          className="text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Fichiers (PDF, images)
        </label>
        <input
          id="pattern-files"
          type="file"
          accept="application/pdf,image/*"
          multiple
          onChange={onFiles}
          className="min-h-touch w-full text-base file:mr-3 file:min-h-touch file:rounded-xl file:border-0 file:bg-stone-200 file:px-4 file:text-stone-900 dark:file:bg-stone-700 dark:file:text-stone-100"
        />
        <DriveImportButton onImported={(ids) => setFileIds((cur) => [...cur, ...ids])} />
        {busy && (
          <p className="text-sm text-stone-600 dark:text-stone-400">Enregistrement des fichiers…</p>
        )}
        {fileIds.length > 0 && (
          <ul className="flex flex-col gap-1">
            {fileIds.map((fid) => (
              <FileName
                key={fid}
                fileId={fid}
                onRemove={() => setFileIds((l) => l.filter((x) => x !== fid))}
              />
            ))}
          </ul>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={busy}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
