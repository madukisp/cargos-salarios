import React from 'react';
import { Filter, Search } from 'lucide-react';
import { RequisitionCard } from './RequisitionCard';
import { useState, useCallback, useEffect } from 'react';
import { useRequisitions, useUpdateRequisitionStatus, Requisition } from '@/app/hooks/useRequisitions';

export function Requisitions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);

  const { data: initialData, loading, error } = useRequisitions();
  const { updateStatus } = useUpdateRequisitionStatus();

  useEffect(() => {
    if (initialData) {
      setRequisitions(initialData);
    }
  }, [initialData]);

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


  const handleApprove = useCallback(async (id: number) => {
    const success = await updateStatus(id, 'aprovado');
    if (success) {
      setRequisitions(prev =>
        prev.map(req => req.id === id ? { ...req, status: 'aprovado' } : req)
      );
      setExpandedId(null);
    }
  }, [updateStatus]);

  const handleReject = useCallback(async (id: number) => {
    const success = await updateStatus(id, 'rejeitado');
    if (success) {
      setRequisitions(prev =>
        prev.map(req => req.id === id ? { ...req, status: 'rejeitado' } : req)
      );
      setExpandedId(null);
    }
  }, [updateStatus]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Requisições de Quadro</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Análise e aprovação de solicitações de aumento e alteração de quadro</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Carregando requisições...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && requisitions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Requisições de Quadro</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Análise e aprovação de solicitações de aumento e alteração de quadro</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <p className="text-red-700 dark:text-red-400">Erro ao carregar requisições: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Requisições de Quadro</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Análise e aprovação de solicitações de aumento e alteração de quadro</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
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

      <div className="space-y-3">
        {filteredRequisitions.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-600 dark:text-slate-400">
              Nenhuma requisição encontrada com os filtros selecionados.
            </p>
          </div>
        ) : (
          filteredRequisitions.map((req) => (
            <RequisitionCard
              key={req.id_solicitacao}
              requisition={req}
              expandedId={expandedId}
              setExpandedId={setExpandedId}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))
        )}
      </div>

    </div>
  );
}
