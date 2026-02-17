import React from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, Calendar, Users } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { StatusBadge } from './StatusBadge';
import { Requisition } from '@/app/hooks/useRequisitions';
import { useTlpSearch } from '@/app/hooks/useTlpSearch';

interface RequisitionCardProps {
  requisition: Requisition;
  expandedId: number | null;
  setExpandedId: (id: number | null) => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
}

export function RequisitionCard({
  requisition,
  expandedId,
  setExpandedId,
  onApprove,
  onReject,
}: RequisitionCardProps) {
  const isExpanded = expandedId === requisition.id_solicitacao;

  // Buscar dados de TLP quando expandido
  const { data: tlpInfo, loading: tlpLoading, error: tlpError } = useTlpSearch(
    requisition.cargo,
    requisition.unidade || requisition.lotacao || ''
  );

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <Card className="mb-3 overflow-hidden border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
      {/* Header clicável */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between"
        onClick={() => setExpandedId(isExpanded ? null : requisition.id_solicitacao)}
      >
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <FileText size={18} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                {requisition.cargo}
              </h3>
              <Badge variant="outline" className="text-[10px] h-5 uppercase">
                QTD: {requisition.quantidade || 0}
              </Badge>
              <Badge variant="secondary" className="text-[10px] h-5">
                {requisition.tipo || requisition.tipo_requisicao || '-'}
              </Badge>
              <StatusBadge status={requisition.status} />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {requisition.solicitante || requisition.unidade}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <Calendar size={12} />
              {formatDate(requisition.data_solicitacao)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <CardContent className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-6">
          {/* SEÇÃO: TLP INFO */}
          {tlpLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="animate-pulse text-sm text-blue-700 dark:text-blue-400">
                Carregando dados de TLP...
              </div>
            </div>
          )}

          {tlpError && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                ⚠️ Não foi possível carregar dados de TLP para este cargo/unidade
              </p>
            </div>
          )}

          {tlpInfo && !tlpLoading && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-xs font-bold uppercase text-blue-700 dark:text-blue-400 mb-4 flex items-center gap-2">
                <Users size={14} /> Situação do Quadro (TLP)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* TLP Previsto */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {tlpInfo.tlp_quantidade}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium mt-1">
                    TLP Previsto
                  </div>
                </div>

                {/* Ativos */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {tlpInfo.ativos}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium mt-1">
                    Ativos
                  </div>
                </div>

                {/* Afastados */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {tlpInfo.afastados}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium mt-1">
                    Afastados
                  </div>
                </div>

                {/* Quantidade Necessária */}
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    Math.abs(tlpInfo.tlp_quantidade - tlpInfo.ativos) > 0
                      ? tlpInfo.ativos < tlpInfo.tlp_quantidade
                        ? 'text-red-600 dark:text-red-400'   // Déficit
                        : 'text-green-600 dark:text-green-400'  // Excedente
                      : 'text-slate-600 dark:text-slate-400'  // Completo
                  }`}>
                    {Math.abs(tlpInfo.tlp_quantidade - tlpInfo.ativos)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 uppercase font-medium mt-1">
                    Necessário
                  </div>
                </div>
              </div>

              {/* Indicador visual de status */}
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">
                    Status do quadro:
                  </span>
                  <span className={`font-bold ${
                    tlpInfo.saldo < 0
                      ? 'text-red-600 dark:text-red-400'
                      : tlpInfo.saldo > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {tlpInfo.saldo < 0
                      ? `Déficit de ${Math.abs(tlpInfo.saldo)} funcionário(s)`
                      : tlpInfo.saldo > 0
                        ? `Excedente de ${tlpInfo.saldo} funcionário(s)`
                        : 'Quadro completo'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Coluna 1 - Detalhes da Requisição */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                <FileText size={14} /> Detalhes da Requisição
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Tipo
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {requisition.tipo || requisition.tipo_requisicao || '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Data
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {formatDate(requisition.data_solicitacao)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Cargo
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {requisition.cargo}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Quantidade
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {requisition.quantidade || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Unidade
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {requisition.solicitante || requisition.unidade}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg col-span-2">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">
                    Status
                  </span>
                  <StatusBadge status={requisition.status} />
                </div>
              </div>
            </div>

            {/* Coluna 2 - Justificativa e Ações */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                <FileText size={14} /> Justificativa e Ações
              </h4>
              <div>
                <label className="text-sm font-medium mb-2 block text-slate-600 dark:text-slate-400">
                  Justificativa
                </label>
                <div className="w-full p-3 text-sm border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-200 min-h-[120px]">
                  {requisition.justificativa || '-'}
                </div>
              </div>

              {requisition.status === 'pendente' && (
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onApprove(requisition.id);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(requisition.id);
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
