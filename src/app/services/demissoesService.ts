import { supabase } from '@/lib/supabase';

export interface VagaEmAberto {
  id_evento: number;
  cnpj: string;
  quem_saiu: string;
  cargo_saiu: string;
  centro_custo: string;
  data_abertura_vaga: string;
  dias_em_aberto: number;
  observacao?: string | null;
  data_evento: string;
  id_funcionario: number;
  carga_horaria_semanal?: string | null;
  escala?: string | null;
  // Identifica registros vindos de vagas_movimentacao
  _source?: 'MOVIMENTACAO';
  tipo_movimentacao?: 'PROMOCAO' | 'TRANSFERENCIA';
}

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
    console.log('[carregarDemissoes] Iniciando (mixed mode), status:', status);

    // 1. Buscar demitidos do oris_funcionarios (fonte "real-time")
    let query = supabase
      .from('oris_funcionarios')
      .select(
        'id,nome,cargo,cnpj,dt_rescisao,tipo_rescisao,carga_horaria_semanal,escala,centro_custo,nome_fantasia'
      )
      .eq('situacao', '99-Demitido')
      .order('dt_rescisao', { ascending: false });

    const { data: demitidos, error: empError } = await query;
    if (empError) throw empError;

    if (!demitidos || demitidos.length === 0) return [];

    // 2. Buscar eventos correspondentes em eventos_movimentacao
    // Precisamos disso para obter o id_evento real, caso o sync tenha rodado
    const funcIds = demitidos.map(d => d.id);
    const { data: eventosReais } = await supabase
      .from('eventos_movimentacao')
      .select('id_evento, id_funcionario, data_evento')
      .in('id_funcionario', funcIds)
      .eq('situacao_origem', '99-Demitido'); // Garantir que é demissão

    // Criar mapa: id_funcionario -> id_evento (mais recente)
    const mapaEventos: Record<number, number> = {};
    if (eventosReais) {
      eventosReais.forEach((ev: any) => {
        // Se houver mais de um, o último sobrescreve (ordem não garantida pelo select, mas assumindo 1:1 recente)
        // Idealmente filtrar pela data mais próxima, mas direto é aceitável aqui
        mapaEventos[ev.id_funcionario] = ev.id_evento;
      });
    }

    // 3. Buscar respostas para filtrar PENDENTE/RESPONDIDO
    const { data: respostas } = await supabase
      .from('respostas_gestor')
      .select('id_evento')
      .eq('tipo_origem', 'DEMISSAO');

    const respostasSet = new Set((respostas || []).map(r => r.id_evento));

    // 4. Filtrar e formatar
    let demissoesFiltradas = demitidos.filter(d => {
      // O ID que usamos para verificar resposta é o ID do EVENTO se existir, senão o ID do FUNC
      // Mas espere! Se o evento existe, a resposta está ligada ao id_evento.
      // Se o evento NÃO existe, a resposta NÃO DEVERIA existir (pois fk fail).
      // Entao:
      const realIdEvento = mapaEventos[d.id];
      const idParaChecar = realIdEvento || d.id; // Fallback para id_funcionario se não tem evento (mas nao deve ter resposta)

      // Se usamos id_funcionario como id_evento temporário, verificamos se tem resposta com esse ID
      // (caso legado ou bug). Mas o padrão agora é id_evento.

      const temResposta = respostasSet.has(idParaChecar);

      if (status === 'PENDENTE') {
        return !temResposta;
      } else {
        return temResposta;
      }
    });

    // 5. Filtros de UI
    if (lotacao && lotacao !== 'TODAS') {
      demissoesFiltradas = demissoesFiltradas.filter(d =>
        d.centro_custo === lotacao || d.nome_fantasia === lotacao
      );
    }
    if (cnpj && cnpj !== 'todos') {
      demissoesFiltradas = demissoesFiltradas.filter(d => d.cnpj === cnpj);
    }

    console.log('[carregarDemissoes] Retornando', demissoesFiltradas.length, `demissões`);

    // Helper formatar
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return demissoesFiltradas.map(d => {
      const dataSaida = new Date(d.dt_rescisao + 'T00:00:00');
      const diffTime = Math.abs(hoje.getTime() - dataSaida.getTime());
      const diasEmAberto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const realIdEvento = mapaEventos[d.id];

      return {
        id_evento: realIdEvento || d.id, // Preferência pelo ID real do evento
        nome: d.nome,
        cargo: d.cargo,
        cnpj: d.cnpj,
        data_evento: d.dt_rescisao,
        status_evento: status as 'PENDENTE' | 'RESPONDIDO',
        dias_em_aberto: diasEmAberto,
        situacao_origem: '99-Demitido',
        lotacao: d.centro_custo || d.nome_fantasia || 'Sem lotação',
        tipo_rescisao: d.tipo_rescisao,
        carga_horaria_semanal: d.carga_horaria_semanal,
        escala: d.escala,
        // Campos extras para auxiliar na criação se necessário
        _id_funcionario: d.id,
        _needs_creation: !realIdEvento
      } as EventoDemissao;
    });
  } catch (error) {
    console.error('[carregarDemissoes] Exception:', error);
    return [];
  }
}

