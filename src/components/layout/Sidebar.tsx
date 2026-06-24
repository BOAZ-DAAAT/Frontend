import { BarChart3, Database, FileOutput, LayoutDashboard, PlayCircle } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Datasources',
    path: '/datasources',
    icon: Database,
  },
  {
    label: 'Workspace',
    path: '/workspace',
    icon: BarChart3,
  },
  {
    label: 'Runs',
    path: '/runs',
    icon: PlayCircle,
  },
  {
    label: 'Artifacts',
    path: '/artifacts',
    icon: FileOutput,
  },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-slate-900/90 p-6 lg:block">
      <div className="mb-10">
        <p className="text-sm font-medium text-brand-100">DAAAT</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">AI Agent</h2>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
                  isActive
                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
