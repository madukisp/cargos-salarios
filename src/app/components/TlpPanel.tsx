import { Filter, ChevronDown, ChevronUp, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { StatusBadge, StatusType } from './StatusBadge';
import { useState } from 'react';
import React from 'react';

interface TlpData {
  cargo: string;
  unidade: string;
  tlp: number;
  ativos: number;
  saldo: number;
  status: StatusType;
  funcionarios?: { nome: string; dataAdmissao: string }[];
}

export function TlpPanel() {
  const [selectedUnit, setSelectedUnit] = useState('todas');
  const [selectedRole, setSelectedRole] = useState('todos');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const tlpData: TlpData[] = [
    {
      cargo: 'Enfermeiro',
      unidade: 'UPA Central',
      tlp: 25,
      ativos: 22,
      saldo: -3,
      status: 'deficit',
      funcionarios: [
        { nome: 'Maria Santos', dataAdmissao: '15/03/2020' },
        { nome: 'João Oliveira', dataAdmissao: '22/08/2021' },
        { nome: 'Ana Costa', dataAdmissao: '10/01/2022' },
      ],
    },
    {
      cargo: 'Médico Clínico',
      unidade: 'Hospital Geral',
      tlp: 45,
      ativos: 42,
      saldo: -3,
      status: 'deficit',
      funcionarios: [
        { nome: 'Dr. Pedro Silva', dataAdmissao: '05/06/2019' },
        { nome: 'Dra. Carla Mendes', dataAdmissao: '18/11/2020' },
      ],
    },
    {
      cargo: 'Técnico Enfermagem',
      unidade: 'UBS Norte',
      tlp: 18,
      ativos: 20,
      saldo: 2,
      status: 'excedente',
      funcionarios: [
        { nome: 'Paula Ferreira', dataAdmissao: '20/02/2021' },
        { nome: 'Carlos Souza', dataAdmissao: '14/07/2022' },
      ],
    },
    {
      cargo: 'Recepcionista',
      unidade: 'Centro Especial',
      tlp: 12,
      ativos: 12,
      saldo: 0,
      status: 'completo',
      funcionarios: [
        { nome: 'Lucia Martins', dataAdmissao: '30/09/2020' },
        { nome: 'Roberto Lima', dataAdmissao: '12/04/2021' },
      ],
    },
    {
      cargo: 'Auxiliar Administrativo',
      unidade: 'Administrativo',
      tlp: 35,
      ativos: 30,
      saldo: -5,
      status: 'deficit',
      funcionarios: [
        { nome: 'Fernanda Alves', dataAdmissao: '08/01/2020' },
        { nome: 'Ricardo Gomes', dataAdmissao: '25/05/2021' },
      ],
    },
    {
      cargo: 'Farmacêutico',
      unidade: 'Hospital Geral',
      tlp: 15,
      ativos: 15,
      saldo: 0,
      status: 'completo',
      funcionarios: [
        { nome: 'Sandra Rodrigues', dataAdmissao: '17/03/2019' },
        { nome: 'Marcos Pereira', dataAdmissao: '29/08/2020' },
      ],
    },
    {
      cargo: 'Fisioterapeuta',
      unidade: 'UPA Central',
      tlp: 10,
      ativos: 8,
      saldo: -2,
      status: 'deficit',
      funcionarios: [
        { nome: 'Julia Nascimento', dataAdmissao: '11/06/2021' },
        { nome: 'Felipe Santos', dataAdmissao: '03/12/2021' },
      ],
    },
    {
      cargo: 'Psicólogo',
      unidade: 'Centro Especial',
      tlp: 8,
      ativos: 8,
      saldo: 0,
      status: 'completo',
      funcionarios: [
        { nome: 'Beatriz Costa', dataAdmissao: '19/04/2020' },
        { nome: 'André Silveira', dataAdmissao: '07/09/2021' },
      ],
    },
  ];

  const units = ['todas', ...Array.from(new Set(tlpData.map(d => d.unidade)))];
  const roles = ['todos', ...Array.from(new Set(tlpData.map(d => d.cargo)))];

  const filteredData = tlpData.filter(item => {
    if (selectedUnit !== 'todas' && item.unidade !== selectedUnit) return false;
    if (selectedRole !== 'todos' && item.cargo !== selectedRole) return false;
    return true;
  });

  const summary = filteredData.reduce(
    (acc, item) => ({
      tlp: acc.tlp + item.tlp,
      ativos: acc.ativos + item.ativos,
      saldo: acc.saldo + item.saldo,
    }),
    { tlp: 0, ativos: 0, saldo: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">TLP vs Funcionários Ativos</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Comparação entre quadro necessário e quadro real</p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros:</span>
          </div>
          
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit === 'todas' ? 'Todas as Unidades' : unit}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role === 'todos' ? 'Todos os Cargos' : role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Total TLP (Filtrado)</p>
              <p className="text-3xl font-semibold text-blue-900 dark:text-blue-300">{summary.tlp}</p>
            </div>
            <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 dark:text-green-400 mb-1">Total Ativos (Filtrado)</p>
              <p className="text-3xl font-semibold text-green-900 dark:text-green-300">{summary.ativos}</p>
            </div>
            <Users className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <div className={`rounded-lg border p-6 ${
          summary.saldo < 0 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
            : summary.saldo > 0 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${
                summary.saldo < 0 
                  ? 'text-red-700 dark:text-red-400' 
                  : summary.saldo > 0 
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                Saldo (Filtrado)
              </p>
              <p className={`text-3xl font-semibold ${
                summary.saldo < 0 
                  ? 'text-red-900 dark:text-red-300' 
                  : summary.saldo > 0 
                  ? 'text-amber-900 dark:text-amber-300'
                  : 'text-slate-900 dark:text-slate-100'
              }`}>
                {summary.saldo > 0 ? '+' : ''}{summary.saldo}
              </p>
            </div>
            {summary.saldo < 0 ? (
              <TrendingDown className="w-10 h-10 text-red-600 dark:text-red-400" />
            ) : summary.saldo > 0 ? (
              <TrendingUp className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            ) : (
              <Users className="w-10 h-10 text-slate-600 dark:text-slate-400" />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">TLP</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ativos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredData.map((item, index) => {
                const rowKey = `${item.cargo}-${item.unidade}-${index}`;
                return [
                  <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{item.cargo}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{item.unidade}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900 dark:text-slate-100">{item.tlp}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900 dark:text-slate-100">{item.ativos}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`font-medium ${
                        item.saldo < 0 ? 'text-red-600 dark:text-red-400' : item.saldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {item.saldo > 0 ? '+' : ''}{item.saldo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setExpandedRow(expandedRow === index ? null : index)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      >
                        {expandedRow === index ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-4 h-4" />
                            Ver Funcionários
                          </>
                        )}
                      </button>
                    </td>
                  </tr>,
                  expandedRow === index && item.funcionarios ? (
                    <tr key={`${rowKey}-expanded`}>
                      <td colSpan={7} className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Funcionários Ativos:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {item.funcionarios.map((func, idx) => (
                              <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{func.nome}</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Admissão: {func.dataAdmissao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}