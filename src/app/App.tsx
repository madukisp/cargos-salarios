import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { TlpPanel } from './components/TlpPanel';
import { VacancyManagement } from './components/VacancyManagement';
import { Requisitions } from './components/Requisitions';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className="ml-64">
        <Header />
        
        {/* Content Area */}
        <main className="pt-16 p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
