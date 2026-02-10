import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatarData } from '@/lib/column-formatters';
import { VagaAtribuida } from '@/app/services/agendaAnalistasService';
import { Badge } from './ui/badge';

interface VagaDetalhesModalProps {
  vaga: VagaAtribuida & { nomeAnalista: string; cargoAnalista: string };
  onClose: () => void;
}

interface DetalhesCompletos {
  evento: any;
  resposta: any;
  funcionarioAtual: any;
  error: string | null;
  loading: boolean;
}

function getStatusBadge(diasEmAberto: number) {
  if (diasEmAberto > 30) {
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '🔴 Crítico', cor: 'vermelho' };
  } else if (diasEmAberto >= 15) {
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: '🟡 Atenção', cor: 'âmbar' };
  } else {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: '🟢 Normal', cor: 'verde' };
  }
}

export function VagaDetalhesModal({ vaga, onClose }: VagaDetalhesModalProps) {
  const [detalhes, setDetalhes] = useState<DetalhesCompletos>({
    evento: null,
    resposta: null,
    funcionarioAtual: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const carregarDetalhes = async () => {
      try {
        // Buscar evento completo
        const { data: eventoData, error: eventoError } = await supabase
          .from('eventos_gestao_vagas_public')
          .select('*')
          .eq('id_evento', vaga.id_evento)
          .single();

        if (eventoError) {
          console.warn('Erro ao buscar evento:', eventoError);
        }

        // Buscar resposta do gestor
        const { data: respostaData, error: respostaError } = await supabase
          .from('respostas_gestor')
          .select('*')
          .eq('id_evento', vaga.id_evento)
          .single();

        if (respostaError && respostaError.code !== 'PGRST116') {
          console.warn('Erro ao buscar resposta:', respostaError);
        }

        console.log('Resposta do gestor para evento', vaga.id_evento, ':', respostaData);

        // Buscar dados do substituto se houver
        let substitutoData = null;
        if (respostaData?.id_substituto) {
          console.log('Buscando substituto com ID:', respostaData.id_substituto);

          // Tentar buscar por ID na tabela oris_funcionarios
          const { data: subData, error: subError } = await supabase
            .from('oris_funcionarios')
            .select('id, nome, cargo, email')
            .eq('id', respostaData.id_substituto);

          if (subError) {
            console.warn('Erro ao buscar substituto em oris_funcionarios:', subError);
            console.log('ID do substituto que causou erro:', respostaData.id_substituto);
          } else if (subData && subData.length > 0) {
            console.log('Substituto encontrado:', subData[0]);
            substitutoData = subData[0];
          } else {
            console.warn('Nenhum funcionário encontrado com ID:', respostaData.id_substituto);
            // Tentar buscar em vagas_analista ou outros campos
            console.log('Verificando estrutura da resposta:', JSON.stringify(respostaData));
          }
        } else if (respostaData) {
          console.log('Nenhum id_substituto encontrado. Campos disponíveis:', Object.keys(respostaData));
          console.log('Dados completos da resposta:', JSON.stringify(respostaData));
        }

        setDetalhes({
          evento: eventoData,
          resposta: respostaData,
          funcionarioAtual: substitutoData,
          error: null,
          loading: false,
        });
      } catch (err) {
        console.error('Erro ao carregar detalhes:', err);
        setDetalhes(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
          loading: false,
        }));
      }
    };

    carregarDetalhes();
  }, [vaga.id_evento]);

  const statusBadge = getStatusBadge(vaga.dias_em_aberto);

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {vaga.nomeAnalista}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              ID do Evento: {vaga.id_evento}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {detalhes.loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
            </div>
          )}

          {detalhes.error && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300">{detalhes.error}</p>
            </div>
          )}

          {!detalhes.loading && (
            <>
              {/* Resumo Principal - Saiu vs Entrou */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Funcionário Saído */}
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase mb-3">
                    ❌ Saiu
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-red-600 dark:text-red-500 font-medium">Nome</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.nome_funcionario}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600 dark:text-red-500 font-medium">Cargo</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.cargo_vaga}</p>
                    </div>
                    <div>
                      <p className="text-xs text-red-600 dark:text-red-500 font-medium">Situação</p>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.situacao_origem}</p>
                    </div>
                  </div>
                </div>

                {/* Substituto */}
                {detalhes.funcionarioAtual ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase mb-3">
                      ✓ Entrou no Lugar
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-500 font-medium">Nome</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.nome}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-500 font-medium">Cargo</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.cargo}</p>
                      </div>
                      {detalhes.funcionarioAtual.email && (
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Email</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100 break-all">{detalhes.funcionarioAtual.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : detalhes.resposta?.vaga_preenchida === 'SIM' ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase mb-3">
                      ⚠️ Preenchida Sem Registro
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-300">A vaga foi marcada como preenchida, mas os dados do substituto não foram registrados no sistema.</p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg">
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-3">
                      ℹ️ Substituto
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum substituto atribuído ou vaga não preenchida</p>
                  </div>
                )}
              </div>

              {/* Status e Timing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Status</p>
                  <Badge className={`${statusBadge.bg} ${statusBadge.text} border-0`}>
                    {statusBadge.label}
                  </Badge>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{vaga.dias_em_aberto} dias</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Data do Evento</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatarData(vaga.data_evento)}</p>
                </div>
              </div>

              {/* Informações de Lotação e Contrato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Lotação</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vaga.lotacao}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">CNPJ</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vaga.cnpj}</p>
                </div>
              </div>

              {/* Data de Atribuição */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Atribuição ao Analista</p>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{formatarData(vaga.data_atribuicao)}</p>
              </div>

              {/* Status da Resposta */}
              {detalhes.resposta && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Status da Resposta do Gestor
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Abriu Vaga?</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {detalhes.resposta.abriu_vaga ? '✓ Sim' : detalhes.resposta.abriu_vaga === false ? '✗ Não' : '-'}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Vaga Preenchida?</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {detalhes.resposta.vaga_preenchida || '-'}
                      </p>
                    </div>
                    {detalhes.resposta.data_abertura_vaga && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Data de Abertura</p>
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {formatarData(detalhes.resposta.data_abertura_vaga)}
                        </p>
                      </div>
                    )}
                    {detalhes.resposta.pendente_efetivacao && (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">⚠️ Pendente Efetivação</p>
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Sim</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações do Evento Completo */}
              {detalhes.evento && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Informações Completas do Evento
                  </h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(detalhes.evento).map(([chave, valor]) => {
                        if (!valor || chave.startsWith('_')) return null;
                        return (
                          <div key={chave}>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                              {chave.replace(/_/g, ' ').toUpperCase()}
                            </p>
                            <p className="text-sm text-slate-900 dark:text-slate-100 break-words">
                              {typeof valor === 'string' && valor.includes('-') && valor.length === 10
                                ? formatarData(valor)
                                : String(valor)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
