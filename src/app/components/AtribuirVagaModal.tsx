import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/app/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { toast } from "sonner";
import { useAnalistas, useAtribuirVaga } from "@/app/hooks/useAtribuicao";
import { Loader2 } from "lucide-react";

interface AtribuirVagaModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vaga?: {
        id_evento: number;
        quem_saiu: string;
        cargo_saiu: string;
        dias_em_aberto: number;
        cnpj: string;
        // Optional fields for event creation
        _id_funcionario?: number;
        _needs_creation?: boolean;
        data_evento?: string;
        situacao_origem?: string;
        nome?: string;
        cargo?: string;
        lotacao?: string;
    } | null;
}

export function AtribuirVagaModal({ open, onOpenChange, vaga }: AtribuirVagaModalProps) {
    const [selectedAnalistaId, setSelectedAnalistaId] = useState<string>("");

    const { data: analistas, isLoading: isLoadingAnalistas } = useAnalistas();
    const { mutate: atribuir, isPending: isAtribuindo } = useAtribuirVaga();

    const handleConfirm = () => {
        if (!vaga || !selectedAnalistaId) {
            toast.error("Selecione um analista.");
            return;
        }

        atribuir({
            id_evento: vaga.id_evento,
            id_analista: parseInt(selectedAnalistaId),
            cnpj: vaga.cnpj || "",
            // Passar campos extras para a criação sob demanda
            _id_funcionario: vaga._id_funcionario,
            _needs_creation: vaga._needs_creation,
            data_evento: vaga.data_evento,
            situacao_origem: vaga.situacao_origem,
            nome: vaga.nome,
            cargo: vaga.cargo,
            lotacao: vaga.lotacao
        }, {
            onSuccess: () => {
                toast.success("Vaga atribuída com sucesso!");
                onOpenChange(false);
                setSelectedAnalistaId("");
            },
            onError: (error: Error) => {
                toast.error(`Erro ao atribuir vaga: ${error.message}`);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg overflow-hidden border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                <DialogHeader className="px-6 pt-6">
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">Atribuir Vaga a Analista</DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-400">
                        Selecione o analista responsável por esta vaga.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4 max-w-full overflow-x-hidden">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 ml-1">
                            Vaga em Aberto
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

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 ml-1">
                            Analista Responsável
                        </label>
                        <Select value={selectedAnalistaId} onValueChange={setSelectedAnalistaId} disabled={isLoadingAnalistas}>
                            <SelectTrigger className="w-full h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder={isLoadingAnalistas ? "Carregando..." : "Selecione o analista"} />
                            </SelectTrigger>
                            <SelectContent className="max-h-52 overflow-y-auto w-[var(--radix-select-trigger-width)]">
                                {analistas?.map((analista) => (
                                    <SelectItem key={analista.id} value={analista.id.toString()}>
                                        <div className="flex flex-col py-0.5">
                                            <span className="font-medium">{analista.nome}</span>
                                            <span className="text-[10px] text-slate-500">{analista.cargo}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={() => onOpenChange(false)} disabled={isAtribuindo}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white" disabled={isAtribuindo || !vaga || !selectedAnalistaId}>
                        {isAtribuindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Atribuição
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
