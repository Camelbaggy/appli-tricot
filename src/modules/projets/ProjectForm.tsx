import { useState, type FormEvent } from 'react';
import { create, db, isActive, update, useActive } from '../../db';
import type { Project, ProjectStatus, RecipientType } from '../../db';
import { Button, Input, Select, Sheet } from '../../components';
import { fieldClass } from '../../components/Input';
import { RECIPIENT_LABELS, STATUS_ORDER, STATUS_SINGULAR, statusChanges } from './logic';

export interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  /** Projet à modifier ; absent = création. */
  project?: Project;
  /** Patron présélectionné à la création. */
  defaultPatternId?: string;
  onSaved?: (project: Project) => void;
}

/** Feuille de création / édition d'un projet. */
export function ProjectForm(props: ProjectFormProps) {
  // Remonte le formulaire à chaque ouverture pour repartir des valeurs du projet.
  return (
    <Sheet
      open={props.open}
      onClose={props.onClose}
      title={props.project ? 'Modifier le projet' : 'Nouveau projet'}
    >
      <ProjectFormBody {...props} />
    </Sheet>
  );
}

function ProjectFormBody({ onClose, project, defaultPatternId, onSaved }: ProjectFormProps) {
  const patterns = useActive(db.patterns);
  const [name, setName] = useState(project?.name ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'a_venir');
  const [recipientType, setRecipientType] = useState<RecipientType>(
    project?.recipientType ?? 'soi',
  );
  const [recipientName, setRecipientName] = useState(project?.recipientName ?? '');
  const [startDate, setStartDate] = useState(project?.startDate ?? '');
  const [endDate, setEndDate] = useState(project?.endDate ?? '');
  const [patternId, setPatternId] = useState(project?.patternId ?? defaultPatternId ?? '');
  const [isPro, setIsPro] = useState(project?.isPro ?? false);
  const [notes, setNotes] = useState(project?.notes ?? '');
  const [error, setError] = useState('');

  const patternOptions = [
    { value: '', label: 'Aucun patron' },
    ...(patterns ?? [])
      .filter(isActive)
      .sort((a, b) => a.title.localeCompare(b.title, 'fr'))
      .map((p) => ({ value: p.id, label: p.title })),
  ];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Le nom est obligatoire.');
      return;
    }
    const data = {
      name: name.trim(),
      status,
      recipientType,
      recipientName: recipientType === 'soi' ? undefined : recipientName.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      patternId: patternId || undefined,
      isPro,
      notes: notes.trim() || undefined,
    };
    // Statut modifié dans le formulaire : mêmes règles de dates que le changement rapide.
    if (!project || project.status !== status) {
      Object.assign(data, statusChanges(data, status));
    }
    const saved = project
      ? await update(db.projects, project.id, data)
      : await create(db.projects, data);
    if (saved) onSaved?.(saved);
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        label="Nom du projet"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        autoFocus
      />
      <Select
        label="Statut"
        value={status}
        onChange={(e) => setStatus(e.target.value as ProjectStatus)}
        options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_SINGULAR[s] }))}
      />
      <Select
        label="Destinataire"
        value={recipientType}
        onChange={(e) => setRecipientType(e.target.value as RecipientType)}
        options={(Object.keys(RECIPIENT_LABELS) as RecipientType[]).map((r) => ({
          value: r,
          label: RECIPIENT_LABELS[r],
        }))}
      />
      {recipientType !== 'soi' && (
        <Input
          label={recipientType === 'cadeau' ? 'Offert à' : 'Client'}
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Début"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Fin"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <Select
        label="Patron"
        value={patternId}
        onChange={(e) => setPatternId(e.target.value)}
        options={patternOptions}
      />
      <label className="flex min-h-touch items-center gap-3">
        <input
          type="checkbox"
          checked={isPro}
          onChange={(e) => setIsPro(e.target.checked)}
          className="h-6 w-6 accent-brand-600"
        />
        <span>Pièce pro (à vendre)</span>
      </label>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="project-notes"
          className="text-sm font-medium text-stone-700 dark:text-stone-300"
        >
          Notes
        </label>
        <textarea
          id="project-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${fieldClass} py-2`}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button type="submit" className="flex-1">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
