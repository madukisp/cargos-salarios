import { Filter, Search, Eye, Edit, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { StatusBadge, StatusType } from './StatusBadge';
import { useState } from 'react';

interface Vacancy {
  id: string;
  cargo: string;
  unidade: string;
  motivo: string;
  analista: string;
  status: StatusType;
  diasAberto: number;
  dataAbertura: string;
}

export function VacancyManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const vacancies: Vacancy[] = [
    {
      id: 'V001',
      cargo: 'Enfermeiro',
      unidade: 'UPA Central',
      motivo: 'Demissão',
      analista: 'Ana Silva',
      status: 'aberto',
      diasAberto: 15,
      dataAbertura: '20/01/2026',
    },
    {
      id: 'V002',
      cargo: 'Médico Clínico',
      unidade: 'Hospital Geral',
      motivo: 'Afastamento',
      analista: 'Carlos Mendes',
      status: 'em-processo',
      diasAberto: 8,
      dataAbertura: '27/01/2026',
    },
    {
      id: 'V003',
      cargo: 'Técnico Enfermagem',
      unidade: 'UBS Norte',
      motivo: 'Demissão',
      analista: 'Ana Silva',
      status: 'aberto',
      diasAberto: 22,
      dataAbertura: '13/01/2026',
    },
    {
      id: 'V004',
      cargo: 'Recepcionista',
      unidade: 'Centro Especial',
      motivo: 'Requisição',
      analista: 'Paula Souza',
      status: 'em-processo',
      diasAberto: 5,
      dataAbertura: '30/01/2026',
    },
    {
      id: 'V005',
      cargo: 'Auxiliar Administrativo',
      unidade: 'Administrativo',
      motivo: 'Demissão',
      analista: 'Carlos Mendes',
      status: 'aberto',
      diasAberto: 31,
      dataAbertura: '05/01/2026',
    },
    {
      id: 'V006',
      cargo: 'Farmacêutico',
      unidade: 'Hospital Geral',
      motivo: 'Aposentadoria',
      analista: 'Ana Silva',
      status: 'preenchido',
      diasAberto: 45,
      dataAbertura: '20/12/2025',
    },
    {
      id: 'V007',
      cargo: 'Fisioterapeuta',
      unidade: 'UPA Central',
      motivo: 'Demissão',
      analista: 'Paula Souza',
      status: 'em-processo',
      diasAberto: 12,
      dataAbertura: '23/01/2026',
    },
    {
      id: 'V008',
      cargo: 'Psicólogo',
      unidade: 'Centro Especial',
      motivo: 'Afastamento',
      analista: 'Carlos Mendes',
      status: 'aberto',
      diasAberto: 18,
      dataAbertura: '17/01/2026',
    },
  ];

  const filteredVacancies = vacancies.filter(vacancy => {
    const matchesSearch = 
      vacancy.cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacancy.unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vacancy.analista.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todos' || vacancy.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getSlaStatus = (dias: number) => {
    if (dias > 30) return { icon: AlertTriangle, color: 'text-red-600', label: 'Crítico' };
    if (dias > 15) return { icon: Clock, color: 'text-amber-600', label: 'Atenção' };
    return { icon: CheckCircle, color: 'text-green-600', label: 'Normal' };
  };

  const statusOptions = [
    { value: 'todos', label: 'Todos Status' },
    { value: 'aberto', label: 'Aberto' },
    { value: 'em-processo', label: 'Em Processo' },
    { value: 'preenchido', label: 'Preenchido' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Gestão de Vagas</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Acompanhamento e controle de todas as vagas abertas</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por cargo, unidade ou analista..."
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
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total de Vagas</p>
          <p className="text-2xl font-semibold text-blue-900 dark:text-blue-300">{vacancies.length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400 mb-1">Abertas</p>
          <p className="text-2xl font-semibold text-red-900 dark:text-red-300">
            {vacancies.filter(v => v.status === 'aberto').length}
          </p>
        </div>
        <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg p-4">
          <p className="text-sm text-sky-700 dark:text-sky-400 mb-1">Em Processo</p>
          <p className="text-2xl font-semibold text-sky-900 dark:text-sky-300">
            {vacancies.filter(v => v.status === 'em-processo').length}
          </p>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-400 mb-1">Preenchidas (30d)</p>
          <p className="text-2xl font-semibold text-green-900 dark:text-green-300">
            {vacancies.filter(v => v.status === 'preenchido').length}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Motivo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Analista</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">SLA</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredVacancies.map((vacancy) => {
                const slaStatus = getSlaStatus(vacancy.diasAberto);
                const SlaIcon = slaStatus.icon;

                return (
                  <tr key={vacancy.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{vacancy.id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{vacancy.cargo}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{vacancy.unidade}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{vacancy.motivo}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{vacancy.analista}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={vacancy.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <SlaIcon className={`w-4 h-4 ${slaStatus.color} dark:brightness-110`} />
                        <span className={`text-sm font-medium ${slaStatus.color} dark:brightness-110`}>
                          {vacancy.diasAberto}d
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Editar">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Mostrando {filteredVacancies.length} de {vacancies.length} vagas
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              1
            </button>
            <button className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              2
            </button>
            <button className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}