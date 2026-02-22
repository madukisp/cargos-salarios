import { useState, useCallback } from 'react';
import {
  carregarDemissoes,
  carregarAfastamentos,
  carregarAfastamentosRespondidos,
  carregarRespostasLote,
  salvarResposta,
  confirmarEfetivacao,
  carregarLotacoes,
  carregarVagasArquivadas,
  arquivarVaga,
  carregarVagasEmAberto,
  carregarVagasNaoEncontradas,
  marcarVagaNaoEncontrada,
  EventoDemissao,
  RespostaGestor,
  VagaEmAberto,
} from '@/app/services/demissoesService';

export function useGestaoVagas() {
  const [demissoesPendentes, setDemissoesPendentes] = useState<EventoDemissao[]>([]);
  const [demissoesRespondidas, setDemissoesRespondidas] = useState<EventoDemissao[]>([]);
  const [vagasPendentesEfetivacao, setVagasPendentesEfetivacao] = useState<EventoDemissao[]>([]);
  const [afastamentosPendentes, setAfastamentosPendentes] = useState<EventoDemissao[]>([]);
  const [vagasArquivadas, setVagasArquivadas] = useState<EventoDemissao[]>([]);
  const [vagasNaoEncontradas, setVagasNaoEncontradas] = useState<EventoDemissao[]>([]);
  const [vagasEmAberto, setVagasEmAberto] = useState<VagaEmAberto[]>([]);
  const [respostas, setRespostas] = useState<Record<number, RespostaGestor>>({});
  const [lotacoes, setLotacoes] = useState<string[]>(['TODAS']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotacaoAtual, setLotacaoAtual] = useState<string | undefined>();

  const carregarDados = useCallback(async (lotacao?: string, cnpj?: string) => {
    setLoading(true);
    setError(null);
    setLotacaoAtual(lotacao);

    try {
      const demPendRaw = await carregarDemissoes(lotacao, 'PENDENTE', cnpj);
      const demRespRaw = await carregarDemissoes(lotacao, 'RESPONDIDO', cnpj);
      const afastPendRaw = await carregarAfastamentos(lotacao, cnpj);
      const afastRespRaw = await carregarAfastamentosRespondidos(lotacao, cnpj);
      const arquivadasRaw = await carregarVagasArquivadas(lotacao, cnpj);
      const vagasEmAbertoRaw = await carregarVagasEmAberto(lotacao, cnpj);
      const naoEncontradasRaw = await carregarVagasNaoEncontradas(lotacao, cnpj);

      // Combinar e desduplicar eventos
      // afastRespRaw garante que afastamentos com resposta apareçam mesmo se o funcionário já retornou ao trabalho
      const todosEventosRaw = [...demPendRaw, ...demRespRaw, ...afastPendRaw, ...afastRespRaw, ...arquivadasRaw];
      const seenIds = new Set<number>();
      const todosEventos: EventoDemissao[] = [];

      todosEventosRaw.forEach(e => {
        if (!seenIds.has(e.id_evento)) {
          seenIds.add(e.id_evento);
          todosEventos.push(e);
        }
      });

      const idsFull = todosEventos.map(e => e.id_evento);

      const mapaRespostas = await carregarRespostasLote(idsFull);
      setRespostas(mapaRespostas);

      const lotacoesData = await carregarLotacoes();

      // Categorização unificada
      const demPend: EventoDemissao[] = [];
      const demResp: EventoDemissao[] = [];
      const demPendEf: EventoDemissao[] = [];
      const afastPend: EventoDemissao[] = [];
      const arquivadas: EventoDemissao[] = [];
      const naoEncontradas: EventoDemissao[] = [...naoEncontradasRaw];

      // Helper para checar se está arquivado ou não encontrado
      const isArquivado = (id: number) => mapaRespostas[id]?.arquivado === true;
      const isNaoEncontrada = (id: number) => mapaRespostas[id]?.nao_encontrada === true;
      // IDs já carregados em naoEncontradasRaw para evitar duplicar no carregamento
      const idsNaoEncontradas = new Set(naoEncontradasRaw.map(e => e.id_evento));

      todosEventos.forEach(ev => {
        if (isArquivado(ev.id_evento)) {
          arquivadas.push(ev);
        } else if (isNaoEncontrada(ev.id_evento) && !idsNaoEncontradas.has(ev.id_evento)) {
          // Evento marcado como não encontrado mas não carregado via query filtrada (filtro de lotação/cnpj)
          // Não adiciona em nenhuma outra lista
        } else if (idsNaoEncontradas.has(ev.id_evento)) {
          // Já está em naoEncontradas, não duplicar em outras listas
        } else {
          const resp = mapaRespostas[ev.id_evento];
          // Pendente de efetivação: apenas quando marcado explicitamente
          const pendenteEf = resp?.pendente_efetivacao === true;

          if (pendenteEf) {
            demPendEf.push(ev);
          } else {
            // Demissão (situacao_origem == '99-Demitido') ou Afastamento
            if (ev.situacao_origem === '99-Demitido') {
              if (ev.status_evento === 'PENDENTE') {
                demPend.push(ev);
              } else {
                demResp.push(ev);
              }
            } else {
              // Afastamentos: verificar se já tem resposta do gestor
              const resp = mapaRespostas[ev.id_evento];
              if (resp) {
                // Com resposta: sai de afastamentos e vai para respondidos
                // (de onde vagasFechadas e vagas em aberto são derivados)
                demResp.push(ev);
              } else {
                // Sem resposta: permanece em afastamentos pendentes
                afastPend.push(ev);
              }
            }
          }
        }
      });

      setDemissoesPendentes(demPend);
      setDemissoesRespondidas(demResp);
      setVagasPendentesEfetivacao(demPendEf);
      setAfastamentosPendentes(afastPend);
      setVagasArquivadas(arquivadas);
      setVagasNaoEncontradas(naoEncontradas);
      setVagasEmAberto(vagasEmAbertoRaw);
      setLotacoes(lotacoesData || ['TODAS']);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(msg);
      console.error('Erro ao carregar dados:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const responder = useCallback(async (
    id_evento: number,
    tipo_origem: 'DEMISSAO' | 'AFASTAMENTO',
    dados: Partial<RespostaGestor>
  ) => {
    try {
      await salvarResposta(id_evento, tipo_origem, dados);
      await carregarDados(lotacaoAtual);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar resposta';
      setError(msg);
      throw err;
    }
  }, [carregarDados, lotacaoAtual]);

  const efetivar = useCallback(async (id_evento: number, tipo: 'DEMISSAO' | 'AFASTAMENTO') => {
    try {
      await confirmarEfetivacao(id_evento, tipo);
      await carregarDados(lotacaoAtual);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao confirmar efetivação';
      setError(msg);
      throw err;
    }
  }, [carregarDados, lotacaoAtual]);

  const arquivar = useCallback(async (
    id_evento: number,
    tipo: 'DEMISSAO' | 'AFASTAMENTO',
    arquivarStatus: boolean
  ) => {
    try {
      await arquivarVaga(id_evento, tipo, arquivarStatus);
      await carregarDados(lotacaoAtual);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao arquivar vaga';
      setError(msg);
      throw err;
    }
  }, [carregarDados, lotacaoAtual]);

  const marcarNaoEncontrada = useCallback(async (
    id_evento: number,
    tipo: 'DEMISSAO' | 'AFASTAMENTO',
    status: boolean,
    observacao?: string
  ) => {
    try {
      await marcarVagaNaoEncontrada(id_evento, tipo, status, observacao);
      await carregarDados(lotacaoAtual);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao marcar vaga como não encontrada';
      setError(msg);
      throw err;
    }
  }, [carregarDados, lotacaoAtual]);

  return {
    demissoesPendentes,
    demissoesRespondidas,
    vagasPendentesEfetivacao,
    afastamentosPendentes,
    vagasArquivadas,
    vagasNaoEncontradas,
    vagasEmAberto,
    respostas,
    lotacoes,
    loading,
    error,
    carregarDados,
    responder,
    efetivar,
    arquivar,
    marcarNaoEncontrada,
  };
}
