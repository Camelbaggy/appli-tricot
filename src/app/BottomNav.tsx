import { NavLink } from 'react-router-dom';
import { BookOpen, FolderKanban, Package, Wrench, type LucideIcon } from 'lucide-react';
import { cn } from '../lib/cn';

const items: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/projets', label: 'Projets', icon: FolderKanban },
  { to: '/patrons', label: 'Patrons', icon: BookOpen },
  { to: '/filotheque', label: 'Laine', icon: Package },
  { to: '/tricot', label: 'Outils', icon: Wrench },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-stone-800 dark:bg-stone-900"
    >
      <ul className="mx-auto flex max-w-3xl">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                  isActive
                    ? 'text-brand-700 dark:text-brand-100'
                    : 'text-stone-600 dark:text-stone-400',
                )
              }
            >
              <Icon size={24} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