// Remover o antigo formatarDemissoes que ficou solto se não for usado, ou mantê-lo.
// Vou incorporar a lógica inline acima para clareza e evitar duplicatas.


export async function carregarAfastamentos(
  lotacao?: string,
  cnpj?: string
): Promise<EventoDemissao[]> {
  try {
    console.log('[carregarAfastamentos] Iniciando (mixed mode)');

    // 1. Buscar afastados de oris_funcionarios
    let query = supabase
      .from('oris_funcionarios')
      .select(
        'id,nome,cargo,cnpj,situacao,dt_inicio_situacao,carga_horaria_semanal,escala,centro_custo,nome_fantasia'
      )
      .neq('situacao', '01-ATIVO')
      .neq('situacao', '99-Demitido')
      .not('situacao', 'ilike', '%ATESTADO%')
      .order('dt_inicio_situacao', { ascending: false })
      .limit(500);

    const { data: afastados, error } = await query;

    if (error) {
      console.error('[carregarAfastamentos] Erro:', error);
      return [];
    }

    if (!afastados || afastados.length === 0) return [];

    // 2. Buscar eventos correspondentes
    const funcIds = afastados.map(d => d.id);
    const { data: eventosReais } = await supabase
      .from('eventos_movimentacao')
      .select('id_evento, id_funcionario')
      .in('id_funcionario', funcIds);

    const mapaEventos: Record<number, number> = {};
    if (eventosReais) {
      eventosReais.forEach((ev: any) => {
        mapaEventos[ev.id_funcionario] = ev.id_evento;
      });
    }

    // 3. Filtros
    const afastamentosFiltrados = afastados.filter((d: any) => {
      const matchLotacao = !lotacao || lotacao === 'TODAS' ||
        d.centro_custo === lotacao ||
        d.nome_fantasia === lotacao;
      const matchCnpj = !cnpj || cnpj === 'todos' || d.cnpj === cnpj;
      return matchLotacao && matchCnpj;
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return afastamentosFiltrados.map((d: any) => {
      const dataEvento = new Date(d.dt_inicio_situacao + 'T00:00:00');
      const diffTime = Math.abs(hoje.getTime() - dataEvento.getTime());
      const diasEmAberto = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const realIdEvento = mapaEventos[d.id];

      return {
        id_evento: realIdEvento || d.id,
        nome: d.nome,
        cargo: d.cargo,
        cnpj: d.cnpj,
        data_evento: d.dt_inicio_situacao,
        status_evento: 'PENDENTE' as const,
        dias_em_aberto: diasEmAberto,
        situacao_origem: d.situacao,
        lotacao: d.centro_custo || d.nome_fantasia || 'Sem lotação',
        carga_horaria_semanal: d.carga_horaria_semanal,
        escala: d.escala,
        _id_funcionario: d.id,
        _needs_creation: !realIdEvento
      } as EventoDemissao;
    });

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

export async function carregarVagasEmAberto(
  lotacao?: string,
  cnpj?: string
): Promise<VagaEmAberto[]> {
  try {
    console.log('[carregarVagasEmAberto] Iniciando com lotacao:', lotacao, 'cnpj:', cnpj);

    let query = supabase
      .from('vw_vagas_em_aberto_por_cnpj')
      .select('*')
      .order('data_abertura_vaga', { ascending: false });

    // Filtrar por lotação (centro_custo)
    if (lotacao && lotacao !== 'TODAS') {
      console.log('[carregarVagasEmAberto] Aplicando filtro de lotação:', lotacao);
      query = query.eq('centro_custo', lotacao);
    }

    // Filtrar por CNPJ - SÓ SE NÃO FOR 'todos'
    if (cnpj && cnpj !== 'todos') {
      console.log('[carregarVagasEmAberto] Aplicando filtro de CNPJ:', cnpj);
      query = query.eq('cnpj', cnpj);
    } else {
      console.log('[carregarVagasEmAberto] Sem filtro de CNPJ - carregando todos');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[carregarVagasEmAberto] Erro:', error);
      return [];
    }

    const vagas = (data || []) as VagaEmAberto[];

    // Enriquecer com carga_horaria_semanal e escala do oris_funcionarios
    const ids = vagas.map(v => v.id_funcionario).filter(Boolean);
    if (ids.length > 0) {
      const { data: orisData } = await supabase
        .from('oris_funcionarios')
        .select('id, carga_horaria_semanal, escala')
        .in('id', ids);

      if (orisData && orisData.length > 0) {
        const mapaOris: Record<number, { carga_horaria_semanal?: string; escala?: string }> = {};
        orisData.forEach((o: any) => { mapaOris[o.id] = o; });

        vagas.forEach(v => {
          const oris = mapaOris[v.id_funcionario];
          if (oris) {
            v.carga_horaria_semanal = oris.carga_horaria_semanal ?? null;
            v.escala = oris.escala ?? null;
          }
        });
      }
    }

    // Buscar vagas de movimentação manual (status ABERTA)
    let movQuery = supabase
      .from('vagas_movimentacao')
      .select('*')
      .eq('status', 'ABERTA')
      .order('data_abertura', { ascending: false });

    if (lotacao && lotacao !== 'TODAS') {
      movQuery = movQuery.eq('centro_custo', lotacao);
    }
    if (cnpj && cnpj !== 'todos') {
      movQuery = movQuery.eq('cnpj', cnpj);
    }

    const { data: movData } = await movQuery;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const vagasMovimentacao: VagaEmAberto[] = (movData || []).map((m: any) => {
      const dataAbertura = new Date(m.data_abertura + 'T00:00:00');
      const diasEmAberto = Math.ceil(
        (hoje.getTime() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        id_evento: m.id,
        cnpj: m.cnpj,
        quem_saiu: m.nome_funcionario,
        cargo_saiu: m.cargo,
        centro_custo: m.centro_custo,
        data_abertura_vaga: m.data_abertura,
        dias_em_aberto: diasEmAberto,
        observacao: m.observacao,
        data_evento: m.data_abertura, // sem evento anterior — data abertura = data da vaga
        id_funcionario: m.id_funcionario,
        carga_horaria_semanal: m.carga_horaria_semanal,
        escala: m.escala,
        _source: 'MOVIMENTACAO',
        tipo_movimentacao: m.tipo_movimentacao,
      };
    });

    const total = [...vagas, ...vagasMovimentacao];
    console.log('[carregarVagasEmAberto] Retornando', total.length, 'vagas em aberto');
    return total;
  } catch (error) {
    console.error('[carregarVagasEmAberto] Exception:', error);
    return [];
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

export async function excluirVagaMovimentacao(id: number): Promise<void> {
  const { error } = await supabase
    .from('vagas_movimentacao')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
