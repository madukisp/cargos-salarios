import { LayoutDashboard, Users, Briefcase, FileText, Settings, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebar } from './SidebarContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tlp-panel', label: 'TLP vs Ativos', icon: Users },
    { id: 'vacancies', label: 'Gestão de Vagas', icon: Briefcase },
    { id: 'requisitions', label: 'Requisições', icon: FileText },
  ];

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
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
          <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
        <button 
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-4'} py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors`}
          title={isCollapsed ? 'Configurações' : undefined}
        >
          <Settings className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
          {!isCollapsed && 'Configurações'}
        </button>
        
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