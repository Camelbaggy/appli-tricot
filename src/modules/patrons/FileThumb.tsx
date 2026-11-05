import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { FileText } from 'lucide-react';
import { db } from '../../db';

/** Miniature d'un fichier de la base : image réelle, ou icône pour un PDF. */
export function FileThumb({
  fileId,
  className = 'h-20 w-20',
}: {
  fileId: string;
  className?: string;
}) {
  const file = useLiveQuery(() => db.files.get(fileId), [fileId]);
  const [url, setUrl] = useState<string>();
  const isImage = file?.mimeType.startsWith('image/') ?? false;
  const blob = file?.blob;

  useEffect(() => {
    if (!isImage || !blob) return;
    const u = URL.createObjectURL(blob);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronisation avec une ressource externe (object URL)
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(undefined);
    };
  }, [isImage, blob]);

  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300`}
    >
      {isImage && url ? (
        <img src={url} alt={file?.name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <FileText aria-label="PDF" size={32} />
      )}
    </div>
  );
}
