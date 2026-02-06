import { Filter, Search, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { StatusBadge, StatusType } from './StatusBadge';
import { useState } from 'react';

interface Requisition {
  id: string;
  tipo: string;
  unidade: string;
  cargo: string;
  quantidade: number;
  urgencia: 'urgente' | 'normal';
  status: StatusType;
  solicitante: string;
  dataSolicitacao: string;
  justificativa: string;
}

export function Requisitions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);

  const requisitions: Requisition[] = [
    {
      id: 'REQ001',
      tipo: 'Aumento de Quadro',
      unidade: 'UPA Central',
      cargo: 'Enfermeiro',
      quantidade: 3,
      urgencia: 'urgente',
      status: 'pendente',
      solicitante: 'Dr. Pedro Silva',
      dataSolicitacao: '01/02/2026',
      justificativa: 'Aumento de demanda no período noturno. Necessário reforço para atender fluxo crescente de pacientes.',
    },
    {
      id: 'REQ002',
      tipo: 'Substituição',
      unidade: 'Hospital Geral',
      cargo: 'Médico Clínico',
      quantidade: 1,
      urgencia: 'normal',
      status: 'aprovado',
      solicitante: 'Dra. Carla Mendes',
      dataSolicitacao: '28/01/2026',
      justificativa: 'Substituição de profissional afastado por licença médica prolongada.',
    },
    {
      id: 'REQ003',
      tipo: 'Aumento de Quadro',
      unidade: 'Centro Especial',
      cargo: 'Fisioterapeuta',
      quantidade: 2,
      urgencia: 'normal',
      status: 'pendente',
      solicitante: 'Maria Santos',
      dataSolicitacao: '03/02/2026',
      justificativa: 'Expansão do serviço de reabilitação. Novo convênio exige ampliação da equipe.',
    },
    {
      id: 'REQ004',
      tipo: 'Aumento de Quadro',
      unidade: 'UBS Norte',
      cargo: 'Psicólogo',
      quantidade: 1,
      urgencia: 'urgente',
      status: 'pendente',
      solicitante: 'João Oliveira',
      dataSolicitacao: '02/02/2026',
      justificativa: 'Demanda reprimida em saúde mental. Lista de espera superior a 60 dias.',
    },
    {
      id: 'REQ005',
      tipo: 'Substituição',
      unidade: 'Administrativo',
      cargo: 'Auxiliar Administrativo',
      quantidade: 2,
      urgencia: 'normal',
      status: 'rejeitado',
      solicitante: 'Paula Souza',
      dataSolicitacao: '25/01/2026',
      justificativa: 'Realocação interna pode atender a demanda atual.',
    },
    {
      id: 'REQ006',
      tipo: 'Aumento de Quadro',
      unidade: 'Hospital Geral',
      cargo: 'Técnico Enfermagem',
      quantidade: 4,
      urgencia: 'urgente',
      status: 'pendente',
      solicitante: 'Dr. Pedro Silva',
      dataSolicitacao: '04/02/2026',
      justificativa: 'Nova ala inaugurada. Necessário quadro completo para início das atividades.',
    },
  ];

  const filteredRequisitions = requisitions.filter(req => {
    const matchesSearch = 
      req.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.solicitante.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || req.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'todos', label: 'Todos Status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'aprovado', label: 'Aprovado' },
    { value: 'rejeitado', label: 'Rejeitado' },
  ];

  const handleApprove = (id: string) => {
    alert(`Requisição ${id} aprovada com sucesso!`);
    setSelectedRequisition(null);
  };

  const handleReject = (id: string) => {
    alert(`Requisição ${id} rejeitada.`);
    setSelectedRequisition(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Requisições de Quadro</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Análise e aprovação de solicitações de aumento e alteração de quadro</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cargo, unidade ou solicitante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-700 dark:text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{requisitions.length}</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400 mb-1">Pendentes</p>
          <p className="text-2xl font-semibold text-amber-900 dark:text-amber-300">
            {requisitions.filter(r => r.status === 'pendente').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-400 mb-1">Aprovadas</p>
          <p className="text-2xl font-semibold text-green-900 dark:text-green-300">
            {requisitions.filter(r => r.status === 'aprovado').length}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400 mb-1">Rejeitadas</p>
          <p className="text-2xl font-semibold text-red-900 dark:text-red-300">
            {requisitions.filter(r => r.status === 'rejeitado').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Qtd</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Urgência</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Solicitante</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredRequisitions.map((req) => (
                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{req.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{req.tipo}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{req.cargo}</td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{req.unidade}</td>
                  <td className="px-6 py-4 text-sm text-center font-medium text-slate-900 dark:text-slate-100">{req.quantidade}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.urgencia} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{req.solicitante}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setSelectedRequisition(req)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" 
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {req.status === 'pendente' && (
                        <>
                          <button 
                            onClick={() => handleApprove(req.id)}
                            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" 
                            title="Aprovar"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(req.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" 
                            title="Rejeitar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedRequisition && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Detalhes da Requisição</h2>
              <button 
                onClick={() => setSelectedRequisition(null)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-6 space-y-6">
              {/* ID and Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">ID da Requisição</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{selectedRequisition.id}</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={selectedRequisition.status} />
                  <StatusBadge status={selectedRequisition.urgencia} />
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Tipo de Requisição</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.tipo}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Data da Solicitação</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.dataSolicitacao}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Cargo</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.cargo}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Quantidade</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.quantidade}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Unidade</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.unidade}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Solicitante</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedRequisition.solicitante}</p>
                </div>
              </div>

              {/* Justification */}
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Justificativa</p>
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{selectedRequisition.justificativa}</p>
                </div>
              </div>

              {/* Actions */}
              {selectedRequisition.status === 'pendente' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleApprove(selectedRequisition.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Aprovar Requisição
                  </button>
                  <button
                    onClick={() => handleReject(selectedRequisition.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Rejeitar Requisição
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}