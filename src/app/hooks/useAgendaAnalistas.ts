import { useState, useCallback, useEffect } from 'react';
import {
  carregarAgendaAnalistas,
  desatribuirVaga,
  AnalistaComVagas,
} from '@/app/services/agendaAnalistasService';

export function useAgendaAnalistas() {
  const [analistas, setAnalistas] = useState<AnalistaComVagas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dados = await carregarAgendaAnalistas();
      setAnalistas(dados);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao carregar agenda:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const removerVaga = useCallback(async (idEvento: number, idAnalista: number) => {
    try {
      await desatribuirVaga(idEvento, idAnalista);
      // Atualizar estado localmente
      setAnalistas(prev =>
        prev
          .map(a => {
            if (a.id !== idAnalista) return a;
            const vaga = a.vagas.find(v => v.id_evento === idEvento);
            const estaAberta = vaga?.vaga_preenchida !== 'SIM';
            const estaFechada = vaga?.vaga_preenchida === 'SIM';
            const ehCritica = (vaga?.dias_reais ?? 0) >= 45;
            return {
              ...a,
              vagas: a.vagas.filter(v => v.id_evento !== idEvento),
              totalVagas: a.totalVagas - 1,
              vagasEmAberto: a.vagasEmAberto - (estaAberta ? 1 : 0),
              vagasFechadas: a.vagasFechadas - (estaFechada ? 1 : 0),
              vagasCriticas: a.vagasCriticas - (ehCritica ? 1 : 0),
            };
          })
          .filter(a => a.totalVagas > 0)
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao remover vaga';
      setError(errorMessage);
      console.error('Erro ao remover vaga:', err);
    }
  }, []);

  // Carregar dados ao montar o componente
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Métricas gerais
  const totalAnalistas = analistas.length;
  const totalVagas = analistas.reduce((sum, a) => sum + a.totalVagas, 0);
  const totalVagasEmAberto = analistas.reduce((sum, a) => sum + a.vagasEmAberto, 0);
  const totalVagasCriticas = analistas.reduce((sum, a) => sum + a.vagasCriticas, 0);

  return {
    analistas,
    loading,
    error,
    carregarDados,
    removerVaga,
    totalAnalistas,
    totalVagas,
    totalVagasEmAberto,
    totalVagasCriticas,
  };
}
