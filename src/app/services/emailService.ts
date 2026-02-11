import { supabase } from '@/lib/supabase'

export interface VagaNotificationData {
    type: 'atribuicao' | 'remocao'
    analista_email: string
    analista_nome: string
    analista_cargo: string
    funcionario_saiu: string
    cargo_saiu: string
    data_abertura_vaga: string
    dias_em_aberto: number
    app_url: string
}

/**
 * Envia notificação de e-mail quando uma vaga é atribuída ou removida de um analista
 */
export async function enviarNotificacaoVaga(dados: VagaNotificationData): Promise<boolean> {
    try {
        // Chamar a Edge Function do Supabase
        const { data, error } = await supabase.functions.invoke('send-vaga-notification', {
            body: dados,
        })

        if (error) {
            console.error('Erro ao chamar Edge Function:', error)
            return false
        }

        if (!data?.success) {
            console.error('Erro na Edge Function:', data?.error)
            return false
        }


        return true
    } catch (err) {
        console.error('Erro ao enviar notificação de vaga:', err)
        return false
    }
}

/**
 * Calcula o URL da aplicação (baseado no ambiente)
 */
export function obterUrlAplicacao(): string {
    // Em desenvolvimento: http://localhost:5173
    // Em produção: Usar a URL atual ou fallback
    if (typeof window !== 'undefined') {
        const origin = window.location.origin
        return origin
    }
    return 'http://localhost:5173'
}
