import { useState, useEffect } from 'react';
import { Search, Bell, User, ChevronDown, Moon, Sun, LogOut, Lock } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSidebar } from './SidebarContext';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../contexts/NotificationContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { NotificationPanel } from './NotificationPanel';
import { inicializarCache, iniciarMonitoramento } from '../services/notificationService';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { isCollapsed } = useSidebar();
  const { user, logout } = useAuth();
  const { totalNaoLidas, adicionarNotificacao } = useNotifications();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Inicializar cache e monitoramento ao montar o componente
  useEffect(() => {
    const setup = async () => {
      await inicializarCache();
      const parar = iniciarMonitoramento(adicionarNotificacao);
      return () => parar();
    };

    const cleanup = setup();
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [adicionarNotificacao]);

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10 transition-all duration-300 ${
      isCollapsed ? 'left-20' : 'left-64'
    }`}>
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cargos, vagas, unidades..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Notificações"
          >
            <Bell className="w-5 h-5" />
            {totalNaoLidas > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {/* User menu */}
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700 relative">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {user?.nome || user?.email || 'Usuário'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Analista RH</p>
            </div>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
                <button
                  onClick={() => {
                    setShowChangePasswordModal(true);
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Alterar Senha
                </button>
                <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    setShowUserMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowChangePasswordModal(false)}
        />
      )}

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </header>
  );
}