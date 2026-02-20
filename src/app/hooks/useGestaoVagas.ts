import { useState, useCallback } from 'react';
import {
  carregarDemissoes,
  carregarAfastamentos,
  carregarRespostasLote,
  salvarResposta,
  confirmarEfetivacao,
  carregarLotacoes,
  carregarVagasArquivadas,
  arquivarVaga,
  carregarVagasEmAberto,
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
      console.log('Fetching demissoes PENDENTE...');
      const demPendRaw = await carregarDemissoes(lotacao, 'PENDENTE', cnpj);
      console.log('Fetching demissoes RESPONDIDO...');
      const demRespRaw = await carregarDemissoes(lotacao, 'RESPONDIDO', cnpj);
      console.log('Fetching afastamentos...');
      const afastPendRaw = await carregarAfastamentos(lotacao, cnpj);
      console.log('Fetching archived vacancies...');
      const arquivadasRaw = await carregarVagasArquivadas(lotacao, cnpj);
      console.log('Fetching vagas em aberto...');
      const vagasEmAbertoRaw = await carregarVagasEmAberto(lotacao, cnpj);
      console.log('[useGestaoVagas] vagasEmAbertoRaw recebido:', vagasEmAbertoRaw.length, 'items');

      // Combinar e desduplicar eventos
      const todosEventosRaw = [...demPendRaw, ...demRespRaw, ...afastPendRaw, ...arquivadasRaw];
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

      // Helper para checar se está arquivado
      const isArquivado = (id: number) => mapaRespostas[id]?.arquivado === true;

      todosEventos.forEach(ev => {
        if (isArquivado(ev.id_evento)) {
          arquivadas.push(ev);
        } else {
          const resp = mapaRespostas[ev.id_evento];
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
      setVagasEmAberto(vagasEmAbertoRaw);
      setLotacoes(lotacoesData || ['TODAS']);

      console.log('[useGestaoVagas] Atualizadas', vagasEmAbertoRaw.length, 'vagas');
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

  return {
    demissoesPendentes,
    demissoesRespondidas,
    vagasPendentesEfetivacao,
    afastamentosPendentes,
    vagasArquivadas,
    vagasEmAberto,
    respostas,
    lotacoes,
    loading,
    error,
    carregarDados,
    responder,
    efetivar,
    arquivar,
  };
}
