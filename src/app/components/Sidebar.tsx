import { LayoutDashboard, Users, Briefcase, FileText, Settings, Building2, ChevronLeft, ChevronRight, Table, Calendar } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { Link, useLocation } from 'react-router-dom';

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },

    { path: '/gestao-vagas', label: 'Gestão de Vagas', icon: Briefcase },
    { path: '/agenda-analistas', label: 'Agenda Analistas', icon: Calendar },
    { path: '/tlp', label: 'TLP vs Ativos', icon: Users },

    { path: '/consulta-funcionarios', label: 'Pesquisa', icon: Users },
    { path: '/oris', label: 'Oris', icon: Table },
    { path: '/requisitions', label: 'Requisições', icon: FileText },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'
      }`}>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-700">
        {!isCollapsed && (
          <>
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <h1 className="font-semibold text-slate-900 dark:text-slate-100">RH System</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cargos & Salários</p>
            </div>
          </>
        )}
        {isCollapsed && (
          <div className="mx-auto flex items-center justify-center h-full">
            <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors ${isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <Link
          to="/configuracoes"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors`}
          title={isCollapsed ? 'Configurações' : undefined}
        >
          <Settings className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Configurações'}
        </Link>

        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
}