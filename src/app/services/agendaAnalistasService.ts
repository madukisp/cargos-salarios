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
  data_abertura_vaga?: string;
  data_fechamento_vaga?: string;
  vaga_preenchida?: string;
  pendente_efetivacao?: boolean;
  nome_substituto?: string;
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
export const calcularDiasReais = (
  data_abertura_vaga: string | null | undefined,
  data_fechamento_vaga: string | null | undefined,
  dias_em_aberto: number
): number => {
  if (data_abertura_vaga && data_fechamento_vaga) {
    // Vaga fechada: dias entre abertura e fechamento
    const abertura = new Date(data_abertura_vaga + 'T00:00:00');
    const fechamento = new Date(data_fechamento_vaga + 'T00:00:00');
    return Math.floor((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
  }
  if (data_abertura_vaga) {
    // Vaga ainda aberta: dias entre abertura e hoje
    const abertura = new Date(data_abertura_vaga + 'T00:00:00');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.floor((hoje.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
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

    // Buscar detalhes dos analistas em blocos
    const analistasData: any[] = [];
    if (idAnalistaUnicos.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < idAnalistaUnicos.length; i += CHUNK_SIZE) {
        const chunk = idAnalistaUnicos.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('oris_funcionarios')
          .select('id, nome, cargo')
          .in('id', chunk);
        
        if (error) throw new Error(`Erro ao buscar analistas: ${error.message}`);
        if (data) analistasData.push(...data);
      }
    }
    // Ordenar manualmente após o fetch chunked
    analistasData.sort((a, b) => a.nome.localeCompare(b.nome));

    // Buscar IDs únicos de eventos
    const idEventosUnicos = [...new Set(vagasData.map(v => v.id_evento))];

    // Buscar detalhes dos eventos em blocos
    const eventosData: any[] = [];
    if (idEventosUnicos.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < idEventosUnicos.length; i += CHUNK_SIZE) {
        const chunk = idEventosUnicos.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
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
          .in('id_evento', chunk);
        
        if (error) throw new Error(`Erro ao buscar eventos: ${error.message}`);
        if (data) eventosData.push(...data);
      }
    }

    // Buscar respostas do gestor em blocos
    const respostasData: any[] = [];
    if (idEventosUnicos.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < idEventosUnicos.length; i += CHUNK_SIZE) {
        const chunk = idEventosUnicos.slice(i, i + CHUNK_SIZE);
        const { data } = await supabase
          .from('respostas_gestor')
          .select('id_evento, vaga_preenchida, data_abertura_vaga, data_fechamento_vaga, nome_candidato, id_substituto, pendente_efetivacao')
          .in('id_evento', chunk);
        
        if (data) respostasData.push(...data);
      }
    }

    // Mapear eventos por ID
    const mapaEventos = new Map(
      (eventosData || []).map(e => [e.id_evento, e])
    );

    // Mapear respostas por ID — prioriza 'SIM' em caso de duplicatas
    const mapaRespostas = new Map<number, any>();
    (respostasData || []).forEach((r: any) => {
      const existing = mapaRespostas.get(r.id_evento);
      // Prefere entrada com vaga_preenchida = 'SIM' (evita sobrescrever fechada com aberta)
      if (!existing || r.vaga_preenchida === 'SIM') {
        mapaRespostas.set(r.id_evento, r);
      }
    });

    // Buscar nomes dos substitutos por id_substituto
    const idsSubstitutos = [...new Set(
      (respostasData || []).map((r: any) => r.id_substituto).filter(Boolean)
    )];
    const mapaSubstitutos = new Map<number, string>();
    if (idsSubstitutos.length > 0) {
      const { data: subsData } = await supabase
        .from('oris_funcionarios')
        .select('id, nome')
        .in('id', idsSubstitutos);
      (subsData || []).forEach((s: any) => mapaSubstitutos.set(s.id, s.nome));
    }

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

          const vagaAtribuida: VagaAtribuida = {
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
            data_abertura_vaga: resposta?.data_abertura_vaga || undefined,
            data_fechamento_vaga: resposta?.data_fechamento_vaga || undefined,
            vaga_preenchida: resposta?.vaga_preenchida,
            pendente_efetivacao: resposta?.pendente_efetivacao,
            nome_substituto: resposta?.nome_candidato || (resposta?.id_substituto ? mapaSubstitutos.get(resposta.id_substituto) : undefined) || undefined,
          };
          
          return vagaAtribuida;
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

/**
 * Reatribuir uma vaga para outro analista
 */
export const reatribuirVaga = async (
  idEvento: number,
  idAnalistaAtual: number,
  idAnalistaNovo: number,
  cnpj: string
): Promise<void> => {
  try {
    // Desatribuir do analista atual
    const { error: deleteError } = await supabase
      .from('vagas_analista')
      .delete()
      .eq('id_evento', idEvento)
      .eq('id_analista', idAnalistaAtual);

    if (deleteError) {
      throw new Error(`Erro ao desatribuir vaga do analista atual: ${deleteError.message}`);
    }

    // Atribuir ao novo analista
    const { error: insertError } = await supabase
      .from('vagas_analista')
      .insert({
        id_evento: idEvento,
        id_analista: idAnalistaNovo,
        cnpj: cnpj,
        data_atribuicao: new Date().toISOString().split('T')[0],
        ativo: true,
      });

    if (insertError) {
      throw new Error(`Erro ao atribuir vaga ao novo analista: ${insertError.message}`);
    }
  } catch (error) {
    console.error('Erro em reatribuirVaga:', error);
    throw error;
  }
};
