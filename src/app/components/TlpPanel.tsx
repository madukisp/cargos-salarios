import { Filter, ChevronDown, ChevronUp, Users, AlertCircle, RefreshCw, ArrowUpDown } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useState, useMemo } from 'react'; // ensure useMemo is imported
import { useTlpData } from '@/app/hooks/useTlpData';

export function TlpPanel() {
  const { data: tlpData, loading, error, updateTlp } = useTlpData();
  const [selectedUnit, setSelectedUnit] = useState('todas');
  const [selectedCostCenter, setSelectedCostCenter] = useState('todos');
  const [selectedRole, setSelectedRole] = useState('todos');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const units = ['todas', ...Array.from(new Set(tlpData.map(d => d.unidade))).sort()];
  const costCenters = ['todos', ...Array.from(new Set(tlpData.map(d => d.centro_custo))).sort()];
  const roles = ['todos', ...Array.from(new Set(tlpData.map(d => d.cargo))).sort()];

  const handleUpdateTlpValue = async (item: any, newValue: number) => {
    if (newValue === item.tlp) return;

    try {
      setUpdating(`${item.centro_custo}-${item.cargo}`);
      await updateTlp(item.id, item.cargo, item.centro_custo, newValue);
    } catch (err) {
      alert('Erro ao atualizar TLP');
    } finally {
      setUpdating(null);
    }
  };

  const sortedData = useMemo(() => {
    let data = tlpData.filter(item => {
      if (selectedUnit !== 'todas' && item.unidade !== selectedUnit) return false;
      if (selectedCostCenter !== 'todos' && item.centro_custo !== selectedCostCenter) return false;
      if (selectedRole !== 'todos' && item.cargo !== selectedRole) return false;
      return true;
    });

    if (sortConfig !== null) {
      data.sort((a, b) => {
        // @ts-ignore - dynamic sorting
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        // @ts-ignore
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return data;
  }, [tlpData, selectedUnit, selectedCostCenter, selectedRole, sortConfig]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin mb-4" />
        <p>Carregando dados TLP...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 rounded-lg">
        <AlertCircle className="w-10 h-10 mb-4" />
        <p>Erro ao carregar dados: {error}</p>
      </div>
    );
  }

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 text-slate-400" />;
  };

  const renderHeader = (label: string, key: string, align: 'left' | 'center' = 'left') => (
    <th
      className={`px-6 py-3 text-${align} text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none`}
      onClick={() => requestSort(key)}
    >
      <div className={`flex items-center ${align === 'center' ? 'justify-center' : ''}`}>
        {label}
        <SortIcon columnKey={key} />
      </div>
    </th>
  );

  const totalAfastados = sortedData.reduce((acc, item) => acc + (item.afastados || 0), 0);
  const summary = sortedData.reduce(
    (acc, item) => ({
      tlp: acc.tlp + item.tlp,
      ativos: acc.ativos + item.ativos,
      saldo: acc.saldo + (item.ativos - item.tlp),
    }),
    { tlp: 0, ativos: 0, saldo: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
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
            value={selectedCostCenter}
            onChange={(e) => setSelectedCostCenter(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {costCenters.map((cc) => (
              <option key={cc} value={cc}>
                {cc === 'todos' ? 'Todos os Centros de Custo' : cc}
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

        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Total Afastados (Filtrado)</p>
              <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100">{totalAfastados}</h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Funcionários em licença</p>
            </div>
            <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                {renderHeader('Cargo', 'cargo')}
                {renderHeader('Unidade', 'unidade')}
                {renderHeader('Centro de Custo', 'centro_custo')}
                {renderHeader('TLP', 'tlp', 'center')}
                {renderHeader('Ativos', 'ativos', 'center')}
                {renderHeader('Afastados', 'afastados', 'center')}
                {renderHeader('Saldo', 'saldo', 'center')}
                {renderHeader('Status', 'status', 'left')}
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {sortedData.map((item, index) => {
                // ... rest of map functionality

                const rowKey = `${item.cargo}-${item.unidade}-${index}`;
                const isUpdating = updating === `${item.centro_custo}-${item.cargo}`;
                return [
                  <tr key={rowKey} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-slate-100">{item.cargo}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{item.unidade}</td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{item.centro_custo}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center justify-center gap-2">
                        <input
                          key={item.tlp}
                          type="number"
                          className={`w-16 text-center border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent ${isUpdating ? 'opacity-50' : ''}`}
                          defaultValue={item.tlp}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              handleUpdateTlpValue(item, val);
                            } else {
                              e.target.value = item.tlp.toString();
                            }
                          }}
                          disabled={isUpdating}
                        />
                        {isUpdating && <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-green-700 dark:text-green-400">{item.ativos}</td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-amber-700 dark:text-amber-400">{item.afastados}</td>
                    <td className="px-6 py-4 text-sm text-center">
                      <span className={`font-medium ${item.saldo < 0 ? 'text-red-600 dark:text-red-400' : item.saldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                        }`}>
                        {item.saldo > 0 ? '+' : ''}{item.saldo}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
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
                            Ver
                          </>
                        )}
                      </button>
                    </td>
                  </tr>,
                  expandedRow === index && item.funcionarios ? (
                    <tr key={`${rowKey}-expanded`}>
                      <td colSpan={9} className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="space-y-6">
                          {/* Active Employees */}
                          {item.funcionarios.filter(f => f.situacao && f.situacao.toUpperCase().includes('ATIVO')).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Funcionários Ativos ({item.funcionarios.filter(f => f.situacao && f.situacao.toUpperCase().includes('ATIVO')).length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.funcionarios
                                  .filter(f => f.situacao && f.situacao.toUpperCase().includes('ATIVO'))
                                  .map((func, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800/30 rounded-lg p-3 shadow-sm">
                                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={func.nome}>{func.nome}</p>
                                      <div className="flex flex-col gap-1 mt-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Admissão: {func.dataAdmissao}</p>
                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-fit">
                                          {func.situacao}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* On Leave Employees */}
                          {item.funcionarios.filter(f => !f.situacao || !f.situacao.toUpperCase().includes('ATIVO')).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                Funcionários Afastados ({item.funcionarios.filter(f => !f.situacao || !f.situacao.toUpperCase().includes('ATIVO')).length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.funcionarios
                                  .filter(f => !f.situacao || !f.situacao.toUpperCase().includes('ATIVO'))
                                  .map((func, idx) => (
                                    <div key={idx} className="bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3 shadow-sm">
                                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate" title={func.nome}>{func.nome}</p>
                                      <div className="flex flex-col gap-1 mt-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Admissão: {func.dataAdmissao}</p>
                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 w-fit">
                                          {func.situacao || 'Situação Desconhecida'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null
                ];
              })}
            </tbody>
          </table>
        </div>
      </div >
    </div >
  );
}