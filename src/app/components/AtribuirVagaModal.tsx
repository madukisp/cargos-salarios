import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { toast } from "sonner";
import { useAnalistas, useAtribuirVaga } from "@/app/hooks/useAtribuicao";
import { Loader2, Search, UserCheck, UserX } from "lucide-react";
import { supabase } from "@/lib/supabase";

const ANALISTA_INATIVO_ID = -999;

interface AtribuirVagaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaga?: {
        id_evento: number;
        quem_saiu: string;
        cargo_saiu: string;
        dias_em_aberto: number;
        cnpj: string;
        _id_funcionario?: number;
        _needs_creation?: boolean;
        data_evento?: string;
        situacao_origem?: string;
        nome?: string;
        cargo?: string;
        lotacao?: string;
        vaga_preenchida?: string | null;
    } | null;
    onMarcarInativo?: () => Promise<void>;
    onAtribuicaoCompleta?: () => void;
}

export function AtribuirVagaModal({ open, onOpenChange, vaga, onMarcarInativo, onAtribuicaoCompleta }: AtribuirVagaModalProps) {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [jaAtribuidos, setJaAtribuidos] = useState<Set<number>>(new Set());
    const [busca, setBusca] = useState("");
    const [isAtribuindo, setIsAtribuindo] = useState(false);
    const [loadingAtribuidos, setLoadingAtribuidos] = useState(false);

    const { data: analistas, isLoading: isLoadingAnalistas } = useAnalistas();
    const { mutateAsync: atribuir } = useAtribuirVaga();

    // Buscar atribuições existentes ao abrir o modal
    useEffect(() => {
        if (!open || !vaga?.id_evento) {
            setJaAtribuidos(new Set());
            setSelectedIds(new Set());
            return;
        }
        setLoadingAtribuidos(true);
        supabase
            .from('vagas_analista')
            .select('id_analista')
            .eq('id_evento', vaga.id_evento)
            .eq('ativo', true)
            .then(({ data }) => {
                const ids = new Set((data || []).map((r: any) => r.id_analista as number));
                setJaAtribuidos(ids);
                setSelectedIds(new Set(ids)); // pré-marcar os já atribuídos
            })
            .finally(() => setLoadingAtribuidos(false));
    }, [open, vaga?.id_evento]);

    const analistasFiltrados = (analistas || []).filter(a =>
        !busca.trim() || a.nome.toLowerCase().includes(busca.toLowerCase())
    );

    const toggleAnalista = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (id === ANALISTA_INATIVO_ID) {
                // Selecionar inativo limpa todos os analistas reais
                if (next.has(ANALISTA_INATIVO_ID)) {
                    next.delete(ANALISTA_INATIVO_ID);
                } else {
                    next.clear();
                    next.add(ANALISTA_INATIVO_ID);
                }
            } else {
                // Selecionar analista real limpa a opção inativo
                next.delete(ANALISTA_INATIVO_ID);
                if (next.has(id)) next.delete(id);
                else next.add(id);
            }
            return next;
        });
    };

    const handleClose = () => {
        setSelectedIds(new Set());
        setBusca("");
        onOpenChange(false);
    };

    const handleConfirm = async () => {
        if (!vaga) return;

        // Caso: marcar como analista inativo (arquivar a vaga)
        if (selectedIds.has(ANALISTA_INATIVO_ID)) {
            if (!onMarcarInativo) {
                toast.error("Ação não disponível.");
                return;
            }
            setIsAtribuindo(true);
            try {
                await onMarcarInativo();
                onAtribuicaoCompleta?.();
                toast.success("Vaga arquivada com sucesso.");
                handleClose();
            } catch (error: any) {
                toast.error(`Erro ao arquivar vaga: ${error.message}`);
            } finally {
                setIsAtribuindo(false);
            }
            return;
        }

        // Apenas analistas novos (não estavam atribuídos antes)
        const novos = Array.from(selectedIds).filter(id => !jaAtribuidos.has(id));

        if (novos.length === 0) {
            toast.info("Nenhum analista novo selecionado.");
            return;
        }

        setIsAtribuindo(true);
        try {
            let realIdEvento = vaga.id_evento;

            // Primeira atribuição (pode criar o evento se necessário)
            const retorno = await atribuir({
                id_evento: realIdEvento,
                id_analista: novos[0],
                cnpj: vaga.cnpj || "",
                _id_funcionario: vaga._id_funcionario,
                _needs_creation: vaga._needs_creation,
                data_evento: vaga.data_evento,
                situacao_origem: vaga.situacao_origem,
                nome: vaga.nome,
                cargo: vaga.cargo,
                lotacao: vaga.lotacao,
            });
            if (typeof retorno === "number") realIdEvento = retorno;

            // Atribuições restantes
            for (const id of novos.slice(1)) {
                await atribuir({
                    id_evento: realIdEvento,
                    id_analista: id,
                    cnpj: vaga.cnpj || "",
                });
            }

            const plural = novos.length > 1 ? `${novos.length} analistas` : "1 analista";
            onAtribuicaoCompleta?.();
            toast.success(`Vaga atribuída para ${plural} com sucesso!`);
            handleClose();
        } catch (error: any) {
            toast.error(`Erro ao atribuir vaga: ${error.message}`);
        } finally {
            setIsAtribuindo(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Atribuir Vaga a Analista</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Selecione um ou mais analistas responsáveis por esta vaga.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 max-w-full overflow-x-hidden">
                    {/* Info da vaga */}
                    <div className="space-y-2">
                        <label className={`text-[10px] font-bold uppercase tracking-widest ml-1 ${vaga?.vaga_preenchida === 'SIM' ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`}>
                            {vaga?.vaga_preenchida === 'SIM' ? 'Vaga Fechada' : 'Vaga em Aberto'}
                        </label>
                        {vaga ? (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 text-sm space-y-2 w-full shadow-sm overflow-hidden">
                                <div className="flex gap-2">
                                    <span className="font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 uppercase text-[10px] mt-0.5">Quem saiu:</span>
                                    <span className="text-slate-900 dark:text-slate-100 font-medium break-words overflow-hidden">{vaga.quem_saiu}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 uppercase text-[10px] mt-0.5">Cargo:</span>
                                    <span className="text-slate-800 dark:text-slate-200 break-words overflow-hidden">{vaga.cargo_saiu}</span>
                                </div>
                                <div className="flex gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 mt-2">
                                    <span className="font-bold text-slate-500 dark:text-slate-400 flex-shrink-0 uppercase text-[10px] mt-0.5">Dias em aberto:</span>
                                    <span className="text-purple-600 dark:text-purple-400 font-bold">{vaga.dias_em_aberto} dias</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-destructive italic p-4 border border-dashed rounded-xl bg-red-50/50 dark:bg-red-900/10">
                                Nenhuma vaga selecionada.
                            </div>
                        )}
                    </div>

                    {/* Lista de analistas com checkboxes */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                                Analistas Responsáveis
                            </label>
                            <div className="flex items-center gap-2">
                                {jaAtribuidos.size > 0 && (
                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                        {jaAtribuidos.size} já atribuído{jaAtribuidos.size > 1 ? "s" : ""}
                                    </span>
                                )}
                                {Array.from(selectedIds).filter(id => !jaAtribuidos.has(id)).length > 0 && (
                                    <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                                        +{Array.from(selectedIds).filter(id => !jaAtribuidos.has(id)).length} novo{Array.from(selectedIds).filter(id => !jaAtribuidos.has(id)).length > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Campo de busca */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar analista..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Lista scrollável */}
                        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto max-h-52 bg-white dark:bg-slate-800">
                            {/* Opção especial: Analista Inativo */}
                            {onMarcarInativo && (
                                <label
                                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-orange-200 dark:border-orange-800/50 transition-colors ${selectedIds.has(ANALISTA_INATIVO_ID) ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-orange-50/50 dark:hover:bg-orange-900/10'}`}
                                >
                                    <Checkbox
                                        checked={selectedIds.has(ANALISTA_INATIVO_ID)}
                                        onCheckedChange={() => toggleAnalista(ANALISTA_INATIVO_ID)}
                                        className="flex-shrink-0 border-orange-400 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <UserX className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                            <p className="text-sm font-semibold text-orange-700 dark:text-orange-400 truncate">Analista Inativo</p>
                                        </div>
                                        <p className="text-xs text-orange-500/80 dark:text-orange-400/70 truncate">
                                            Arquivar esta vaga
                                        </p>
                                    </div>
                                </label>
                            )}
                            {isLoadingAnalistas || loadingAtribuidos ? (
                                <div className="flex items-center justify-center py-6 text-slate-400 text-sm gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Carregando...
                                </div>
                            ) : analistasFiltrados.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-sm">
                                    Nenhum analista encontrado.
                                </div>
                            ) : (
                                analistasFiltrados.map(analista => {
                                    const jaAtribuido = jaAtribuidos.has(analista.id);
                                    return (
                                        <label
                                            key={analista.id}
                                            className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors ${jaAtribuido ? 'bg-green-50/50 dark:bg-green-900/10 hover:bg-green-50 dark:hover:bg-green-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                        >
                                            <Checkbox
                                                checked={selectedIds.has(analista.id)}
                                                onCheckedChange={() => toggleAnalista(analista.id)}
                                                className="flex-shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{analista.nome}</p>
                                                    {jaAtribuido && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded flex-shrink-0">
                                                            <UserCheck className="w-3 h-3" />
                                                            Já atribuído
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{analista.cargo}</p>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={handleClose} disabled={isAtribuindo}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className={`flex-1 text-white ${selectedIds.has(ANALISTA_INATIVO_ID) ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700'}`}
                        disabled={isAtribuindo || !vaga || selectedIds.size === 0}
                    >
                        {isAtribuindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {(() => {
                            if (selectedIds.has(ANALISTA_INATIVO_ID)) return "Arquivar Vaga";
                            const novos = Array.from(selectedIds).filter(id => !jaAtribuidos.has(id)).length;
                            return novos > 1 ? `Atribuir para ${novos} novos` : "Confirmar Atribuição";
                        })()}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
