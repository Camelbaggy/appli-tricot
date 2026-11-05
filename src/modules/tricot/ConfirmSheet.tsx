import { Button, Sheet } from '../../components';

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="mb-4 text-stone-700 dark:text-stone-300">{message}</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}
