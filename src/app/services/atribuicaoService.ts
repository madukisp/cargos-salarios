
import { supabase } from '@/lib/supabase';

export interface VagaEmAberto {
    id_evento: number;
    quem_saiu: string;
    cargo_saiu: string;
    dias_em_aberto: number;
    cnpj: string;
}

export interface Analista {
    id: number;
    nome: string;
    cargo: string;
}

export interface AtribuicaoData {
    id_evento: number;
    id_analista: number;
    cnpj: string;
    // Campos opcionais para criação do evento em tempo real se não existir
    _id_funcionario?: number;
    _needs_creation?: boolean;
    data_evento?: string;
    situacao_origem?: string;
    // Campos auxiliares para criação
    nome?: string;
    cargo?: string;
    lotacao?: string;
}

export const atribuicaoService = {
    listarVagasEmAberto: async (): Promise<VagaEmAberto[]> => {
        const { data, error } = await supabase
            .from('vw_vagas_em_aberto_admin')
            .select('*');

        if (error) {
            throw new Error(`Erro ao listar vagas em aberto: ${error.message}`);
        }

        return data || [];
    },

    listarAnalistas: async (): Promise<Analista[]> => {
        // 1. Buscar IDs dos analistas na tabela de credenciais
        const { data: credenciais, error: errorCredenciais } = await supabase
            .from('analistas_credenciais')
            .select('id_funcionario');

        if (errorCredenciais) {
            console.error('Erro ao buscar credenciais:', errorCredenciais);
            throw new Error(`Erro ao buscar lista de analistas (credenciais): ${errorCredenciais.message}`);
        }

        if (!credenciais || credenciais.length === 0) {
            return [];
        }

        const ids = credenciais.map(c => c.id_funcionario).filter(id => id !== null);

        // 2. Buscar detalhes (nome, cargo) na tabela oris_funcionarios
        const { data, error } = await supabase
            .from('oris_funcionarios')
            .select('id, nome, cargo')
            .in('id', ids)
            .order('nome', { ascending: true });

        if (error) {
            console.error('Erro ao buscar detalhes dos analistas:', error);
            throw new Error(`Erro ao buscar detalhes dos analistas: ${error.message}`);
        }

        return data || [];
    },

    atribuirVaga: async (data: AtribuicaoData): Promise<number | void> => {
        let realIdEvento = data.id_evento;

        // Se marcado explicitamente como necessitando criação ou se suspeitarmos
        if (data._needs_creation && data._id_funcionario) {
            try {
                // Verificar se já existe
                const { data: existingEvent } = await supabase
                    .from('eventos_movimentacao')
                    .select('id_evento')
                    .eq('id_funcionario', data._id_funcionario)
                    .eq('data_evento', data.data_evento)
                    .eq('situacao_origem', data.situacao_origem)
                    .maybeSingle();

                if (existingEvent) {
                    realIdEvento = existingEvent.id_evento;
                } else {
                    // Criar evento
                    const { data: newEvent, error: createError } = await supabase
                        .from('eventos_movimentacao')
                        .insert({
                            id_funcionario: data._id_funcionario,
                            data_evento: data.data_evento,
                            situacao_origem: data.situacao_origem,
                            nome: data.nome,
                            cargo: data.cargo,
                            cnpj: data.cnpj,
                            // lotacao removed as it's not in the table
                            tipo_evento: data.situacao_origem === '99-Demitido' ? 'DEMISSAO' : 'AFASTAMENTO'
                        })
                        .select('id_evento')
                        .single();

                    if (createError) {
                        console.error('Erro ao criar evento on-the-fly:', createError);
                        throw new Error('Falha ao sincronizar evento. Tente novamente mais tarde.');
                    }
                    realIdEvento = newEvent.id_evento;
                }
            } catch (err) {
                console.error('Erro na lógica de criação de evento:', err);
                throw new Error(`Falha ao criar evento necessário para atribuição. Detalhes: ${(err as Error).message}`);
            }
        }

        const { error } = await supabase
            .from('vagas_analista')
            .upsert(
                {
                    id_evento: realIdEvento,
                    id_analista: data.id_analista,
                    cnpj: data.cnpj,
                    ativo: true
                },
                { onConflict: 'id_evento,id_analista', ignoreDuplicates: true }
            );

        if (error) {
            // 23505 = unique violation: já atribuído, trata como sucesso silencioso
            if (error.code === '23505') {
                return realIdEvento;
            }
            // FK violation: id_evento é um fallback (oris.id) que não existe em eventos_movimentacao.
            // Tentar recuperar o evento real buscando pelo id_funcionario.
            if (error.code === '23503') {
                const funcId = data._id_funcionario ?? realIdEvento;
                const { data: eventoReal } = await supabase
                    .from('eventos_movimentacao')
                    .select('id_evento')
                    .eq('id_funcionario', funcId)
                    .eq('tipo_evento', 'AFASTAMENTO')
                    .order('data_evento', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (eventoReal) {
                    const { error: retryError } = await supabase
                        .from('vagas_analista')
                        .upsert(
                            {
                                id_evento: eventoReal.id_evento,
                                id_analista: data.id_analista,
                                cnpj: data.cnpj,
                                ativo: true
                            },
                            { onConflict: 'id_evento,id_analista', ignoreDuplicates: true }
                        );
                    // 23505 = já atribuído, tudo bem
                    if (!retryError || retryError.code === '23505') {
                        return eventoReal.id_evento;
                    }
                }
            }
            throw new Error(`Erro ao atribuir vaga: ${error.message}`);
        }

        return realIdEvento;
    }
};
