
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { atribuicaoService, AtribuicaoData } from '../services/atribuicaoService';

import { enviarNotificacaoVaga, obterUrlAplicacao } from '../services/emailService';
import { supabase } from '@/lib/supabase';

export function useVagasEmAberto() {
    return useQuery({
        queryKey: ['vagas-em-aberto'],
        queryFn: atribuicaoService.listarVagasEmAberto
    });
}

export function useAnalistas() {
    return useQuery({
        queryKey: ['analistas'],
        queryFn: atribuicaoService.listarAnalistas
    });
}

export function useAtribuirVaga() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: AtribuicaoData) => atribuicaoService.atribuirVaga(data),
        onSuccess: async (_, variables) => {
            console.log('[EMAIL DEBUG] Iniciando envio de email após atribuição. ID Evento:', variables.id_evento, 'ID Analista:', variables.id_analista);
            queryClient.invalidateQueries({ queryKey: ['vagas-em-aberto'] });

            // Buscar dados do analista e da vaga para enviar email
            try {
                // 1. Buscar dados do analista
                console.log('[EMAIL DEBUG] Buscando dados do analista...');
                const { data: analista, error: analistaError } = await supabase
                    .from('oris_funcionarios')
                    .select('nome, cargo, email')
                    .eq('id', variables.id_analista)
                    .single();

                if (analistaError) {
                    console.error('[EMAIL DEBUG] Erro ao buscar analista:', analistaError);
                } else {
                    console.log('[EMAIL DEBUG] Analista encontrado:', analista);
                }

                // 2. Buscar dados da vaga
                console.log('[EMAIL DEBUG] Buscando dados da vaga...');
                const { data: vaga, error: vagaError } = await supabase
                    .from('vw_vagas_em_aberto_admin')
                    .select('*')
                    .eq('id_evento', variables.id_evento)
                    .single();

                if (vagaError) {
                    console.error('[EMAIL DEBUG] Erro ao buscar vaga:', vagaError);
                } else {
                    console.log('[EMAIL DEBUG] Vaga encontrada. Campos disponíveis:', Object.keys(vaga || {}));
                    console.log('[EMAIL DEBUG] Dados da vaga:', vaga);
                }

                if (analista && vaga && analista.email) {
                    console.log('[EMAIL DEBUG] Preparando envio de email...');
                    const urlApp = obterUrlAplicacao();
                    const result = await enviarNotificacaoVaga({
                        type: 'atribuicao',
                        analista_email: analista.email,
                        analista_nome: analista.nome,
                        analista_cargo: analista.cargo,
                        funcionario_saiu: vaga.quem_saiu || '-',
                        cargo_saiu: vaga.cargo_saiu || '-',
                        data_abertura_vaga: vaga.data_abertura_vaga || new Date().toISOString(),
                        dias_em_aberto: vaga.dias_em_aberto || 0,
                        app_url: `${urlApp}/minhas-vagas`
                    });
                    console.log('[EMAIL DEBUG] Resultado do envio:', result);
                } else {
                    console.warn('[EMAIL DEBUG] Dados incompletos para envio de email:', {
                        temAnalista: !!analista,
                        temVaga: !!vaga,
                        temEmail: analista?.email ? 'SIM' : 'NÃO'
                    });
                }
            } catch (err) {
                console.error('[EMAIL DEBUG] Erro ao enviar email de atribuição:', err);
                // Não falha a operação principal se o email falhar
            }
        }
    });
}
