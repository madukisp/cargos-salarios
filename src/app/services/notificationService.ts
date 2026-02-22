import { carregarDemissoes, carregarAfastamentos } from './demissoesService';
import { Notification } from '../contexts/NotificationContext';
import { supabase } from '@/lib/supabase';

interface CachedEventos {
  demissoes: Map<number, string>; // id_evento -> nome
  afastamentos: Map<number, string>; // id_evento -> nome
  timestamp: number;
}

let cache: CachedEventos = {
  demissoes: new Map(),
  afastamentos: new Map(),
  timestamp: 0,
};

const INTERVALO_VERIFICACAO = 30000; // 30 segundos
let intervaloAtivo = false;

/**
 * Carrega dados iniciais do cache
 */
export async function inicializarCache(): Promise<void> {
  try {
    const demissoes = await carregarDemissoes('TODAS', 'PENDENTE', 'todos');
    const afastamentos = await carregarAfastamentos('TODAS', 'todos');

    demissoes.forEach(d => {
      cache.demissoes.set(d.id_evento, d.nome);
    });

    afastamentos.forEach(a => {
      cache.afastamentos.set(a.id_evento, a.nome);
    });

    cache.timestamp = Date.now();
  } catch (error) {
    console.error('[notificationService] Erro ao inicializar cache:', error);
  }
}

/**
 * Verifica por novas demissões e afastamentos
 */
export async function verificarNovasNotificacoes(
  onNovaNotificacao: (notif: Omit<Notification, 'id' | 'timestamp'>) => void
): Promise<void> {
  try {
    const demissoes = await carregarDemissoes('TODAS', 'PENDENTE', 'todos');
    const afastamentos = await carregarAfastamentos('TODAS', 'todos');

    // Verificar novas demissões
    demissoes.forEach(d => {
      if (!cache.demissoes.has(d.id_evento)) {
        cache.demissoes.set(d.id_evento, d.nome);
        onNovaNotificacao({
          tipo: 'demissao',
          titulo: '🔴 Nova Demissão',
          mensagem: `${d.nome} foi demitido`,
          funcionario: d.nome,
          cargo: d.cargo,
          data: new Date().toLocaleDateString('pt-BR'),
        });
      }
    });

    // Verificar novos afastamentos
    afastamentos.forEach(a => {
      if (!cache.afastamentos.has(a.id_evento)) {
        cache.afastamentos.set(a.id_evento, a.nome);
        onNovaNotificacao({
          tipo: 'afastamento',
          titulo: '🟡 Novo Afastamento',
          mensagem: `${a.nome} foi afastado`,
          funcionario: a.nome,
          cargo: a.cargo,
          data: new Date().toLocaleDateString('pt-BR'),
        });
      }
    });

    cache.timestamp = Date.now();
  } catch (error) {
    console.error('[notificationService] Erro ao verificar notificações:', error);
  }
}

/**
 * Inicia o monitoramento de novas notificações
 */
export function iniciarMonitoramento(
  onNovaNotificacao: (notif: Omit<Notification, 'id' | 'timestamp'>) => void
): () => void {
  if (intervaloAtivo) return () => {};

  intervaloAtivo = true;

  const intervalo = setInterval(() => {
    verificarNovasNotificacoes(onNovaNotificacao);
  }, INTERVALO_VERIFICACAO);

  // Retorna função para parar o monitoramento
  return () => {
    clearInterval(intervalo);
    intervaloAtivo = false;
  };
}

/**
 * Obtém a cor base para notificações
 */
export function obterCoresPorTipo(tipo: 'demissao' | 'afastamento') {
  return tipo === 'demissao'
    ? { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' }
    : { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', text: 'text-yellow-700 dark:text-yellow-400' };
}

/**
 * Retorna as últimas N vagas com detalhes (para debug/teste)
 */
export async function obterUltimasVagas(quantidade: number = 5) {
  try {
    // Pegar IDs das últimas vagas
    const ultimasDemissoes = Array.from(cache.demissoes.entries()).slice(-quantidade);
    const ultimosAfastamentos = Array.from(cache.afastamentos.entries()).slice(-quantidade);

    const todasVagas = [
      ...ultimasDemissoes.map(([id, nome]) => ({ id, nome, tipo: 'demissao' as const })),
      ...ultimosAfastamentos.map(([id, nome]) => ({ id, nome, tipo: 'afastamento' as const })),
    ].sort((a, b) => b.id - a.id).slice(0, quantidade);

    const nomes = todasVagas.map(v => v.nome);

    if (nomes.length === 0) return [];

    // Buscar detalhes de todos os funcionários
    const { data: funcionarios } = await supabase
      .from('oris_funcionarios')
      .select('nome, cargo, centro_custo')
      .in('nome', nomes);

    const mapaFuncionarios: Record<string, any> = {};
    (funcionarios || []).forEach((f: any) => {
      mapaFuncionarios[f.nome] = f;
    });

    return todasVagas.map(vaga => ({
      id_evento: vaga.id,
      nome: vaga.nome,
      tipo: vaga.tipo,
      cargo: mapaFuncionarios[vaga.nome]?.cargo || '-',
      centro_custo: mapaFuncionarios[vaga.nome]?.centro_custo || '-',
    }));
  } catch (error) {
    console.error('[notificationService] Erro ao buscar últimas vagas:', error);
    return [];
  }
}
