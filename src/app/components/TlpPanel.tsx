import { Filter, ChevronDown, ChevronUp, Users, TrendingDown, TrendingUp } from 'lucide-react';
import { StatusBadge, StatusType } from './StatusBadge';
import { useState } from 'react';

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
        <h1 className="text-2xl font-semibold text-slate-900">TLP vs Funcionários Ativos</h1>
        <p className="text-sm text-slate-600 mt-1">Comparação entre quadro necessário e quadro real</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-700">
            <Filter className="w-5 h-5" />
            <span className="font-medium">Filtros:</span>
          </div>
          
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 mb-1">Total TLP (Filtrado)</p>
              <p className="text-3xl font-semibold text-blue-900">{summary.tlp}</p>
            </div>
            <Users className="w-10 h-10 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 mb-1">Total Ativos (Filtrado)</p>
              <p className="text-3xl font-semibold text-green-900">{summary.ativos}</p>
            </div>
            <Users className="w-10 h-10 text-green-600" />
          </div>
        </div>

        <div className={`rounded-lg border p-6 ${
          summary.saldo < 0 
            ? 'bg-red-50 border-red-200' 
            : summary.saldo > 0 
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${
                summary.saldo < 0 
                  ? 'text-red-700' 
                  : summary.saldo > 0 
                  ? 'text-amber-700'
                  : 'text-slate-700'
              }`}>
                Saldo (Filtrado)
              </p>
              <p className={`text-3xl font-semibold ${
                summary.saldo < 0 
                  ? 'text-red-900' 
                  : summary.saldo > 0 
                  ? 'text-amber-900'
                  : 'text-slate-900'
              }`}>
                {summary.saldo > 0 ? '+' : ''}{summary.saldo}
              </p>
            </div>
            {summary.saldo < 0 ? (
              <TrendingDown className="w-10 h-10 text-red-600" />
            ) : summary.saldo > 0 ? (
              <TrendingUp className="w-10 h-10 text-amber-600" />
            ) : (
              <Users className="w-10 h-10 text-slate-600" />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Unidade</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">TLP</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Ativos</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Saldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredData.map((item, index) => (
                <>
                  <tr key={index} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.cargo}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{item.unidade}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900">{item.tlp}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900">{item.ativos}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`font-medium ${
                        item.saldo < 0 ? 'text-red-600' : item.saldo > 0 ? 'text-amber-600' : 'text-green-600'
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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
                  </tr>
                  {expandedRow === index && item.funcionarios && (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 bg-slate-50">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-slate-900 mb-3">Funcionários Ativos:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {item.funcionarios.map((func, idx) => (
                              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-slate-900">{func.nome}</p>
                                <p className="text-xs text-slate-600 mt-1">Admissão: {func.dataAdmissao}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
