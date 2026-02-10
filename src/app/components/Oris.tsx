import { useState, useEffect, useMemo } from 'react';
import { Download, Search, Settings, X, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, Filter, ChevronDown } from 'lucide-react';
import { useOrisFuncionarios, useOrisFantasias } from '../hooks/useOrisFuncionarios';
import { getVisibleColumnFields, getColumnLabels, getOrderedColumns } from '@/lib/columns.config';
import { getFormattedValue } from '@/lib/column-formatters';
import { FuncionarioProfile } from './FuncionarioProfile';

const COLUMNS_STORAGE_KEY = 'oris_columns_order';
const VISIBLE_COLUMNS_STORAGE_KEY = 'oris_visible_columns';

export function Oris() {
  const [searchNome, setSearchNome] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'demitidos'>('todos');
  const [selectedFantasias, setSelectedFantasias] = useState<Set<string>>(new Set());

  // Passar filtros para o hook
  const { data, columns: initialColumns, loading, error, totalCount } = useOrisFuncionarios({
    searchNome,
    searchTerm,
    statusFilter,
    fantasias: Array.from(selectedFantasias)
  });

  const [columns, setColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set());
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFantasiaFilter, setShowFantasiaFilter] = useState(false);
  const [selectedFuncionario, setSelectedFuncionario] = useState<any | null>(null);

  // Obter colunas configuradas (memoizado para evitar infinite loop)
  const configuredFields = useMemo(() => getVisibleColumnFields(), []);

  // Obter lista única de fantasias usando o novo hook
  const uniqueFantasias = useOrisFantasias();

  // Carregar preferências do localStorage e configuração de colunas
  useEffect(() => {
    if (initialColumns.length === 0) return;

    // Filtrar colunas iniciais para apenas as configuradas
    const filteredColumns = initialColumns.filter(col => configuredFields.includes(col));

    const savedOrder = localStorage.getItem(COLUMNS_STORAGE_KEY);
    const savedVisible = localStorage.getItem(VISIBLE_COLUMNS_STORAGE_KEY);

    if (savedOrder) {
      const order = JSON.parse(savedOrder);
      // Manter apenas as colunas que estão em configuredFields
      const validOrder = order.filter((col: string) => configuredFields.includes(col));
      // Se há ordem salva válida, usar. Senão, usar filtrada.
      const colsToSet = validOrder.length > 0 ? validOrder : filteredColumns;
      setColumns(colsToSet);
    } else {
      setColumns(filteredColumns);
    }

    if (savedVisible) {
      const savedVisibleArray = JSON.parse(savedVisible);
      // Filtrar visíveis para apenas colunas configuradas
      const validVisible = savedVisibleArray.filter((col: string) => configuredFields.includes(col));
      setVisibleColumns(new Set(validVisible.length > 0 ? validVisible : filteredColumns));
    } else {
      // Por padrão, mostrar todas as colunas configuradas
      setVisibleColumns(new Set(filteredColumns));
    }
  }, [initialColumns, configuredFields]);

  // Os dados já vêm filtrados do servidor
  const filteredData = data;

  // Ordenar dados baseado em sortColumn e sortDirection
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Comparar valores
      let comparison = 0;
      if (aVal == null && bVal == null) {
        comparison = 0;
      } else if (aVal == null) {
        comparison = 1;
      } else if (bVal == null) {
        comparison = -1;
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        // String comparison
        comparison = String(aVal).localeCompare(String(bVal), 'pt-BR');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    })
    : filteredData;

  // Handle sort column click
  const handleSort = (col: string) => {
    if (sortColumn === col) {
      // Se já estava ordenado, inverter direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é outra coluna, ordenar por ela (asc)
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Toggle fantasia selecionada
  const toggleFantasia = (fantasia: string) => {
    const newFantasias = new Set(selectedFantasias);
    if (newFantasias.has(fantasia)) {
      newFantasias.delete(fantasia);
    } else {
      newFantasias.add(fantasia);
    }
    setSelectedFantasias(newFantasias);
  };

  // Toggle visibilidade de coluna
  const toggleColumn = (col: string) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(col)) {
      newVisible.delete(col);
    } else {
      newVisible.add(col);
    }
    setVisibleColumns(newVisible);
    localStorage.setItem(VISIBLE_COLUMNS_STORAGE_KEY, JSON.stringify(Array.from(newVisible)));
  };

  // Drag and drop para reordenar colunas
  const handleDragStart = (col: string) => {
    setDraggedColumn(col);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetCol: string) => {
    if (!draggedColumn || draggedColumn === targetCol) return;

    const newColumns = [...columns];
    const draggedIndex = newColumns.indexOf(draggedColumn);
    const targetIndex = newColumns.indexOf(targetCol);

    // Reordenar
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);

    setColumns(newColumns);
    localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(newColumns));
    setDraggedColumn(null);
  };

  // Colunas a exibir
  const displayColumns = columns.filter(col => visibleColumns.has(col));

  const handleExportCSV = () => {
    if (data.length === 0) {
      alert('Nenhum dado para exportar');
      return;
    }

    // Obter labels das colunas configuradas
    const columnLabels = getColumnLabels();

    // Criar CSV com headers em português
    const headers = columns.map(col => columnLabels[col] || col).join(',');
    const rows = sortedData.map((row) =>
      columns.map((col) => {
        const formattedValue = getFormattedValue(col, row[col]);
        // Escapar aspas e envolver em aspas se contiver vírgula
        if (formattedValue.includes(',') || formattedValue.includes('"')) {
          return `"${formattedValue.replace(/"/g, '""')}"`;
        }
        return formattedValue;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `oris_funcionarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Oris - Funcionários
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {loading ? 'Carregando...' : `Total: ${totalCount} registros`}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </button>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        {/* Busca por Nome */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do funcionário..."
            value={searchNome}
            onChange={(e) => setSearchNome(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtro Status */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'todos'
                ? 'bg-blue-600 dark:bg-blue-700 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('ativos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'ativos'
                ? 'bg-green-600 dark:bg-green-700 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
          >
            ✅ Ativos
          </button>
          <button
            onClick={() => setStatusFilter('demitidos')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'demitidos'
                ? 'bg-red-600 dark:bg-red-700 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
          >
            ❌ Demitidos
          </button>
        </div>

        {/* Filtro Fantasias */}
        <div className="space-y-2">
          <button
            onClick={() => setShowFantasiaFilter(!showFantasiaFilter)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtrar por Contrato
            {selectedFantasias.size > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                {selectedFantasias.size}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFantasiaFilter ? 'rotate-180' : ''}`} />
          </button>

          {showFantasiaFilter && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap gap-2">
                {uniqueFantasias.map((fantasia) => (
                  <button
                    key={fantasia}
                    onClick={() => toggleFantasia(fantasia)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedFantasias.has(fantasia)
                        ? 'bg-blue-600 dark:bg-blue-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-500'
                      }`}
                  >
                    {fantasia}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedFantasias(new Set(uniqueFantasias))}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Selecionar Todos
                </button>
                <button
                  onClick={() => setSelectedFantasias(new Set())}
                  className="text-xs px-2 py-1 bg-slate-400 dark:bg-slate-600 text-white rounded hover:bg-slate-500 dark:hover:bg-slate-700 transition-colors"
                >
                  Limpar Filtro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Busca Geral */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar em todos os campos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Column Selector Button */}
        <button
          onClick={() => setShowColumnModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Colunas ({visibleColumns.size}/{columns.length})
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">Erro: {error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-96">
        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-slate-600 dark:text-slate-400">Carregando dados...</span>
          </div>
        ) : sortedData.length > 0 ? (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                <tr>
                  {displayColumns.map((col) => {
                    const label = getColumnLabels()[col] || col;
                    const isSorted = sortColumn === col;
                    return (
                      <th
                        key={col}
                        draggable
                        onDragStart={() => handleDragStart(col)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(col)}
                        onClick={() => handleSort(col)}
                        className={`px-4 py-3 text-left font-medium uppercase tracking-wider border border-slate-200 dark:border-slate-700 whitespace-nowrap select-none transition-colors ${isSorted
                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                          }`}
                        title="Clique para ordenar, arraste para reordenar"
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3 h-3 text-slate-400 dark:text-slate-600 flex-shrink-0" />
                          <span className="flex-1">{label}</span>
                          {isSorted && (
                            sortDirection === 'asc'
                              ? <ArrowUp className="w-4 h-4 flex-shrink-0" />
                              : <ArrowDown className="w-4 h-4 flex-shrink-0" />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800">
                {sortedData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    {displayColumns.map((col) => {
                      const cellValue = getFormattedValue(col, row[col]);
                      const isNomeColumn = col === 'nome';

                      return (
                        <td
                          key={`${rowIndex}-${col}`}
                          className="px-4 py-3 border-r border-slate-200 dark:border-slate-700 text-xs whitespace-nowrap"
                        >
                          {isNomeColumn ? (
                            <button
                              onClick={() => setSelectedFuncionario(row)}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                            >
                              {cellValue}
                            </button>
                          ) : (
                            <span className="text-slate-700 dark:text-slate-300">{cellValue}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 flex-1">
            <p className="text-slate-600 dark:text-slate-400">
              {searchNome || searchTerm || selectedFantasias.size > 0
                ? 'Nenhum resultado encontrado'
                : 'Nenhum dado disponível'}
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-slate-500 dark:text-slate-400">
        <p>Exibindo {sortedData.length} de {totalCount} registros</p>
        {statusFilter !== 'todos' && (
          <p className="mt-1">Status: {statusFilter === 'ativos' ? '✅ Apenas Ativos' : '❌ Apenas Demitidos'}</p>
        )}
        {searchNome && (
          <p className="mt-1">Busca por nome: {searchNome}</p>
        )}
        {selectedFantasias.size > 0 && (
          <p className="mt-1">Contratos selecionados: {selectedFantasias.size}</p>
        )}
        {searchTerm && (
          <p className="mt-1">Busca geral: {searchTerm}</p>
        )}
        {sortColumn && (
          <p className="mt-1">Ordenado por: {getColumnLabels()[sortColumn] || sortColumn} ({sortDirection === 'asc' ? '↑' : '↓'})</p>
        )}
      </div>

      {/* Column Selector Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Gerenciar Colunas
              </h2>
              <button
                onClick={() => setShowColumnModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {columns.map((col) => {
                  const label = getColumnLabels()[col] || col;
                  return (
                    <label key={col} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col)}
                        onChange={() => toggleColumn(col)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{label}</span>
                      <span className="text-xs text-slate-400">{col}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex gap-2">
              <button
                onClick={() => setVisibleColumns(new Set(columns))}
                className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Mostrar Todas
              </button>
              <button
                onClick={() => setVisibleColumns(new Set())}
                className="flex-1 px-3 py-2 text-sm font-medium bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 rounded-lg transition-colors"
              >
                Ocultar Todas
              </button>
              <button
                onClick={() => setShowColumnModal(false)}
                className="flex-1 px-3 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Funcionário Profile Modal */}
      {selectedFuncionario && (
        <FuncionarioProfile
          funcionario={selectedFuncionario}
          onClose={() => setSelectedFuncionario(null)}
        />
      )}
    </div>
  );
}
