import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TlpPanel } from './components/TlpPanel';
import { VacancyManagement } from './components/VacancyManagement';
import { Requisitions } from './components/Requisitions';
import { DatabaseDemo } from './components/DatabaseDemo';
import { Oris } from './components/Oris';
import { EmployeeSearch } from './components/EmployeeSearch';
import { Login } from './components/Login';
import { ThemeProvider } from './components/ThemeProvider';
import { SidebarProvider, useSidebar } from './components/SidebarContext';
import { useAuth } from './hooks/useAuth';
import { Settings } from './components/Settings';
import AgendaAnalistas from './components/AgendaAnalistas';
import { BaseBI } from './components/BaseBI';
import Notas from './components/Notas';
import { SubstitutoVinculationTool } from './components/SubstitutoVinculationTool';
import { NotificationProvider } from './contexts/NotificationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from './components/ui/sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

const queryClient = new QueryClient();

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const { isCollapsed } = useSidebar();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // TODO: Obrigatoriedade de login removida temporariamente
  // if (!isAuthenticated) {
  //   return <Login onLoginSuccess={() => window.location.href = '/'} />;
  // }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Header />

        {/* Content Area */}
        <main className="pt-16 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tlp" element={<TlpPanel />} />
            <Route path="/gestao-vagas" element={<VacancyManagement />} />
            <Route path="/agenda-analistas" element={<AgendaAnalistas />} />
            <Route path="/requisitions" element={<Requisitions />} />
            <Route path="/database" element={<DatabaseDemo />} />
            <Route path="/oris" element={<Oris />} />
            <Route path="/base-bi" element={<BaseBI />} />
            <Route path="/consulta-funcionarios" element={<EmployeeSearch />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/vincular-substitutos" element={<SubstitutoVinculationTool />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NotificationProvider>
          <SidebarProvider>
            <BrowserRouter>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
              <Toaster />
            </BrowserRouter>
          </SidebarProvider>
        </NotificationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}