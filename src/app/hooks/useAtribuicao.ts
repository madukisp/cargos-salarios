
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
        onSuccess: async (realIdEvento, variables) => {
            // Se realIdEvento for retornado (porque foi criado ou corrigido), usa-o. Senão usa o original.
            const idEventoFinal = typeof realIdEvento === 'number' ? realIdEvento : variables.id_evento;

            console.log('[EMAIL DEBUG] Iniciando envio de email após atribuição. ID Evento:', idEventoFinal, 'ID Analista:', variables.id_analista);
            queryClient.invalidateQueries({ queryKey: ['vagas-em-aberto'] });

            // Buscar dados do analista e da vaga para enviar email
            try {
                // 1. Buscar dados do analista
                console.log('[EMAIL DEBUG] Buscando dados do analista...');
                let analista = null;

                // Tenta buscar o email na tabela de credenciais (onde o usuário disse que está)
                const { data: credenciais, error: errorCredenciais } = await supabase
                    .from('analistas_credenciais')
                    .select('email')
                    .eq('id_funcionario', variables.id_analista)
                    .maybeSingle();

                // Busca dados do funcionário (nome, cargo)
                const { data: analistaOris, error: errorOris } = await supabase
                    .from('oris_funcionarios')
                    .select('nome, cargo')
                    .eq('id', variables.id_analista)
                    .maybeSingle();

                if (credenciais && analistaOris) {
                    analista = {
                        nome: analistaOris.nome,
                        cargo: analistaOris.cargo,
                        email: credenciais.email
                    };
                } else if (analistaOris && !credenciais) {
                     // Fallback: tentar email do oris se não achou nas credenciais (improvável dado o erro anterior, mas seguro)
                     const { data: orisFull } = await supabase
                        .from('oris_funcionarios')
                        .select('email, email_corporativo')
                        .eq('id', variables.id_analista)
                        .maybeSingle();
                     
                     if (orisFull) {
                        analista = {
                            nome: analistaOris.nome,
                            cargo: analistaOris.cargo,
                            email: orisFull.email_corporativo || orisFull.email
                        };
                     }
                }

                if (!analista || !analista.email) {
                    console.error('[EMAIL DEBUG] Analista não encontrado ou sem email válido:', { credenciais, analistaOris, errorCredenciais, errorOris });
                    return;
                }


                console.log('[EMAIL DEBUG] Analista encontrado:', analista);

                // 2. Buscar dados da vaga
                console.log('[EMAIL DEBUG] Buscando dados da vaga com ID:', idEventoFinal);
                // Tenta buscar na view pública primeiro
                let vaga = null;
                const { data: vagaView, error: vagaError } = await supabase
                    .from('eventos_gestao_vagas_public')
                    .select('nome, cargo, dias_em_aberto, data_evento')
                    .eq('id_evento', idEventoFinal)
                    .single();

                // 1ª tentativa: vagas de movimentação manual (tem IDs que podem colidir com a view)
                console.log('[EMAIL DEBUG] Tentando vagas_movimentacao primeiro...');
                const { data: vagaMov } = await supabase
                    .from('vagas_movimentacao')
                    .select('nome_funcionario, cargo, data_abertura')
                    .eq('id', idEventoFinal)
                    .maybeSingle();

                if (vagaMov) {
                    const diffTime = Math.abs(new Date().getTime() - new Date(vagaMov.data_abertura).getTime());
                    const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    vaga = {
                        nome: vagaMov.nome_funcionario,
                        cargo: vagaMov.cargo,
                        data_evento: vagaMov.data_abertura,
                        dias_em_aberto: dias,
                    };
                    console.log('[EMAIL DEBUG] Vaga encontrada em vagas_movimentacao:', vaga);
                } else if (vagaView) {
                    // 2ª tentativa: view pública (demissões/afastamentos)
                    vaga = vagaView;
                    console.log('[EMAIL DEBUG] Vaga encontrada na view pública:', vaga);
                } else {
                    // 3ª tentativa: eventos_movimentacao direto
                    console.log('[EMAIL DEBUG] Tentando eventos_movimentacao...', vagaError);
                    const { data: vagaRaw } = await supabase
                        .from('eventos_movimentacao')
                        .select('nome, cargo, data_evento')
                        .eq('id_evento', idEventoFinal)
                        .single();

                    if (vagaRaw) {
                        const diffTime = Math.abs(new Date().getTime() - new Date(vagaRaw.data_evento).getTime());
                        const dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        vaga = { ...vagaRaw, dias_em_aberto: dias };
                        console.log('[EMAIL DEBUG] Vaga encontrada em eventos_movimentacao:', vaga);
                    }
                }

                if (vagaError && !vaga) {
                    console.error('[EMAIL DEBUG] Erro ao buscar vaga em ambas as fontes:', vagaError);
                } else {
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
                        funcionario_saiu: vaga.nome || '-',
                        cargo_saiu: vaga.cargo || '-',
                        // Formatar a data para exibição (dd/mm/aaaa)
                        // Adicionamos T00:00:00 para evitar que o fuso horário local retroceda o dia em 1
                        data_abertura_vaga: new Date(vaga.data_evento + 'T00:00:00').toLocaleDateString('pt-BR'),
                        dias_em_aberto: vaga.dias_em_aberto || 0,
                        app_url: `${urlApp}` // Link geral para o app
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
