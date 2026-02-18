import { supabase } from '@/lib/supabase';

export interface EventoDemissao {
  id_evento: number;
  nome: string;
  cargo: string;
  cnpj: string;
  data_evento: string;
  status_evento: 'PENDENTE' | 'RESPONDIDO';
  dias_em_aberto: number;
  situacao_origem: string;
  lotacao: string;
  tipo_rescisao?: string;
  carga_horaria_semanal?: string;
  escala?: string;
}

export interface RespostaGestor {
  id_resposta?: number;
  id_evento: number;
  tipo_origem: 'DEMISSAO' | 'AFASTAMENTO';
  abriu_vaga: boolean | null;
  data_abertura_vaga: string | null;
  vaga_preenchida: 'SIM' | 'NAO' | null;
  id_substituto: number | null;
  observacao: string | null;
  data_resposta?: string;
  pendente_efetivacao?: boolean | null;
  nome_candidato?: string | null;
  nao_pertence_unidade?: boolean | null;
  data_fechamento_vaga?: string | null;
  arquivado?: boolean | null;
}

export async function carregarDemissoes(
  lotacao?: string,
  status: 'PENDENTE' | 'RESPONDIDO' = 'PENDENTE',
  cnpj?: string
): Promise<EventoDemissao[]> {
  try {
    console.log('[carregarDemissoes] Iniciando com tempo real de oris_funcionarios, status:', status);

    // 1. Buscar todos os demitidos de oris_funcionarios
    const { data: demitidos, error: empError } = await supabase
      .from('oris_funcionarios')
      .select(
        'id,nome,cargo,cnpj,dt_rescisao,tipo_rescisao,carga_horaria_semanal,escala,centro_custo,nome_fantasia'
      )
      .eq('situacao', '99-Demitido')
      .order('dt_rescisao', { ascending: false })
      .limit(500);

    if (empError) throw empError;

    console.log('[carregarDemissoes] Demitidos carregados:', demitidos?.length);

    if (!demitidos || demitidos.length === 0) {
      return [];
    }

    // 2. Buscar respostas dos gestores
    const idsEventos = demitidos.map(d => d.id);
    const { data: respostas, error: respError } = await supabase
      .from('respostas_gestor')
      .select('id_evento')
      .in('id_evento', idsEventos)
      .eq('tipo_origem', 'DEMISSAO');

    if (respError) throw respError;

    const respostasSet = new Set((respostas || []).map(r => r.id_evento));
    console.log('[carregarDemissoes] Respostas encontradas:', respostasSet.size);

    // 3. Calcular dias em aberto
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // 4. Filtrar por status, lotação e CNPJ
    const demissoesFiltradas = (demitidos as any[])
      .filter(d => {
        // Filtro de status
        const temResposta = respostasSet.has(d.id);
        if (status === 'PENDENTE' && temResposta) return false;
        if (status === 'RESPONDIDO' && !temResposta) return false;

        // Filtro de lotação
        if (lotacao && lotacao !== 'TODAS') {
          const matchLotacao = d.centro_custo === lotacao || d.nome_fantasia === lotacao;
          if (!matchLotacao) return false;
        }

        // Filtro de CNPJ
        if (cnpj && cnpj !== 'todos' && d.cnpj !== cnpj) {
          return false;
        }

        return true;
      })
      .map(d => {
        const dataSaida = new Date(d.dt_rescisao + 'T00:00:00');
        const diffTime = Math.abs(hoje.getTime() - dataSaida.getTime());
        const diasEmAberto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          id_evento: d.id,
          nome: d.nome,
          cargo: d.cargo,
          cnpj: d.cnpj,
          data_evento: d.dt_rescisao,
          status_evento: respostasSet.has(d.id) ? 'RESPONDIDO' : 'PENDENTE',
          dias_em_aberto: diasEmAberto,
          situacao_origem: '99-Demitido',
          lotacao: d.centro_custo || d.nome_fantasia || 'Sem lotação',
          tipo_rescisao: d.tipo_rescisao,
          carga_horaria_semanal: d.carga_horaria_semanal,
          escala: d.escala,
        } as EventoDemissao;
      });

    console.log('[carregarDemissoes] Retornando', demissoesFiltradas.length, 'demissões');
    return demissoesFiltradas;
  } catch (error) {
    console.error('[carregarDemissoes] Exception:', error);
    return [];
  }
}

