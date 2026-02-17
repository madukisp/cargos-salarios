import { Filter, ChevronDown, ChevronUp, Users, AlertCircle, RefreshCw, ArrowUpDown, Archive, ArchiveRestore, Plus } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useState, useMemo } from 'react'; // ensure useMemo is imported
import { useTlpData } from '@/app/hooks/useTlpData';
import { AddCargoTlpModal } from './AddCargoTlpModal';

export function TlpPanel() {
  const { data: tlpData, loading, error, updateTlp, archiveTlp, unarchiveTlp } = useTlpData();
  const [selectedUnit, setSelectedUnit] = useState('todas');
  const [selectedCostCenter, setSelectedCostCenter] = useState('todos');
  const [selectedRole, setSelectedRole] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState<'completo' | 'excedente' | 'deficit' | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showAddCargoModal, setShowAddCargoModal] = useState(false);

  // Gerar lista de unidades
  const units = useMemo(() => {
    const unique = ['todas', ...Array.from(new Set(tlpData.map(d => d.unidade))).sort()];
    return unique;
  }, [tlpData]);

  // Gerar lista de centros de custo filtrados pela unidade selecionada
  const costCenters = useMemo(() => {
    let filtered = tlpData;
    if (selectedUnit !== 'todas') {
      filtered = filtered.filter(d => d.unidade === selectedUnit);
    }
    return ['todos', ...Array.from(new Set(filtered.map(d => d.centro_custo))).sort()];
  }, [tlpData, selectedUnit]);

  // Gerar lista de cargos filtrados pela unidade e centro de custo selecionado
  const roles = useMemo(() => {
    let filtered = tlpData;
    if (selectedUnit !== 'todas') {
      filtered = filtered.filter(d => d.unidade === selectedUnit);
    }
    if (selectedCostCenter !== 'todos') {
      filtered = filtered.filter(d => d.centro_custo === selectedCostCenter);
    }
    return ['todos', ...Array.from(new Set(filtered.map(d => d.cargo))).sort()];
  }, [tlpData, selectedUnit, selectedCostCenter]);

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

  const handleUnitChange = (unit: string) => {
    setSelectedUnit(unit);
    setSelectedCostCenter('todos');
    setSelectedRole('todos');
  };

  const handleCostCenterChange = (center: string) => {
    setSelectedCostCenter(center);
    setSelectedRole('todos');
  };

  const handleStatusClick = (status: 'completo' | 'excedente' | 'deficit') => {
    if (selectedStatus === status) {
      setSelectedStatus(null);
    } else {
      setSelectedStatus(status);
    }
  };

  const handleCargoAdded = () => {
    // Reload page to fetch new TLP data
    window.location.reload();
  };

  const sortedData = useMemo(() => {
    let data = tlpData.filter(item => {
      // Filter by archive status
      if (showArchived) {
        if (!item.arquivado) return false;
      } else {
        if (item.arquivado) return false;
      }

      if (selectedUnit !== 'todas' && item.unidade !== selectedUnit) return false;
      if (selectedCostCenter !== 'todos' && item.centro_custo !== selectedCostCenter) return false;
      if (selectedRole !== 'todos' && item.cargo !== selectedRole) return false;
      if (selectedStatus !== null && item.status !== selectedStatus) return false;
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
  }, [tlpData, selectedUnit, selectedCostCenter, selectedRole, selectedStatus, sortConfig, showArchived]);

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

  // Contar cargos por status
  const cargosPorStatus = {
    completo: sortedData.filter(item => item.status === 'completo').length,
    excedente: sortedData.filter(item => item.status === 'excedente').length,
    deficit: sortedData.filter(item => item.status === 'deficit').length,
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {showArchived ? 'ITENS ARQUIVADOS - TLP' : 'TLP vs Funcionários Ativos'}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Comparação entre quadro necessário e quadro real</p>

        {showArchived && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
            <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Você está visualizando os itens <strong>arquivados</strong>. Estes itens não aparecem na listagem principal e não contam para os cálculos de déficit/superávit geral.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        {/* Botão Adicionar Cargo */}
        <button
          onClick={() => setShowAddCargoModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cargo
        </button>

        {/* Botão Ver Arquivados */}
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${showArchived
            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
            }`}
        >
          {showArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
          {showArchived ? 'Voltar para Ativos' : 'Ver Arquivados'}
        </button>
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
            onChange={(e) => handleUnitChange(e.target.value)}
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
            onChange={(e) => handleCostCenterChange(e.target.value)}
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

      {/* Status Cards */}
      <div className="space-y-4">
        {selectedStatus && (
          <button
            onClick={() => setSelectedStatus(null)}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            ✕ Limpar Filtro de Status
          </button>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => handleStatusClick('completo')}
            className={`text-left rounded-lg border p-6 transition-all cursor-pointer ${selectedStatus === 'completo'
              ? 'bg-green-100 dark:bg-green-900/40 border-green-500 dark:border-green-500 shadow-lg'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:shadow-md'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${selectedStatus === 'completo' ? 'font-bold text-green-700 dark:text-green-300' : 'text-green-700 dark:text-green-400'}`}>
                  Cargos Completos
                </p>
                <p className="text-3xl font-semibold text-green-900 dark:text-green-300">{cargosPorStatus.completo}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Quadro em dia</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatusClick('excedente')}
            className={`text-left rounded-lg border p-6 transition-all cursor-pointer ${selectedStatus === 'excedente'
              ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-500 dark:border-amber-500 shadow-lg'
              : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:shadow-md'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${selectedStatus === 'excedente' ? 'font-bold text-amber-700 dark:text-amber-300' : 'text-amber-700 dark:text-amber-400'}`}>
                  Cargos Excedentes
                </p>
                <p className="text-3xl font-semibold text-amber-900 dark:text-amber-300">{cargosPorStatus.excedente}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Acima do necessário</p>
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h.01a1 1 0 110 2H12zm-1.5 5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3 .75a.75.75 0 100-1.5.75.75 0 000 1.5zM8 12a1 1 0 110-2 1 1 0 010 2zm6 3a1 1 0 100-2 1 1 0 000 2zm-2.5-3a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleStatusClick('deficit')}
            className={`text-left rounded-lg border p-6 transition-all cursor-pointer ${selectedStatus === 'deficit'
              ? 'bg-red-100 dark:bg-red-900/40 border-red-500 dark:border-red-500 shadow-lg'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:shadow-md'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm mb-1 ${selectedStatus === 'deficit' ? 'font-bold text-red-700 dark:text-red-300' : 'text-red-700 dark:text-red-400'}`}>
                  Cargos com Déficit
                </p>
                <p className="text-3xl font-semibold text-red-900 dark:text-red-300">{cargosPorStatus.deficit}</p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">Abaixo do necessário</p>
              </div>
              <div className="bg-red-100 dark:bg-red-900/40 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </button>
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
                {renderHeader('CH Semanal', 'carga_horaria_semanal', 'center')}
                {renderHeader('TLP', 'tlp', 'center')}
                {renderHeader('Ativos', 'ativos', 'center')}
                {renderHeader('Afastados', 'afastados', 'center')}
                {renderHeader('Saldo', 'saldo', 'center')}
                {renderHeader('Status', 'status', 'left')}
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Obs.</th>
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
                    <td className="px-6 py-4 text-sm text-center text-slate-700 dark:text-slate-300">
                      {item.carga_horaria_semanal ? `${String(item.carga_horaria_semanal).replace('.', ',')}h` : '-'}
                    </td>
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
                    <td className="px-6 py-4 text-sm text-center font-medium text-green-700 dark:text-green-400 relative group cursor-help">
                      {item.ativos}
                      {item.ativos > 0 && item.funcionarios && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max max-w-xs p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 text-left pointer-events-none">
                          <div className="font-bold mb-1 border-b border-slate-600 pb-1">Ativos:</div>
                          <ul className="list-disc list-inside">
                            {item.funcionarios
                              .filter(f => f.situacao && f.situacao.toUpperCase().includes('ATIVO'))
                              .map((f, i) => (
                                <li key={i} className="truncate">{f.nome}</li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-center font-medium text-amber-700 dark:text-amber-400 relative group cursor-help">
                      {item.afastados}
                      {item.afastados > 0 && item.funcionarios && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-max max-w-xs p-2 bg-slate-800 text-white text-xs rounded shadow-lg z-50 text-left pointer-events-none">
                          <div className="font-bold mb-1 border-b border-slate-600 pb-1">Afastados:</div>
                          <ul className="list-disc list-inside">
                            {item.funcionarios
                              .filter(f => !f.situacao || !f.situacao.toUpperCase().includes('ATIVO'))
                              .map((f, i) => (
                                <li key={i} className="truncate">
                                  {f.nome} <span className="opacity-70 text-[10px]">({f.situacao || 'S/Info'})</span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </td>
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
                      {item.anotacoes && (
                        <div className="flex justify-center group relative">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover:block w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 whitespace-pre-wrap text-left pointer-events-none">
                            {item.anotacoes}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
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
                        {showArchived ? (
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja desarquivar esta linha?')) {
                                unarchiveTlp(item);
                              }
                            }}
                            title="Desarquivar linha"
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          >
                            <ArchiveRestore className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm('Tem certeza que deseja arquivar esta linha?')) {
                                archiveTlp(item);
                              }
                            }}
                            title="Arquivar linha"
                            className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>,
                  expandedRow === index && item.funcionarios ? (
                    <tr key={`${rowKey}-expanded`}>
                      <td colSpan={11} className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
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
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                          <span>Admissão: {func.dataAdmissao}</span>
                                          {func.carga_horaria_semanal && (
                                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                              {String(func.carga_horaria_semanal).replace('.', ',')}h
                                            </span>
                                          )}
                                        </div>
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
                                        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                          <span>Admissão: {func.dataAdmissao}</span>
                                          {func.carga_horaria_semanal && (
                                            <span className="font-medium text-slate-600 dark:text-slate-300">
                                              {String(func.carga_horaria_semanal).replace('.', ',')}h
                                            </span>
                                          )}
                                        </div>
                                        <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 w-fit">
                                          {func.situacao || 'Situação Desconhecida'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Notes Section */}
                          {item.anotacoes && (
                            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Anotações
                              </h4>
                              <p className="text-sm text-yellow-700 dark:text-yellow-300 whitespace-pre-wrap">{item.anotacoes}</p>
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
      </div>

      {/* Modal Adicionar Cargo */}
      <AddCargoTlpModal
        open={showAddCargoModal}
        onOpenChange={setShowAddCargoModal}
        onSuccess={handleCargoAdded}
      />
    </div>
  );
}