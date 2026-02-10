
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

    atribuirVaga: async ({ id_evento, id_analista, cnpj }: AtribuicaoData): Promise<void> => {
        const { error } = await supabase
            .from('vagas_analista')
            .insert({
                id_evento,
                id_analista,
                cnpj,
                ativo: true // Explicitly setting active as per requirement, though default might be true
            });

        if (error) {
            throw new Error(`Erro ao atribuir vaga: ${error.message}`);
        }
    }
};