export async function carregarAfastamentos(
  lotacao?: string,
  cnpj?: string
): Promise<EventoDemissao[]> {
  try {
    console.log('[carregarAfastamentos] Iniciando com tempo real de oris_funcionarios');

    // Buscar todos os afastados diretamente de oris_funcionarios
    let query = supabase
      .from('oris_funcionarios')
      .select(
        'id,nome,cargo,cnpj,situacao,dt_inicio_situacao,carga_horaria_semanal,escala,centro_custo,nome_fantasia'
      )
      .order('dt_inicio_situacao', { ascending: false })
      .limit(500);

    // Filtrar: afastamentos (não ativo, não demitido, não atestado)
    const { data, error } = await query;

    console.log('[carregarAfastamentos] Query error:', error, 'data length:', data?.length);

    if (error) {
      console.error('[carregarAfastamentos] Erro:', error);
      return [];
    }

    // Filtrar apenas afastamentos (NÃO ativo, NÃO demitido, NÃO atestado)
    const afastamentos = ((data || []) as any[]).filter((d) => {
      const situacao = (d.situacao || '').toUpperCase();
      // Excluir ativos
      if (situacao === '01-ATIVO') return false;
      // Excluir demitidos
      if (situacao === '99-DEMITIDO') return false;
      // Excluir qualquer tipo de atestado (case-insensitive)
      if (situacao.includes('ATESTADO')) return false;
      // Manter apenas auxílios (licenças, afastamentos, etc.)
      return true;
    });

    // Aplicar filtros de lotação e CNPJ
    const afastamentosFiltrados = afastamentos.filter((d: any) => {
      const matchLotacao = !lotacao || lotacao === 'TODAS' ||
        d.centro_custo === lotacao ||
        d.nome_fantasia === lotacao;

      const matchCnpj = !cnpj || cnpj === 'todos' || d.cnpj === cnpj;

      return matchLotacao && matchCnpj;
    });

    // Calcular dias em aberto
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const afastamentosFormatados = afastamentosFiltrados.map((d: any) => {
      const dataEvento = new Date(d.dt_inicio_situacao + 'T00:00:00');
      const diffTime = Math.abs(hoje.getTime() - dataEvento.getTime());
      const diasEmAberto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id_evento: d.id, // ID de oris_funcionarios como id_evento
        nome: d.nome,
        cargo: d.cargo,
        cnpj: d.cnpj,
        data_evento: d.dt_inicio_situacao, // Data de início da situação
        status_evento: 'PENDENTE' as const,
        dias_em_aberto: diasEmAberto,
        situacao_origem: d.situacao,
        lotacao: d.centro_custo || d.nome_fantasia || 'Sem lotação',
        carga_horaria_semanal: d.carga_horaria_semanal,
        escala: d.escala,
      } as EventoDemissao;
    });

    console.log('[carregarAfastamentos] Retornando', afastamentosFormatados.length, 'afastamentos em tempo real');
    return afastamentosFormatados;
  } catch (error) {
    console.error('[carregarAfastamentos] Exception:', error);
    return [];
  }
}

