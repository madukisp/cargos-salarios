import { supabase } from '@/lib/supabase';

export interface VagaAtribuida {
  id_evento: number;
  nome_funcionario: string;
  cargo_vaga: string;
  data_evento: string;
  dias_em_aberto: number;
  dias_reais: number;
  situacao_origem: string;
  lotacao: string;
  cnpj: string;
  data_atribuicao: string;
  vaga_preenchida?: string;
  pendente_efetivacao?: boolean;
}

export interface AnalistaComVagas {
  id: number;
  nome: string;
  cargo: string;
  vagas: VagaAtribuida[];
  totalVagas: number;
  vagasEmAberto: number;
  vagasFechadas: number;
  vagasCriticas: number;
}

/**
 * Calcular dias reais da vaga baseado em datas de abertura e fechamento
 */
const calcularDiasReais = (
  data_abertura_vaga: string | null | undefined,
  data_fechamento_vaga: string | null | undefined,
  dias_em_aberto: number
): number => {
  if (data_abertura_vaga && data_fechamento_vaga) {
    const abertura = new Date(data_abertura_vaga);
    const fechamento = new Date(data_fechamento_vaga);
    return Math.floor((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
  }
  return dias_em_aberto;
};

/**
 * Buscar todos os analistas com suas vagas atribuídas
 */
export const carregarAgendaAnalistas = async (): Promise<AnalistaComVagas[]> => {
  try {
    // Buscar vagas atribuídas com detalhes dos analistas e eventos
    const { data: vagasData, error: vagasError } = await supabase
      .from('vagas_analista')
      .select(`
        id,
        id_evento,
        id_analista,
        cnpj,
        data_atribuicao,
        ativo
      `)
      .eq('ativo', true)
      .order('data_atribuicao', { ascending: false });

    if (vagasError) {
      throw new Error(`Erro ao buscar vagas atribuídas: ${vagasError.message}`);
    }

    if (!vagasData || vagasData.length === 0) {
      return [];
    }

    // Buscar IDs únicos de analistas
    const idAnalistaUnicos = [...new Set(vagasData.map(v => v.id_analista))];

    // Buscar detalhes dos analistas
    const { data: analistasData, error: analistasError } = await supabase
      .from('oris_funcionarios')
      .select('id, nome, cargo')
      .in('id', idAnalistaUnicos)
      .order('nome', { ascending: true });

    if (analistasError) {
      throw new Error(`Erro ao buscar analistas: ${analistasError.message}`);
    }

    // Buscar IDs únicos de eventos
    const idEventosUnicos = [...new Set(vagasData.map(v => v.id_evento))];

    // Buscar detalhes dos eventos
    const { data: eventosData, error: eventosError } = await supabase
      .from('eventos_gestao_vagas_public')
      .select(`
        id_evento,
        nome,
        cargo,
        data_evento,
        dias_em_aberto,
        situacao_origem,
        lotacao
      `)
      .in('id_evento', idEventosUnicos);

    if (eventosError) {
      throw new Error(`Erro ao buscar eventos: ${eventosError.message}`);
    }

    // Buscar respostas do gestor para informações adicionais
    const { data: respostasData, error: respostasError } = await supabase
      .from('respostas_gestor')
      .select('*')
      .in('id_evento', idEventosUnicos);

    if (respostasError) {
      console.warn('Erro ao buscar respostas do gestor:', respostasError);
    }

    // Mapear eventos por ID
    const mapaEventos = new Map(
      (eventosData || []).map(e => [e.id_evento, e])
    );

    // Mapear respostas por ID
    const mapaRespostas = new Map(
      (respostasData || []).map(r => [r.id_evento, r])
    );

    // Construir estrutura de analistas com vagas
    const analistas: AnalistaComVagas[] = (analistasData || []).map(analista => {
      // Filtrar vagas deste analista e desduplicar por id_evento
      const vagasDoAnalistaRaw = vagasData.filter(v => v.id_analista === analista.id);
      const seenEventos = new Set<number>();
      const vagasDoAnalista = vagasDoAnalistaRaw.filter(v => {
        if (seenEventos.has(v.id_evento)) return false;
        seenEventos.add(v.id_evento);
        return true;
      });

      // Mapear vagas com detalhes dos eventos
      const vagasComDetalhes: VagaAtribuida[] = vagasDoAnalista
        .map(vaga => {
          const evento = mapaEventos.get(vaga.id_evento);
          const resposta = mapaRespostas.get(vaga.id_evento);

          if (!evento) return null;

          const dias_em_aberto = evento.dias_em_aberto || 0;
          const dias_reais = calcularDiasReais(
            resposta?.data_abertura_vaga,
            resposta?.data_fechamento_vaga,
            dias_em_aberto
          );

          return {
            id_evento: vaga.id_evento,
            nome_funcionario: evento.nome || '-',
            cargo_vaga: evento.cargo || '-',
            data_evento: evento.data_evento || '-',
            dias_em_aberto,
            dias_reais,
            situacao_origem: evento.situacao_origem || '-',
            lotacao: evento.lotacao || '-',
            cnpj: vaga.cnpj || '-',
            data_atribuicao: vaga.data_atribuicao || '-',
            vaga_preenchida: resposta?.vaga_preenchida,
            pendente_efetivacao: resposta?.pendente_efetivacao,
          };
        })
        .filter((v): v is VagaAtribuida => v !== null)
        .sort((a, b) => {
          // Prioridade 1: Vagas abertas em cima (não preenchidas)
          const aAberta = a.vaga_preenchida !== 'SIM' ? 0 : 1;
          const bAberta = b.vaga_preenchida !== 'SIM' ? 0 : 1;
          if (aAberta !== bAberta) return aAberta - bAberta;

          // Prioridade 2: Dentro do mesmo grupo, ordenar por dias_reais (descendente)
          return b.dias_reais - a.dias_reais;
        });

      // Calcular métricas usando dias reais
      const totalVagas = vagasComDetalhes.length;
      const vagasEmAberto = vagasComDetalhes.filter(v => v.vaga_preenchida !== 'SIM').length;
      const vagasFechadas = vagasComDetalhes.filter(v => v.vaga_preenchida === 'SIM').length;
      const vagasCriticas = vagasComDetalhes.filter(v => v.vaga_preenchida !== 'SIM' && v.dias_reais >= 45).length;

      return {
        id: analista.id,
        nome: analista.nome,
        cargo: analista.cargo,
        vagas: vagasComDetalhes,
        totalVagas,
        vagasEmAberto,
        vagasFechadas,
        vagasCriticas,
      };
    });

    return analistas;
  } catch (error) {
    console.error('Erro em carregarAgendaAnalistas:', error);
    throw error;
  }
};

/**
 * Desatribuir uma vaga de um analista
 */
export const desatribuirVaga = async (idEvento: number, idAnalista: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('vagas_analista')
      .delete()
      .eq('id_evento', idEvento)
      .eq('id_analista', idAnalista);

    if (error) {
      throw new Error(`Erro ao desatribuir vaga: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro em desatribuirVaga:', error);
    throw error;
  }
};
