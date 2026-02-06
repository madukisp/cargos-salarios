import { useEffect, useState } from 'react';
import { Database, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useDashboardStats, useRequisitions, initializeDatabase } from '../hooks/useSupabase';

export function DatabaseDemo() {
  const { stats, loading: statsLoading } = useDashboardStats();
  const { requisitions, loading: reqLoading, approveRequisition, rejectRequisition } = useRequisitions();
  const [isInitializing, setIsInitializing] = useState(false);
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    setIsInitializing(true);
    setMessage('Inicializando banco de dados...');
    try {
      await initializeDatabase();
      setMessage('✅ Banco de dados inicializado com dados de exemplo!');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setMessage('❌ Erro ao inicializar banco de dados');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveRequisition(id);
      setMessage(`✅ Requisição ${id} aprovada!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Erro ao aprovar requisição');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectRequisition(id);
      setMessage(`✅ Requisição ${id} rejeitada!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Erro ao rejeitar requisição');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Conexão com Supabase</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">Demonstração de integração com banco de dados</p>
          </div>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
            <p className="text-sm text-slate-700 dark:text-slate-300">{message}</p>
          </div>
        )}

        <button
          onClick={handleInitialize}
          disabled={isInitializing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${isInitializing ? 'animate-spin' : ''}`} />
          {isInitializing ? 'Inicializando...' : 'Inicializar Dados de Exemplo'}
        </button>
      </div>

      {/* Stats from Database */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Estatísticas do Banco de Dados
        </h3>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-slate-600 dark:text-slate-400">Carregando...</span>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total TLP</p>
              <p className="text-2xl font-semibold text-blue-900 dark:text-blue-300">{stats.totalTlp}</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">Total Ativos</p>
              <p className="text-2xl font-semibold text-green-900 dark:text-green-300">{stats.totalAtivos}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400 mb-1">Saldo de Vagas</p>
              <p className="text-2xl font-semibold text-red-900 dark:text-red-300">{stats.saldoVagas}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">Vagas Abertas</p>
              <p className="text-2xl font-semibold text-amber-900 dark:text-amber-300">{stats.vagasAbertas}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">Nenhum dado disponível. Inicialize o banco de dados.</p>
        )}
      </div>

      {/* Requisitions from Database */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Requisições do Banco de Dados
        </h3>

        {reqLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-slate-600 dark:text-slate-400">Carregando...</span>
          </div>
        ) : requisitions.length > 0 ? (
          <div className="space-y-3">
            {requisitions.slice(0, 5).map((req: any) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-slate-100">{req.cargo || 'Cargo não especificado'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {req.unidade || 'Unidade não especificada'} • Status: {req.status || 'pendente'}
                  </p>
                </div>
                {req.status === 'pendente' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                      title="Aprovar"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Rejeitar"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">Nenhuma requisição encontrada. Inicialize o banco de dados.</p>
        )}
      </div>

      {/* Connection Info */}
      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong>Status da Conexão:</strong> Conectado ao Supabase Key-Value Store
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
          Os dados são armazenados no banco de dados Supabase e persistidos entre sessões.
          Use os endpoints da API para criar, ler, atualizar e deletar dados.
        </p>
      </div>
    </div>
  );
}
