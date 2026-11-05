import { CountersSection } from './CountersSection';
import { JournalSection } from './JournalSection';
import { TimerSection } from './TimerSection';

/**
 * Panneau affiché dans la fiche d'un projet : chronomètre, compte-rangs, journal de bord.
 * Contrat : implémenté par le module tricot, rendu par la fiche projet (module projets).
 */
export function ProjectTricotPanel({ projectId }: { projectId: string }) {
  return (
    <section aria-label="Suivi du tricot" className="flex flex-col gap-4">
      <TimerSection projectId={projectId} />
      <CountersSection projectId={projectId} />
      <JournalSection projectId={projectId} />
    </section>
  );
}