export async function carregarRespostasLote(
  ids_eventos: number[]
): Promise<Record<number, RespostaGestor>> {
  if (!ids_eventos || ids_eventos.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('respostas_gestor')
      .select('*')
      .in('id_evento', ids_eventos);

    if (error) {
      console.error('Erro ao carregar respostas em lote:', error);
      return {};
    }

    const mapa: Record<number, RespostaGestor> = {};
    (data || []).forEach((resp: any) => {
      mapa[resp.id_evento] = resp;
    });

    // Carregar nomes dos substitutos se houver id_substituto
    const idsSubstitutos = (data || [])
      .map((resp: any) => resp.id_substituto)
      .filter((id): id is number => id !== null && id !== undefined);

    if (idsSubstitutos.length > 0) {
      const { data: substitutos } = await supabase
        .from('oris_funcionarios')
        .select('id, nome')
        .in('id', idsSubstitutos);

      const mapaSubstitutos: Record<number, string> = {};
      (substitutos || []).forEach((sub: any) => {
        mapaSubstitutos[sub.id] = sub.nome;
      });

      // Adicionar nome_substituto aos objetos de resposta
      (data || []).forEach((resp: any) => {
        if (resp.id_substituto && mapaSubstitutos[resp.id_substituto]) {
          mapa[resp.id_evento].nome_candidato = mapaSubstitutos[resp.id_substituto];
        }
      });
    }

    return mapa;
  } catch (error) {
    console.error('Erro:', error);
    return {};
  }
}

export async function carregarRespostas(
  id_evento: number
): Promise<RespostaGestor | null> {
  const result = await carregarRespostasLote([id_evento]);
  return result[id_evento] || null;
}

export async function salvarResposta(
  id_evento: number,
  tipo_origem: 'DEMISSAO' | 'AFASTAMENTO',
  dados: Partial<RespostaGestor>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('respostas_gestor')
      .upsert(
        {
          id_evento,
          tipo_origem,
          ...dados,
          data_resposta: new Date().toISOString().split('T')[0], // Apenas a data
          data_fechamento_vaga: dados.vaga_preenchida === 'SIM'
            ? (dados.data_fechamento_vaga || new Date().toISOString().split('T')[0])
            : null,
        },
        { onConflict: 'id_evento, tipo_origem' }
      );

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    throw error;
  }
}

/**
 * Confirma a efetivação (retira o status de pendente_efetivacao)
 */
export async function confirmarEfetivacao(
  id_evento: number,
  tipo_origem: 'DEMISSAO' | 'AFASTAMENTO'
): Promise<void> {
  try {
    const { error } = await supabase
      .from('respostas_gestor')
      .update({
        pendente_efetivacao: false,
        data_fechamento_vaga: new Date().toISOString().split('T')[0]
      })
      .match({ id_evento, tipo_origem });

    if (error) throw error;
  } catch (error) {
    console.error('Erro ao confirmar efetivação:', error);
    throw error;
  }
}

export async function arquivarVaga(
  id_evento: number,
  tipo_origem: 'DEMISSAO' | 'AFASTAMENTO',
  arquivar: boolean
): Promise<void> {
  try {
    // Primeiro verificamos se ja existe uma resposta para fazer update, senao criamos
    const { data: existing, error: fetchError } = await supabase
      .from('respostas_gestor')
      .select('id_resposta')
      .eq('id_evento', id_evento)
      .eq('tipo_origem', tipo_origem)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) {
      const { error } = await supabase
        .from('respostas_gestor')
        .update({ arquivado: arquivar })
        .eq('id_resposta', existing.id_resposta);
      if (error) throw error;
    } else {
      // Cria uma resposta vazia apenas com o status arquivado
      const { error } = await supabase
        .from('respostas_gestor')
        .insert({
          id_evento: id_evento,
          tipo_origem: tipo_origem,
          arquivado: arquivar,
          data_resposta: new Date().toISOString().split('T')[0]
        });
      if (error) throw error;
    }

  } catch (error) {
    console.error('Erro ao arquivar vaga:', error);
    throw error;
  }
}

