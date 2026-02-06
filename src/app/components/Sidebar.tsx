import { LayoutDashboard, Users, Briefcase, FileText, Settings, Building2 } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tlp-panel', label: 'TLP vs Ativos', icon: Users },
    { id: 'vacancies', label: 'Gestão de Vagas', icon: Briefcase },
    { id: 'requisitions', label: 'Requisições', icon: FileText },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <Building2 className="w-8 h-8 text-blue-600" />
        <div className="ml-3">
          <h1 className="font-semibold text-slate-900">RH System</h1>
          <p className="text-xs text-slate-500">Cargos & Salários</p>
        </div>
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
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200">
        <button className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors">
          <Settings className="w-5 h-5 mr-3" />
          Configurações
        </button>
      </div>
    </aside>
  );
}
