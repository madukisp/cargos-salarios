import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, SkipForward, AlertCircle as AlertIcon, Copy, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import {
  buscarVinculacoesPendentes,
  vincularSubstituto,
  obterEstatisticas,
  buscarVagasDuplicadas,
  deletarRespostaGestor,
  ValidacaoItem,
  GrupoDuplicadas,
} from '@/app/services/substitutoVinculationService';

export const SubstitutoVinculationTool: React.FC = () => {
  const [validacoes, setValidacoes] = useState<ValidacaoItem[]>([]);
  const [duplicadas, setDuplicadas] = useState<GrupoDuplicadas[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);
  const [deletando, setDeletando] = useState<number | null>(null);
  const [confirmandoDelete, setConfirmandoDelete] = useState<number | null>(null);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    vinculados: 0,
    pendentes: 0,
    porcentagemConcluida: 0,
  });
  const [filtro, setFiltro] = useState<'todos' | 'com_candidato' | 'preenchidas' | 'duplicadas'>('todos');
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);
  const [erroLoading, setErroLoading] = useState<string | null>(null);

  // Carregar dados iniciais
  useEffect(() => {
    const carregar = async () => {
      try {
        setLoading(true);
        setErroLoading(null);
        const [validacoesData, statsData, duplicadasData] = await Promise.all([
          buscarVinculacoesPendentes(),
          obterEstatisticas(),
          buscarVagasDuplicadas(),
        ]);
        setValidacoes(validacoesData);
        setStats(statsData);
        setDuplicadas(duplicadasData);
      } catch (error) {
        console.error('Erro ao carregar:', error);
        setErroLoading(`Erro ao carregar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, []);

  // Validações filtradas
  const validacoesFiltradas = validacoes.filter(v => {
    if (filtro === 'duplicadas') return false; // seção própria
    if (filtro === 'todos') return true;
    if (filtro === 'com_candidato') return v.tipo === 'com_candidato';
    if (filtro === 'preenchidas') return v.tipo === 'preenchidas';
    return true;
  });

  // Vincular e remover da lista
  const handleVincular = async (idResposta: number, idSubstituto: number, nomeSubstituto: string) => {
    try {
      setSalvando(idResposta);
      await vincularSubstituto(idResposta, idSubstituto);

      // Remover da lista
      setValidacoes(prev => prev.filter(v => v.pendente.id_resposta !== idResposta));

      // Atualizar stats
      const novasStats = await obterEstatisticas();
      setStats(novasStats);

      // Colapsar o item
      setExpandidos(prev => {
        const novo = new Set(prev);
        novo.delete(idResposta);
        return novo;
      });

      // Mostrar feedback
      setFeedback({ tipo: 'sucesso', msg: `✓ Vinculado a ${nomeSubstituto}` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      console.error('Erro ao vincular:', error);
      setFeedback({ tipo: 'erro', msg: `Erro ao vincular: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSalvando(null);
    }
  };

  // Deletar resposta duplicada
  const handleDeletar = async (idResposta: number) => {
    try {
      setDeletando(idResposta);
      await deletarRespostaGestor(idResposta);

      // Remover a resposta do grupo e remover grupo se ficou com <= 1
      setDuplicadas(prev =>
        prev
          .map(g => ({ ...g, respostas: g.respostas.filter(r => r.id_resposta !== idResposta) }))
          .filter(g => g.respostas.length > 1)
      );

      setConfirmandoDelete(null);
      setFeedback({ tipo: 'sucesso', msg: `✓ Resposta #${idResposta} deletada com sucesso` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ tipo: 'erro', msg: `Erro ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}` });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setDeletando(null);
    }
  };

  // Toggle expandir/colapsar
  const toggleExpandir = (idResposta: number) => {
    setExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(idResposta)) {
        novo.delete(idResposta);
      } else {
        novo.add(idResposta);
      }
      return novo;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Carregando validações pendentes...</span>
      </div>
    );
  }

  if (erroLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex items-start gap-4">
          <AlertIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="font-semibold text-red-800 dark:text-red-300">Erro ao Carregar</h2>
            <p className="text-red-700 dark:text-red-400 mt-2">{erroLoading}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`fixed top-6 right-6 rounded-lg px-6 py-4 shadow-lg flex items-center gap-3 z-50 ${
            feedback.tipo === 'sucesso'
              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800'
              : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800'
          }`}
        >
          {feedback.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          )}
          <span
            className={
              feedback.tipo === 'sucesso'
                ? 'text-green-800 dark:text-green-300'
                : 'text-red-800 dark:text-red-300'
            }
          >
            {feedback.msg}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">🔗 Ferramenta de Vinculação de Substitutos</h1>

        {/* Barra de Progresso */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-lg">Progresso da Vinculação</h3>
            <span className="text-sm font-mono bg-white dark:bg-slate-800 px-3 py-1 rounded">
              {stats.vinculados} / {stats.total}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-400 to-green-600 h-3 transition-all duration-300"
              style={{ width: `${stats.porcentagemConcluida}%` }}
            />
          </div>

          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            <p>✓ Vinculados: <strong>{stats.vinculados}</strong> | ⏳ Pendentes: <strong>{stats.pendentes}</strong></p>
            <p className="mt-1">{stats.porcentagemConcluida.toFixed(1)}% completo</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filtro === 'todos'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            📊 Todos ({validacoes.length})
          </button>

          <button
            onClick={() => setFiltro('com_candidato')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filtro === 'com_candidato'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            👤 Com Candidato ({validacoes.filter(v => v.tipo === 'com_candidato').length})
          </button>

          <button
            onClick={() => setFiltro('preenchidas')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filtro === 'preenchidas'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            ✓ Vagas Preenchidas ({validacoes.filter(v => v.tipo === 'preenchidas').length})
          </button>

          <button
            onClick={() => setFiltro('duplicadas')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              filtro === 'duplicadas'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            Vagas Duplicadas ({duplicadas.length})
            {duplicadas.length > 0 && filtro !== 'duplicadas' && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">!</span>
            )}
          </button>
        </div>
      </div>

      {/* ─── Seção: Vagas Duplicadas ─── */}
      {filtro === 'duplicadas' && (
        <div className="space-y-4">
          {duplicadas.length === 0 ? (
            <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-semibold">Nenhuma vaga duplicada encontrada!</p>
            </div>
          ) : (
            <>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-800 dark:text-red-300">
                <strong>{duplicadas.length} evento(s)</strong> com múltiplas respostas encontrados.
                O registro com maior completude é sugerido para <strong>manter</strong> (ícone verde).
                Os demais podem ser excluídos.
              </div>

              {duplicadas.map(grupo => (
                <div key={grupo.id_evento} className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                  {/* Header do grupo */}
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-gray-500 dark:text-gray-400 mr-2">
                        Evento #{grupo.id_evento}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {grupo.nome_evento}
                      </span>
                      <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                        — {grupo.cargo_evento}
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-1 rounded-full shrink-0">
                      {grupo.respostas.length} respostas
                    </span>
                  </div>

                  {/* Linhas de cada resposta */}
                  <div className="divide-y divide-gray-100 dark:divide-slate-700">
                    {grupo.respostas.map((resp, idx) => {
                      const isMelhor = idx === 0;
                      const isConfirmando = confirmandoDelete === resp.id_resposta;
                      const isDeletando = deletando === resp.id_resposta;
                      return (
                        <div
                          key={resp.id_resposta}
                          className={`px-4 py-3 flex items-start gap-3 ${isMelhor ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
                        >
                          {/* Ícone sugestão */}
                          <div className="shrink-0 mt-0.5">
                            {isMelhor ? (
                              <ShieldCheck className="w-5 h-5 text-green-500" title="Sugerido para manter" />
                            ) : (
                              <ShieldAlert className="w-5 h-5 text-red-400" title="Candidato à exclusão" />
                            )}
                          </div>

                          {/* Dados da resposta */}
                          <div className="flex-1 min-w-0 text-sm space-y-1">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="font-mono text-xs text-gray-400">#{resp.id_resposta}</span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${resp.tipo_origem === 'DEMISSAO' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                                {resp.tipo_origem}
                              </span>
                              {resp.arquivado && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">arquivada</span>}
                              {resp.nao_encontrada && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">não encontrada</span>}
                              {resp.id_evento_mae && <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">vaga mãe: #{resp.id_evento_mae}</span>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                              <span>
                                <span className="font-semibold">Candidato:</span>{' '}
                                {resp.nome_candidato || <em className="text-gray-400">vazio</em>}
                              </span>
                              <span>
                                <span className="font-semibold">Substituto ID:</span>{' '}
                                {resp.id_substituto ?? <em className="text-gray-400">nulo</em>}
                              </span>
                              <span>
                                <span className="font-semibold">Vaga:</span>{' '}
                                {resp.vaga_preenchida ?? <em className="text-gray-400">-</em>}
                              </span>
                              {resp.data_abertura_vaga && (
                                <span>
                                  <span className="font-semibold">Abertura:</span> {resp.data_abertura_vaga}
                                </span>
                              )}
                              {resp.data_fechamento_vaga && (
                                <span>
                                  <span className="font-semibold">Fechamento:</span> {resp.data_fechamento_vaga}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botão deletar */}
                          <div className="shrink-0">
                            {isMelhor ? (
                              <span className="text-xs text-green-600 dark:text-green-400 font-semibold px-2 py-1">
                                manter
                              </span>
                            ) : isConfirmando ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setConfirmandoDelete(null)}
                                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleDeletar(resp.id_resposta)}
                                  disabled={isDeletando}
                                  className="text-xs px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 disabled:opacity-50"
                                >
                                  {isDeletando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                  Confirmar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmandoDelete(resp.id_resposta)}
                                className="p-1.5 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                                title="Deletar esta resposta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Lista de Validações */}
      {filtro !== 'duplicadas' && (
      <div className="space-y-3">
        {validacoesFiltradas.length === 0 ? (
          <div className="text-center py-12 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-semibold">Todas as validações foram concluídas!</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Todos os 100 registros sem id_substituto foram vinculados com sucesso.
            </p>
          </div>
        ) : (
          validacoesFiltradas.map((item) => (
            <div
              key={item.pendente.id_resposta}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 hover:shadow-md transition-shadow"
            >
              {/* Cabeçalho do item */}
              <button
                onClick={() => toggleExpandir(item.pendente.id_resposta)}
                className="w-full px-4 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
              >
                {/* Indicadores: tipo + dificuldade */}
                <div className="flex-shrink-0 mt-1 flex gap-2">
                  {/* Tipo */}
                  {item.tipo === 'com_candidato' ? (
                    <div
                      className="w-3 h-3 rounded-full bg-blue-500"
                      title="Com nome de candidato"
                    />
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full bg-green-500"
                      title="Vaga preenchida (aguardando vinculação)"
                    />
                  )}

                  {/* Dificuldade */}
                  {item.dificuldade === 'facil' && (
                    <div className="w-3 h-3 rounded-full bg-green-500" title="Fácil" />
                  )}
                  {item.dificuldade === 'media' && (
                    <div className="w-3 h-3 rounded-full bg-yellow-500" title="Média" />
                  )}
                  {item.dificuldade === 'dificil' && (
                    <div className="w-3 h-3 rounded-full bg-red-500" title="Difícil" />
                  )}
                </div>

                {/* Informações principais */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                      ID {item.pendente.id_resposta}
                    </span>
                    {item.tipo === 'com_candidato' ? (
                      <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {item.pendente.nome_candidato}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                          Vaga Preenchida
                        </span>
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full font-semibold">
                          ✓ AGUARDANDO VINCULAÇÃO
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <div>
                      Unidade: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.pendente.lotacao}</span> |
                      Cargo: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.pendente.cargo}</span>
                    </div>
                    <div>
                      Vaga: {item.pendente.vaga_preenchida === 'SIM' ? '✓ Preenchida' : '⏳ Aberta'} |
                      {' '}{item.totalMatches} possível{item.totalMatches !== 1 ? 'idades' : 'idade'}
                    </div>
                  </div>
                </div>

                {/* Botão expandir/colapsar */}
                <div className="flex-shrink-0">
                  {expandidos.has(item.pendente.id_resposta) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Conteúdo expandido */}
              {expandidos.has(item.pendente.id_resposta) && (
                <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 space-y-3 bg-gray-50 dark:bg-slate-900/50">
                  {/* Detalhes da vaga */}
                  <div className="grid grid-cols-2 gap-4 text-sm pb-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Evento ID:</span>
                      <p className="font-mono text-blue-600 dark:text-blue-400 font-bold">{item.pendente.id_evento}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Unidade:</span>
                      <p className="font-semibold">{item.pendente.lotacao}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Cargo:</span>
                      <p className="font-semibold">{item.pendente.cargo}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400 text-xs font-semibold uppercase">Período:</span>
                      <p className="text-sm">
                        {item.pendente.data_abertura_vaga} a {item.pendente.data_fechamento_vaga}
                      </p>
                    </div>
                  </div>

                  {/* Matches disponíveis */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Selecione o substituto correto:
                    </h4>
                    <div className="space-y-2">
                      {item.matches.map((match) => (
                        <button
                          key={match.id}
                          onClick={() =>
                            handleVincular(item.pendente.id_resposta, match.id, match.nome)
                          }
                          disabled={salvando === item.pendente.id_resposta}
                          className="w-full text-left p-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 dark:hover:border-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-blue-600 dark:text-blue-400">
                                {match.nome}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                ID: {match.id} • {match.cargo}
                              </p>
                            </div>
                            {salvando === item.pendente.id_resposta ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0 ml-2" />
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botão pular */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => toggleExpandir(item.pendente.id_resposta)}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      <SkipForward className="w-4 h-4" />
                      Revisar depois
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}
    </div>
  );
};
