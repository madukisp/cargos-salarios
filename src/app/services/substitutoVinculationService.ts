import { supabase } from '@/lib/supabase';

export interface VinculacaoPendente {
  id_resposta: number;
  id_evento: number;
  nome_candidato: string;
  vaga_preenchida: string;
  data_abertura_vaga: string;
  data_fechamento_vaga: string;
  lotacao?: string;
  cargo?: string;
}

export interface PossibleMatch {
  id: number;
  nome: string;
  cargo: string;
}

export interface ValidacaoItem {
  pendente: VinculacaoPendente;
  matches: PossibleMatch[];
  totalMatches: number;
  dificuldade: 'facil' | 'media' | 'dificil'; // 1 match = fácil, 2-5 = média, 6+ = difícil
  tipo: 'com_candidato' | 'preenchidas'; // com_candidato: nome preenchido | preenchidas: vaga_preenchida=true
}

/**
 * Buscar todas as respostas_gestor sem id_substituto para validação
 */
export const buscarVinculacoesPendentes = async (): Promise<ValidacaoItem[]> => {
  try {
    // 1. Buscar CASO 1: Respostas com nome_candidato mas sem id_substituto
    const { data: respostasCase1, error: error1 } = await supabase
      .from('respostas_gestor')
      .select('id_resposta, id_evento, nome_candidato, vaga_preenchida, data_abertura_vaga, data_fechamento_vaga')
      .not('nome_candidato', 'is', null)
      .is('id_substituto', null);

    if (error1) {
      throw new Error(`Erro ao buscar Case 1: ${error1.message}`);
    }

    // 2. Buscar CASO 2: Vagas preenchidas + abertas mas sem substituto
    // Condições: id_substituto IS NULL AND abriu_vaga = true AND vaga_preenchida = true
    const { data: respostasCase2, error: error2 } = await supabase
      .from('respostas_gestor')
      .select('id_resposta, id_evento, nome_candidato, vaga_preenchida, data_abertura_vaga, data_fechamento_vaga')
      .is('id_substituto', null)
      .eq('abriu_vaga', true)
      .eq('vaga_preenchida', true);

    if (error2) {
      throw new Error(`Erro ao buscar Case 2: ${error2.message}`);
    }

    // 3. Combinar e deduplificar (evitar itens que apareçam nos dois cases)
    const todosRegistros = [...(respostasCase1 || []), ...(respostasCase2 || [])];
    const registrosUnicos = Array.from(
      new Map(todosRegistros.map(r => [r.id_resposta, r])).values()
    );

    if (registrosUnicos.length === 0) {
      return [];
    }

    // Marcar qual é o tipo de cada registro para diferenciação
    const respostasComTipo = registrosUnicos.map(r => ({
      ...r,
      _tipo: respostasCase1?.some(rc1 => rc1.id_resposta === r.id_resposta)
        ? 'com_candidato'
        : 'preenchidas'
    }));

    const respostasData = respostasComTipo;

    // 2. Buscar detalhes dos eventos em blocos
    const idEventosUnicos = [...new Set(respostasData.map(r => r.id_evento))];
    const eventosData: any[] = [];

    if (idEventosUnicos.length > 0) {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < idEventosUnicos.length; i += CHUNK_SIZE) {
        const chunk = idEventosUnicos.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase
          .from('eventos_gestao_vagas_public')
          .select('id_evento, lotacao, cargo')
          .in('id_evento', chunk);

        if (error) throw new Error(`Erro ao buscar eventos: ${error.message}`);
        if (data) eventosData.push(...data);
      }
    }

    // 3. Mapear eventos por ID para fácil lookup
    const mapaEventos = new Map(
      eventosData.map(e => [e.id_evento, e])
    );

    // 4. Normalizar dados: combinar respostas com dados dos eventos
    const respostasNormalizadas = respostasData.map((resposta: any) => {
      const evento = mapaEventos.get(resposta.id_evento);
      return {
        id_resposta: resposta.id_resposta,
        id_evento: resposta.id_evento,
        nome_candidato: resposta.nome_candidato,
        vaga_preenchida: resposta.vaga_preenchida,
        data_abertura_vaga: resposta.data_abertura_vaga,
        data_fechamento_vaga: resposta.data_fechamento_vaga,
        lotacao: evento?.lotacao || 'N/A',
        cargo: evento?.cargo || 'N/A',
      };
    });

    // Para cada resposta, buscar matches possíveis
    const validacoes: ValidacaoItem[] = [];

    for (const resposta of respostasNormalizadas) {
      try {
        // Usar o tipo marcado anteriormente
        const tipo: 'com_candidato' | 'preenchidas' = (resposta as any)._tipo || 'com_candidato';
        const temCandidato = resposta.nome_candidato && resposta.nome_candidato.trim().length > 0;

        let matches: PossibleMatch[] = [];

        // Se tem nome de candidato, buscar matches baseado no nome
        if (temCandidato && tipo === 'com_candidato') {
          const nomeCandidato = resposta.nome_candidato.trim().toUpperCase();

          // Estratégia 1: Buscar por nome exato (ILIKE)
          const { data: matchesExatos, error: erroExatos } = await supabase
            .from('oris_funcionarios')
            .select('id, nome, cargo')
            .ilike('nome', nomeCandidato);

          if (!erroExatos) {
            matches = matchesExatos || [];
          }

          // Estratégia 2: Se não encontrou exato, buscar com similarity
          if (matches.length === 0) {
            const nomePartes = nomeCandidato.split(/\s+/);
            const nomesPrincipais = nomePartes.slice(0, 3).join(' ');

            const { data: matchesSimilares, error: erroSimilares } = await supabase
              .from('oris_funcionarios')
              .select('id, nome, cargo')
              .ilike('nome', `${nomesPrincipais}%`)
              .limit(20);

            if (!erroSimilares && matchesSimilares) {
              matches = matchesSimilares;
            }
          }
        } else {
          // Se NÃO tem candidato, sugerir por cargo (vagas abertas)
          if (resposta.cargo && resposta.cargo !== 'N/A') {
            const { data: matchesPorCargo, error: erroCargo } = await supabase
              .from('oris_funcionarios')
              .select('id, nome, cargo')
              .ilike('cargo', `${resposta.cargo}%`)
              .limit(15);

            if (!erroCargo && matchesPorCargo) {
              matches = matchesPorCargo;
            }
          }
        }

        // Limitar a máximo 10 matches
        matches = matches.slice(0, 10);

        let dificuldade: 'facil' | 'media' | 'dificil' = 'facil';
        if (matches.length > 5) {
          dificuldade = 'dificil';
        } else if (matches.length > 1) {
          dificuldade = 'media';
        }

        // Adicionar se encontrou algum match
        if (matches.length > 0) {
          validacoes.push({
            pendente: resposta,
            matches,
            totalMatches: matches.length,
            dificuldade,
            tipo,
          });
        }
      } catch (err) {
        console.error(`Erro processando resposta ${resposta.id_resposta}:`, err);
      }
    }

    // Ordenar por dificuldade: fácil primeiro
    validacoes.sort((a, b) => {
      const ordemDificuldade = { facil: 0, media: 1, dificil: 2 };
      return ordemDificuldade[a.dificuldade] - ordemDificuldade[b.dificuldade];
    });

    return validacoes;
  } catch (error) {
    console.error('Erro em buscarVinculacoesPendentes:', error);
    throw error;
  }
};

