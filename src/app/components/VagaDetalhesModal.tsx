import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Search } from 'lucide-react';
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

interface SugestaoFuncionario {
  id: number;
  nome: string;
  cargo: string;
}

function getStatusBadge(diasEmAberto: number) {
  if (diasEmAberto >= 45) {
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
  const [mostrarFormularioSubstituto, setMostrarFormularioSubstituto] = useState(false);
  const [searchSubstituto, setSearchSubstituto] = useState('');
  const [sugestoesSubstituto, setSugestoesSubstituto] = useState<SugestaoFuncionario[]>([]);
  const [substitutoSelecionado, setSubstitutoSelecionado] = useState<SugestaoFuncionario | null>(null);
  const [salvandoSubstituto, setSalvandoSubstituto] = useState(false);

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
        console.log('[DEBUG] Resposta completa para ID', vaga.id_evento, ':', respostaData);

        if (respostaData) {
          // Tentar diferentes estratégias para encontrar o substituto

          // Estratégia 1: Buscar por id_substituto
          if (respostaData?.id_substituto) {
            console.log('Estratégia 1: Buscando substituto com ID:', respostaData.id_substituto);
            const { data: subData, error: subError } = await supabase
              .from('oris_funcionarios')
              .select('id, nome, cargo, dt_admissao, centro_custo')
              .eq('id', respostaData.id_substituto);

            if (subError) {
              console.error('Erro ao buscar por ID:', subError);
            } else if (subData && subData.length > 0) {
              console.log('Substituto encontrado por ID:', subData[0]);
              substitutoData = subData[0];
            } else {
              console.warn('Nenhum substituto encontrado com ID:', respostaData.id_substituto);
            }
          }

          // Estratégia 2: Buscar por nome_candidato se não encontrou por ID
          if (!substitutoData && respostaData?.nome_candidato) {
            console.log('Estratégia 2: Buscando substituto por nome:', respostaData.nome_candidato);
            const { data: subData, error: subError } = await supabase
              .from('oris_funcionarios')
              .select('id, nome, cargo, dt_admissao, centro_custo')
              .ilike('nome', `%${respostaData.nome_candidato}%`)
              .limit(1);

            if (subError) {
              console.error('Erro ao buscar por nome:', subError);
            } else if (subData && subData.length > 0) {
              console.log('Substituto encontrado por nome:', subData[0]);
              substitutoData = subData[0];
            } else {
              console.warn('Nenhum substituto encontrado com nome:', respostaData.nome_candidato);
            }
          }

          // Debug: mostrar todos os campos da resposta
          if (!substitutoData) {
            console.log('[DEBUG] Campos em respostaData para evento', vaga.id_evento, ':', Object.keys(respostaData));
            console.log('[DEBUG] Valores completos:', {
              id_substituto: respostaData.id_substituto,
              nome_candidato: respostaData.nome_candidato,
              vaga_preenchida: respostaData.vaga_preenchida,
            });
          } else {
            console.log('[SUCCESS] Substituto carregado para evento', vaga.id_evento, ':', substitutoData.nome);
          }
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

  // Buscar sugestões de funcionários para substituto
  useEffect(() => {
    const buscarSugestoes = async () => {
      if (searchSubstituto.trim().length < 2) {
        setSugestoesSubstituto([]);
        return;
      }

      try {
        const { data } = await supabase
          .from('oris_funcionarios')
          .select('id, nome, cargo')
          .ilike('nome', `%${searchSubstituto}%`)
          .limit(10);

        setSugestoesSubstituto(data || []);
      } catch (err) {
        console.error('Erro ao buscar sugestões:', err);
      }
    };

    const timer = setTimeout(buscarSugestoes, 300);
    return () => clearTimeout(timer);
  }, [searchSubstituto]);

  // Calcular dias reais: se a vaga foi fechada, contar até a data de fechamento; senão, usar dias_em_aberto
  const calcularDiasReais = (): number => {
    if (detalhes.resposta?.data_fechamento_vaga && detalhes.resposta?.data_abertura_vaga) {
      const abertura = new Date(detalhes.resposta.data_abertura_vaga);
      const fechamento = new Date(detalhes.resposta.data_fechamento_vaga);
      return Math.floor((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
    }
    return vaga.dias_em_aberto;
  };

  const diasReais = calcularDiasReais();
  const statusBadge = getStatusBadge(diasReais);

  const salvarSubstituto = async () => {
    if (!substitutoSelecionado) return;

    setSalvandoSubstituto(true);
    try {
      // Buscar dados completos do substituto
      const { data: funcionario } = await supabase
        .from('oris_funcionarios')
        .select('id, nome, cargo, dt_admissao, centro_custo')
        .eq('id', substitutoSelecionado.id)
        .single();

      if (!funcionario) throw new Error('Funcionário não encontrado');

      // Atualizar a resposta com o substituto
      const { error } = await supabase
        .from('respostas_gestor')
        .update({
          id_substituto: substitutoSelecionado.id,
          nome_candidato: substitutoSelecionado.nome,
          vaga_preenchida: 'SIM',
        })
        .eq('id_evento', vaga.id_evento);

      if (error) throw error;

      // Atualizar o estado local
      setDetalhes(prev => ({
        ...prev,
        funcionarioAtual: funcionario,
        resposta: {
          ...prev.resposta,
          id_substituto: substitutoSelecionado.id,
          nome_candidato: substitutoSelecionado.nome,
          vaga_preenchida: 'SIM',
        },
      }));

      setMostrarFormularioSubstituto(false);
      setSearchSubstituto('');
      setSubstitutoSelecionado(null);
    } catch (err) {
      console.error('Erro ao salvar substituto:', err);
      alert('Erro ao salvar substituto: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setSalvandoSubstituto(false);
    }
  };

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
                      {detalhes.funcionarioAtual.centro_custo && (
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Centro de Custo</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.centro_custo}</p>
                        </div>
                      )}
                      {detalhes.funcionarioAtual.dt_admissao && (
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Data de Admissão</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100 break-all">{formatarData(detalhes.funcionarioAtual.dt_admissao)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : detalhes.resposta?.vaga_preenchida === 'SIM' ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase mb-3">
                      ⚠️ Preenchida Sem Registro
                    </h3>
                    <p className="text-sm text-amber-800 dark:text-amber-300 mb-3">A vaga foi marcada como preenchida, mas os dados do substituto não foram registrados no sistema.</p>
                    <button
                      onClick={() => setMostrarFormularioSubstituto(true)}
                      className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors"
                    >
                      Registrar Substituto
                    </button>
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
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{diasReais} dias</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Data do Evento</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatarData(vaga.data_evento)}</p>
                </div>
              </div>

              {/* Timeline de Abertura e Fechamento */}
              {detalhes.resposta && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">📅 Timeline da Vaga</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {detalhes.resposta.data_abertura_vaga && (
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Abertura</p>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{formatarData(detalhes.resposta.data_abertura_vaga)}</p>
                      </div>
                    )}
                    {detalhes.resposta.data_fechamento_vaga && (
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Fechamento</p>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{formatarData(detalhes.resposta.data_fechamento_vaga)}</p>
                      </div>
                    )}
                    {detalhes.resposta.data_abertura_vaga && detalhes.resposta.data_fechamento_vaga && (
                      <div>
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Dias Aberta</p>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                          {Math.floor(
                            (new Date(detalhes.resposta.data_fechamento_vaga).getTime() -
                              new Date(detalhes.resposta.data_abertura_vaga).getTime()) /
                            (1000 * 60 * 60 * 24)
                          )}{' '}
                          dias
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                              {typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)
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

      {/* Modal Registrar Substituto */}
      {mostrarFormularioSubstituto && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Buscar e Registrar Substituto
              </h3>
              <button
                onClick={() => {
                  setMostrarFormularioSubstituto(false);
                  setSearchSubstituto('');
                  setSugestoesSubstituto([]);
                  setSubstitutoSelecionado(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Buscar Funcionário
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Digite o nome do funcionário..."
                  value={searchSubstituto}
                  onChange={(e) => setSearchSubstituto(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Sugestões */}
            {sugestoesSubstituto.length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                {sugestoesSubstituto.map(func => (
                  <button
                    key={func.id}
                    onClick={() => setSubstitutoSelecionado(func)}
                    className={`w-full text-left p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${
                      substitutoSelecionado?.id === func.id
                        ? 'bg-blue-100 dark:bg-blue-900/40'
                        : ''
                    }`}
                  >
                    <p className="font-medium text-slate-900 dark:text-slate-100">{func.nome}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{func.cargo}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Substituto Selecionado */}
            {substitutoSelecionado && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ Selecionado:
                </p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {substitutoSelecionado.nome}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {substitutoSelecionado.cargo}
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMostrarFormularioSubstituto(false);
                  setSearchSubstituto('');
                  setSugestoesSubstituto([]);
                  setSubstitutoSelecionado(null);
                }}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarSubstituto}
                disabled={!substitutoSelecionado || salvandoSubstituto}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {salvandoSubstituto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Registrar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
