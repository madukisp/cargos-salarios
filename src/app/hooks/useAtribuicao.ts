
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { atribuicaoService, AtribuicaoData } from '../services/atribuicaoService';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['vagas-em-aberto'] });
        }
    });
}
