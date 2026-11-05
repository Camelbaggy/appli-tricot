import { useState } from 'react';
import { Button, Select, Sheet } from '../../components';
import { create, db, type Yarn } from '../../db';
import { yarnTitle } from './calc';
import { StashItemForm, YarnForm, type NewYarnData } from './forms';

const NEW = '__new__';

/** Ajout en deux temps : (1) choisir ou créer un fil, (2) saisir la pelote. */
export function AddStashSheet({
  yarns,
  onClose,
  onCreated,
}: {
  yarns: Yarn[];
  onClose: () => void;
  onCreated?: (stashItemId: string) => void;
}) {
  const sorted = [...yarns].sort((a, b) => yarnTitle(a).localeCompare(yarnTitle(b), 'fr'));
  const [choice, setChoice] = useState(sorted[0]?.id ?? NEW);
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState<NewYarnData | undefined>();

  const existing = sorted.find((y) => y.id === choice);
  const spec = existing ?? draft;

  return (
    <Sheet
      open
      onClose={onClose}
      title={step === 1 ? 'Ajouter une laine : le fil' : 'Ajouter une laine : la pelote'}
    >
      {step === 1 && (
        <div className="flex flex-col gap-3">
          {sorted.length > 0 && (
            <Select
              label="Fil"
              value={choice}
              options={[
                ...sorted.map((y) => ({ value: y.id, label: yarnTitle(y) })),
                { value: NEW, label: '+ Créer un nouveau fil…' },
              ]}
              onChange={(e) => setChoice(e.target.value)}
            />
          )}
          {choice === NEW ? (
            <YarnForm
              submitLabel="Suivant"
              onCancel={onClose}
              onSubmit={(y) => {
                setDraft(y);
                setStep(2);
              }}
            />
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Annuler
              </Button>
              <Button onClick={() => setStep(2)} className="flex-1">
                Suivant
              </Button>
            </div>
          )}
        </div>
      )}
      {step === 2 && spec && (
        <StashItemForm
          spec={spec}
          yarnId={existing?.id ?? ''}
          submitLabel="Ajouter au stock"
          onCancel={() => setStep(1)}
          onSubmit={async (data) => {
            let yarnId = existing?.id;
            if (!yarnId && draft) yarnId = (await create(db.yarns, draft)).id;
            if (!yarnId) return;
            const item = await create(db.stashItems, { ...data, yarnId });
            onCreated?.(item.id);
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}
