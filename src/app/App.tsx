import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TlpPanel } from './components/TlpPanel';
import { VacancyManagement } from './components/VacancyManagement';
import { Requisitions } from './components/Requisitions';
import { DatabaseDemo } from './components/DatabaseDemo';
import { Oris } from './components/Oris';
import { Login } from './components/Login';
import { ThemeProvider } from './components/ThemeProvider';
import { SidebarProvider, useSidebar } from './components/SidebarContext';
import { useAuth } from './hooks/useAuth';

function AppContent() {
  const { isAuthenticated } = useAuth();
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
      case 'oris':
        return <Oris />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header />

        {/* Content Area */}
        <main className="pt-16 p-6">


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