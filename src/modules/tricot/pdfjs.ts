import * as pdfjs from 'pdfjs-dist';
// Worker servi localement par Vite (et précaché par le service worker) : fonctionne hors-ligne.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjs };
