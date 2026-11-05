import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Plus } from 'lucide-react';
import { db, isActive, useActive } from '../../db';
import type { PatternCategory } from '../../db';
import { Card, EmptyState, Fab, PageHeader } from '../../components';
import { fieldClass } from '../../components/Input';
import { cn } from '../../lib/cn';
import { FileThumb } from './FileThumb';
import { PatternForm } from './PatternForm';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  filterPatterns,
  isKnitted,
  type KnittedFilter,
} from './logic';

const KNITTED_OPTIONS: { value: KnittedFilter; label: string }[] = [
  { value: 'tous', label: 'Tous' },
  { value: 'tricote', label: 'Déjà tricoté' },
  { value: 'pas_encore', label: 'Pas encore' },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-touch shrink-0 rounded-full border px-4 text-sm font-medium',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-stone-300 bg-white text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200',
      )}
    >
      {children}
    </button>
  );
}

export function PatronsPage() {
  const patterns = useActive(db.patterns);
  const projects = useActive(db.projects);
  const [category, setCategory] = useState<PatternCategory | null>(null);
  const [search, setSearch] = useState('');
  const [knitted, setKnitted] = useState<KnittedFilter>('tous');
  const [creating, setCreating] = useState(false);

  const activeProjects = useMemo(() => (projects ?? []).filter(isActive), [projects]);
  const all = useMemo(() => patterns ?? [], [patterns]);
  const list = useMemo(
    () =>
      filterPatterns(all, activeProjects, { category, search, knitted }).sort((a, b) =>
        a.title.localeCompare(b.title, 'fr'),
      ),
    [all, activeProjects, category, search, knitted],
  );

  return (
    <>
      <PageHeader title="Patrons" />
      <input
        type="search"
        aria-label="Rechercher un patron"
        placeholder="Titre ou créateur"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${fieldClass} mb-3`}
      />
      <div
        role="group"
        aria-label="Catégorie"
        className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <Chip active={category === null} onClick={() => setCategory(null)}>
          Toutes
        </Chip>
        {CATEGORY_ORDER.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(category === c ? null : c)}
          >
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </div>
      <div
        role="group"
        aria-label="Déjà tricoté"
        className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {KNITTED_OPTIONS.map((o) => (
          <Chip key={o.value} active={knitted === o.value} onClick={() => setKnitted(o.value)}>
            {o.label}
          </Chip>
        ))}
      </div>

      {patterns && list.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title={all.length === 0 ? 'Votre bibliothèque est vide' : 'Aucun patron trouvé'}
          description={
            all.length === 0
              ? 'Touchez + pour ajouter un patron (PDF, images).'
              : 'Essayez d’autres filtres.'
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link to={`/patrons/${p.id}`} className="block">
                <Card className="flex items-center gap-3">
                  {p.fileIds[0] ? (
                    <FileThumb fileId={p.fileIds[0]} className="h-16 w-16" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-200 text-stone-500 dark:bg-stone-700">
                      <BookOpen aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{p.title}</p>
                    <p className="truncate text-sm text-stone-600 dark:text-stone-400">
                      {[p.designer, CATEGORY_LABELS[p.category]].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {isKnitted(p, activeProjects) && (
                    <CheckCircle2 aria-label="Déjà tricoté" className="shrink-0 text-brand-600" />
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Fab label="Nouveau patron" icon={<Plus />} onClick={() => setCreating(true)} />
      {creating && <PatternForm open onClose={() => setCreating(false)} />}
    </>
  );
}