/**
 * Vincular um candidato a um substituto
 */
export const vincularSubstituto = async (
  idResposta: number,
  idSubstituto: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('respostas_gestor')
      .update({ id_substituto: idSubstituto })
      .eq('id_resposta', idResposta);

    if (error) {
      throw new Error(`Erro ao vincular substituto: ${error.message}`);
    }
  } catch (error) {
    console.error('Erro em vincularSubstituto:', error);
    throw error;
  }
};

/**
 * Deletar uma resposta pelo id_resposta
 */
export const deletarRespostaGestor = async (idResposta: number): Promise<void> => {
  const { error } = await supabase
    .from('respostas_gestor')
    .delete()
    .eq('id_resposta', idResposta);
  if (error) throw new Error(`Erro ao deletar resposta: ${error.message}`);
};

export interface RespostaDuplicada {
  id_resposta: number;
  id_evento: number;
  tipo_origem: 'DEMISSAO' | 'AFASTAMENTO';
  nome_candidato: string | null;
  id_substituto: number | null;
  abriu_vaga: boolean | null;
  vaga_preenchida: 'SIM' | 'NAO' | null;
  data_abertura_vaga: string | null;
  data_fechamento_vaga: string | null;
  arquivado: boolean | null;
  nao_encontrada: boolean | null;
  id_evento_mae: number | null;
  /** Score de completude (maior = manter, menor = candidato à exclusão) */
  score: number;
}

