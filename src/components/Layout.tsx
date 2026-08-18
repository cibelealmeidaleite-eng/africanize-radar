import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Radar', exact: true },
  { to: '/pessoas', label: 'Pessoas monitoradas' },
  { to: '/importar', label: 'Importar calendário' },
  { to: '/historico', label: 'Histórico' },
  { to: '/status', label: 'Status do radar' },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-ink-100 text-ink-950 font-body">
      <header className="border-b border-ink-200 bg-ink-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-ember-500 flex items-center justify-center font-display font-bold text-sm">
              AR
            </div>
            <div>
              <h1 className="font-display text-lg font-semibold tracking-tight leading-none">
                Africanize Radar
              </h1>
              <p className="text-[11px] text-ink-400 leading-none mt-1">
                monitoramento editorial &middot; cultura preta &amp; diáspora
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-ink-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 pb-3 scrollbar-thin">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium ${
                  isActive ? 'bg-white/10 text-white' : 'text-ink-300'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
