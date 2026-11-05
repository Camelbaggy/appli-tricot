import { Outlet } from 'react-router-dom';
import { SyncStatus } from '../modules/sync';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-stone-50/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur dark:border-stone-800 dark:bg-stone-950/95">
        <span className="text-lg font-bold text-brand-700 dark:text-brand-100">Appli Tricot</span>
        <SyncStatus />
      </header>
      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