export interface GrupoDuplicadas {
  id_evento: number;
  nome_evento: string;
  cargo_evento: string;
  respostas: RespostaDuplicada[];
}

/**
 * Busca todos os id_evento que possuem mais de uma resposta em respostas_gestor
 */
export const buscarVagasDuplicadas = async (): Promise<GrupoDuplicadas[]> => {
  const { data, error } = await supabase
    .from('respostas_gestor')
    .select('id_resposta, id_evento, tipo_origem, nome_candidato, id_substituto, abriu_vaga, vaga_preenchida, data_abertura_vaga, data_fechamento_vaga, arquivado, nao_encontrada, id_evento_mae')
    .order('id_evento')
    .order('id_resposta');

  if (error) throw new Error(`Erro ao buscar duplicadas: ${error.message}`);
  if (!data || data.length === 0) return [];

  // Agrupar por id_evento
  const grupos = new Map<number, any[]>();
  for (const r of data) {
    const g = grupos.get(r.id_evento) ?? [];
    g.push(r);
    grupos.set(r.id_evento, g);
  }

  // Manter apenas grupos com mais de 1 entrada
  const duplicados = [...grupos.entries()]
    .filter(([_, resps]) => resps.length > 1)
    .map(([id_evento, resps]) => ({ id_evento, resps }));

  if (duplicados.length === 0) return [];

  // Enriquecer com nome/cargo do evento
  const ids = duplicados.map(d => d.id_evento);
  const { data: eventos } = await supabase
    .from('eventos_gestao_vagas_public')
    .select('id_evento, nome, cargo')
    .in('id_evento', ids);

  const mapaEventos = new Map((eventos || []).map((e: any) => [e.id_evento, e]));

  return duplicados.map(d => {
    const ev = mapaEventos.get(d.id_evento);
    const respostas: RespostaDuplicada[] = d.resps.map((r: any) => {
      // Score de completude: quanto maior, mais indicado para manter
      let score = 0;
      if (r.id_substituto !== null) score += 4;
      if (r.nome_candidato?.trim()) score += 2;
      if (r.vaga_preenchida === 'SIM') score += 1;
      if (r.arquivado) score -= 2;
      if (r.nao_encontrada) score -= 1;
      return { ...r, score };
    });
    // Ordenar: maior score primeiro (o de manter)
    respostas.sort((a, b) => b.score - a.score);
    return {
      id_evento: d.id_evento,
      nome_evento: ev?.nome ?? 'Desconhecido',
      cargo_evento: ev?.cargo ?? 'Desconhecido',
      respostas,
    };
  });
};

/**
 * Pular um item para revisar depois
 */
export const marcarParaRevisaoManual = async (
  idResposta: number,
  motivo: string
): Promise<void> => {
  try {
    // Adicionar um campo de observação ou comentário (se existir na tabela)
    console.log(`Item ${idResposta} marcado para revisão manual: ${motivo}`);
    // Futuramente, pode-se adicionar um campo 'observacoes' ou 'precisa_validacao_manual' na tabela
  } catch (error) {
    console.error('Erro em marcarParaRevisaoManual:', error);
    throw error;
  }
};

/**
 * Obter estatísticas de progresso
 */
export const obterEstatisticas = async (): Promise<{
  total: number;
  vinculados: number;
  pendentes: number;
  porcentagemConcluida: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('respostas_gestor')
      .select('id_resposta, id_substituto, nome_candidato', { count: 'exact' })
      .not('nome_candidato', 'is', null);

    if (error) {
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }

    const total = data?.length || 0;
    const vinculados = data?.filter(r => r.id_substituto !== null).length || 0;
    const pendentes = total - vinculados;
    const porcentagemConcluida = total > 0 ? (vinculados / total) * 100 : 0;

    return {
      total,
      vinculados,
      pendentes,
      porcentagemConcluida,
    };
  } catch (error) {
    console.error('Erro em obterEstatisticas:', error);
    throw error;
  }
};
