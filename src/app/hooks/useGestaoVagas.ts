import { useState, useEffect, useCallback } from 'react';
import {
  carregarDemissoes,
  carregarAfastamentos,
  carregarRespostas,
  carregarRespostasLote,
  salvarResposta,
  confirmarEfetivacao,
  carregarLotacoes,
  EventoDemissao,
  RespostaGestor,
} from '@/app/services/demissoesService';

export function useGestaoVagas() {
  const [demissoesPendentes, setDemissoesPendentes] = useState<EventoDemissao[]>([]);
  const [demissoesRespondidas, setDemissoesRespondidas] = useState<EventoDemissao[]>([]);
  const [vagasPendentesEfetivacao, setVagasPendentesEfetivacao] = useState<EventoDemissao[]>([]);
  const [afastamentosPendentes, setAfastamentosPendentes] = useState<EventoDemissao[]>([]);
  const [afastamentosRespondidos, setAfastamentosRespondidos] = useState<EventoDemissao[]>([]);
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
      console.log('Fetching lotacoes...');
      const lotacoesData = await carregarLotacoes();
      
      const afastRespRaw: any[] = []; // Not used, keep empty for now


      // Corrigindo a separação: Afastamentos no service hoje filtram por situacao_origem !== '99-Demitido'
      // Já o carregarDemissoes filtra por === '99-Demitido'.
      // Então demPendRaw são demissões pendentes, afastPendRaw são afastamentos pendentes.

      const todosEventos = [...demPendRaw, ...demRespRaw, ...afastPendRaw];
      const idsFull = todosEventos.map(e => e.id_evento);

      const mapaRespostas = await carregarRespostasLote(idsFull);
      setRespostas(mapaRespostas);

      // Categorização robusta para Demissões
      const demPend: EventoDemissao[] = [];
      const demResp: EventoDemissao[] = [];
      const demPendEf: EventoDemissao[] = [];

      // Demissões Pendentes (status PENDENTE no banco)
      demPendRaw.forEach(d => {
        const resp = mapaRespostas[d.id_evento];
        if (resp?.pendente_efetivacao) {
          demPendEf.push(d);
        } else {
          demPend.push(d);
        }
      });

      // Demissões Respondidas (status RESPONDIDO no banco)
      demRespRaw.forEach(d => {
        const resp = mapaRespostas[d.id_evento];
        if (resp?.pendente_efetivacao) {
          demPendEf.push(d);
        } else {
          demResp.push(d);
        }
      });

      setDemissoesPendentes(demPend);
      setDemissoesRespondidas(demResp);
      setVagasPendentesEfetivacao(demPendEf);
      setAfastamentosPendentes(afastPendRaw || []);
      setLotacoes(lotacoesData || ['TODAS']);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(msg);
      console.error('Erro ao carregar dados:', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Removemos o useEffect interno para evitar duplicidade de chamadas e race conditions
  // O componente VacancyManagement já chama carregarDados no useEffect dele.

  const responder = useCallback(async (
    id_evento: number,
    tipo_origem: 'DEMISSAO' | 'AFASTAMENTO',
    dados: Partial<RespostaGestor>
  ) => {
    try {
      await salvarResposta(id_evento, tipo_origem, dados);
      // Recarregar mantendo a lotação atual
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

  return {
    demissoesPendentes,
    demissoesRespondidas,
    vagasPendentesEfetivacao,
    afastamentosPendentes,
    respostas,
    lotacoes,
    loading,
    error,
    carregarDados,
    responder,
    efetivar,
  };
}
