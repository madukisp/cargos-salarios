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
            cnpj: vaga.cnpj || ""
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
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Atribuir Vaga a Analista</DialogTitle>
                    <DialogDescription>
                        Selecione o analista responsável por esta vaga.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Vaga em Aberto
                        </label>
                        {vaga ? (
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm space-y-1">
                                <p><span className="font-semibold">Quem saiu:</span> {vaga.quem_saiu}</p>
                                <p><span className="font-semibold">Cargo:</span> {vaga.cargo_saiu}</p>
                                <p><span className="font-semibold">Dias em aberto:</span> {vaga.dias_em_aberto} dias</p>
                            </div>
                        ) : (
                            <div className="text-sm text-destructive">Nenhuma vaga selecionada.</div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Analista
                        </label>
                        <Select value={selectedAnalistaId} onValueChange={setSelectedAnalistaId} disabled={isLoadingAnalistas}>
                            <SelectTrigger>
                                <SelectValue placeholder={isLoadingAnalistas ? "Carregando..." : "Selecione o analista"} />
                            </SelectTrigger>
                            <SelectContent>
                                {analistas?.map((analista) => (
                                    <SelectItem key={analista.id} value={analista.id.toString()}>
                                        {analista.nome} - {analista.cargo}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAtribuindo}>
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirm} disabled={isAtribuindo || !vaga || !selectedAnalistaId}>
                        {isAtribuindo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar Atribuição
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