export async function carregarVagasArquivadas(
  lotacao?: string,
  cnpj?: string
): Promise<EventoDemissao[]> {
  try {
    // 1. Get IDs of archived responses
    const { data: respostas, error: respError } = await supabase
      .from('respostas_gestor')
      .select('id_evento')
      .eq('arquivado', true);

    if (respError) {
      console.error('Erro ao buscar vagas arquivadas:', respError);
      return [];
    }

    if (!respostas || respostas.length === 0) return [];

    const ids = respostas.map(r => r.id_evento);

    // 2. Fetch events for these IDs, applying filters
    let query = supabase
      .from('eventos_gestao_vagas_public')
      .select('id_evento,nome,cargo,cnpj,data_evento,status_evento,dias_em_aberto,situacao_origem,lotacao')
      .in('id_evento', ids)
      .order('data_evento', { ascending: false });

    if (lotacao && lotacao !== 'TODAS') {
      query = query.eq('lotacao', lotacao);
    }
    if (cnpj && cnpj !== 'todos') {
      query = query.eq('cnpj', cnpj);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao carregar detalhes das vagas arquivadas:', error);
      return [];
    }

    // 3. Buscar detalhes (tipo_rescisao, carga_horaria_semanal, escala) - mesma lógica das outras funções
    const eventos = (data || []) as any[];
    const nomes = eventos.map((d: any) => d.nome).filter(Boolean);
    let mapaDetalhes: Record<string, any> = {};

    if (nomes.length > 0) {
      const { data: orisData } = await supabase
        .from('oris_funcionarios')
        .select('nome, tipo_rescisao, carga_horaria_semanal, escala')
        .in('nome', nomes);

      (orisData || []).forEach((oris: any) => {
        mapaDetalhes[oris.nome] = oris;
      });
    }

    // Adicionar detalhes aos resultados
    const eventosComDetalhes = eventos.map((d: any) => ({
      ...d,
      tipo_rescisao: mapaDetalhes[d.nome]?.tipo_rescisao || null,
      carga_horaria_semanal: mapaDetalhes[d.nome]?.carga_horaria_semanal || null,
      escala: mapaDetalhes[d.nome]?.escala || null,
    })) as EventoDemissao[];

    return eventosComDetalhes;
  } catch (error) {
    console.error('Erro ao carregar vagas arquivadas:', error);
    return [];
  }
}

export async function carregarLotacoes(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('eventos_gestao_vagas_public')
      .select('lotacao')
      .order('lotacao')
      .limit(500);

    if (error) {
      console.error('[carregarLotacoes] Erro:', error);
      return ['TODAS'];
    }

    const lotacoes = new Set(['TODAS']);
    (data || []).forEach((item: any) => {
      if (item?.lotacao) lotacoes.add(item.lotacao);
    });

    console.log('[carregarLotacoes] Retornando', lotacoes.size, 'lotações');
    return Array.from(lotacoes).sort();
  } catch (error) {
    console.error('[carregarLotacoes] Exception:', error);
    return ['TODAS'];
  }
}

export async function buscarFuncionarioPorCpf(cpf: string): Promise<any | null> {
  if (!cpf) return null;
  try {
    const { data, error } = await supabase
      .from('oris_funcionarios')
      .select('*')
      .eq('cpf', cpf)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar funcionário por CPF:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Erro:', error);
    return null;
  }
}

export async function buscarFuncionarioPorNome(nome: string): Promise<any | null> {
  if (!nome) return null;
  try {
    const { data, error } = await supabase
      .from('oris_funcionarios')
      .select('*')
      .ilike('nome', nome)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar funcionário por nome:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Erro:', error);
    return null;
  }
}

export async function buscarSugestoesSubstitutos(termo: string, nomeFantasia?: string): Promise<any[]> {


  try {
    let query = supabase
      .from('oris_funcionarios')
      .select('id, nome, cargo, centro_custo, local_de_trabalho, nome_fantasia, cnpj, situacao, dt_admissao');

    // Filtrar por nome se termo foi fornecido
    if (termo && termo.length > 0) {
      query = query.ilike('nome', `%${termo}%`);
    }

    // Filtrar apenas funcionários do mesmo contrato (nome_fantasia)
    if (nomeFantasia) {
      query = query.eq('nome_fantasia', nomeFantasia);
    }

    const { data, error } = await query
      .order('dt_admissao', { ascending: false }) // Mais recentes primeiro
      .limit(100); // Reduzido porque agora filtra por contrato

    if (error) {
      console.error('Erro ao buscar sugestões:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao buscar sugestões:', error);
    return [];
  }
}
