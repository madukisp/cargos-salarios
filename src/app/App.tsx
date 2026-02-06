import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TlpPanel } from './components/TlpPanel';
import { VacancyManagement } from './components/VacancyManagement';
import { Requisitions } from './components/Requisitions';
import { DatabaseDemo } from './components/DatabaseDemo';
import { ThemeProvider } from './components/ThemeProvider';
import { SidebarProvider, useSidebar } from './components/SidebarContext';

function AppContent() {
  const [currentView, setCurrentView] = useState('dashboard');
  const { isCollapsed } = useSidebar();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'tlp-panel':
        return <TlpPanel />;
      case 'vacancies':
        return <VacancyManagement />;
      case 'requisitions':
        return <Requisitions />;
      case 'database':
        return <DatabaseDemo />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header />
        
        {/* Content Area */}
        <main className="pt-16 p-6">
          {/* Database Demo Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">🎉 Sistema conectado ao Supabase!</h2>
                <p className="text-sm opacity-90">Clique no botão para ver a demonstração da integração com banco de dados</p>
              </div>
              <button
                onClick={() => setCurrentView('database')}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Ver Demo
              </button>
            </div>
          </div>
          
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AppContent />
      </SidebarProvider>
    </ThemeProvider>
  );
}