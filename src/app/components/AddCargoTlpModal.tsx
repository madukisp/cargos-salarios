import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useCargosList } from '@/app/hooks/useCargosList';
import { useCentroCustoList } from '@/app/hooks/useCentroCustoList';
import { useCargaHorariaList } from '@/app/hooks/useCargaHorariaList';

interface AddCargoTlpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCargoTlpModal({ open, onOpenChange, onSuccess }: AddCargoTlpModalProps) {
  const { cargos, loading: loadingCargos, filterCargos } = useCargosList();
  const { centrosCusto, loading: loadingCentros, filterCentrosCusto } = useCentroCustoList();
  const { cargasHorarias, loading: loadingCargas, filterCargasHorarias } = useCargaHorariaList();

  const [cargo, setCargo] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [cargaHoraria, setCargaHoraria] = useState('');
  const [anotacoes, setAnotacoes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Combobox states
  const [isCargoOpen, setIsCargoOpen] = useState(false);
  const [cargoSuggestions, setCargoSuggestions] = useState<string[]>([]);
  const cargoWrapperRef = useRef<HTMLDivElement>(null);

  const [isCentroOpen, setIsCentroOpen] = useState(false);
  const [centroSuggestions, setCentroSuggestions] = useState<string[]>([]);
  const centroWrapperRef = useRef<HTMLDivElement>(null);

  const [isCargaOpen, setIsCargaOpen] = useState(false);
  const [cargaSuggestions, setCargaSuggestions] = useState<string[]>([]);
  const cargaWrapperRef = useRef<HTMLDivElement>(null);

  // Handle click outside comboboxes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cargoWrapperRef.current && !cargoWrapperRef.current.contains(event.target as Node)) {
        setIsCargoOpen(false);
      }
      if (centroWrapperRef.current && !centroWrapperRef.current.contains(event.target as Node)) {
        setIsCentroOpen(false);
      }
      if (cargaWrapperRef.current && !cargaWrapperRef.current.contains(event.target as Node)) {
        setIsCargaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cargo handlers
  const handleCargoChange = (value: string) => {
    setCargo(value);
    setIsCargoOpen(true);

    if (value.trim()) {
      const filtered = filterCargos(value);
      setCargoSuggestions(filtered);
    } else {
      setCargoSuggestions(cargos.slice(0, 10));
    }
  };

  const handleSelectCargo = (selectedCargo: string) => {
    setCargo(selectedCargo);
    setIsCargoOpen(false);
    setCargoSuggestions([]);
  };

  // Centro de Custo handlers
  const handleCentroChange = (value: string) => {
    setCentroCusto(value);
    setIsCentroOpen(true);

    if (value.trim()) {
      const filtered = filterCentrosCusto(value);
      setCentroSuggestions(filtered);
    } else {
      setCentroSuggestions(centrosCusto.slice(0, 10));
    }
  };

  const handleSelectCentro = (selectedCentro: string) => {
    setCentroCusto(selectedCentro);
    setIsCentroOpen(false);
    setCentroSuggestions([]);
  };

  // Carga Horária handlers
  const handleCargaChange = (value: string) => {
    setCargaHoraria(value);
    setIsCargaOpen(true);

    if (value.trim()) {
      const filtered = filterCargasHorarias(value);
      setCargaSuggestions(filtered);
    } else {
      setCargaSuggestions(cargasHorarias.slice(0, 10));
    }
  };

  const handleSelectCarga = (selectedCarga: string) => {
    setCargaHoraria(selectedCarga);
    setIsCargaOpen(false);
    setCargaSuggestions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validações
    if (!cargo.trim()) {
      setErrorMessage('O campo "Cargo" é obrigatório');
      return;
    }

    if (!centroCusto.trim()) {
      setErrorMessage('O campo "Centro de Custo" é obrigatório');
      return;
    }

    const qtd = parseInt(quantidade);
    if (isNaN(qtd) || qtd < 0) {
      setErrorMessage('A quantidade deve ser um número válido (≥ 0)');
      return;
    }

    // Optional: validate carga horária
    if (cargaHoraria && (isNaN(parseFloat(cargaHoraria)) || parseFloat(cargaHoraria) <= 0)) {
      setErrorMessage('A carga horária deve ser um número válido (> 0)');
      return;
    }

    try {
      setIsSaving(true);

      // Inserir na tabela
      const { error } = await supabase
        .from('tlp_quadro_necessario')
        .insert({
          cargo: cargo.trim(),
          centro_custo: centroCusto.trim(),
          quantidade_necessaria_ativos: qtd,
          carga_horaria_semanal: cargaHoraria ? parseFloat(cargaHoraria) : null,
          anotacoes: anotacoes.trim() || null,
          arquivado: false
        });

      if (error) throw error;

      toast.success('Cargo adicionado com sucesso!');
      resetForm();
      onOpenChange(false);
      onSuccess(); // Reload TLP data
    } catch (err: any) {
      console.error('Erro ao adicionar cargo:', err);
      setErrorMessage(err.message || 'Erro ao adicionar cargo');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setCargo('');
    setCentroCusto('');
    setQuantidade('');
    setCargaHoraria('');
    setAnotacoes('');
    setErrorMessage('');
  };

  const handleCancel = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cargo à TLP</DialogTitle>
          <DialogDescription>
            Preencha os dados do novo cargo para adicionar à Tabela de Lotação de Pessoal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Cargo Combobox */}
            <div className="grid gap-2">
              <Label htmlFor="cargo">
                Cargo <span className="text-red-500">*</span>
              </Label>
              <div ref={cargoWrapperRef} className="relative">
                <div className="relative">
                  <Input
                    id="cargo"
                    type="text"
                    placeholder="Digite para buscar um cargo..."
                    value={cargo}
                    onChange={(e) => handleCargoChange(e.target.value)}
                    onFocus={() => {
                      setIsCargoOpen(true);
                      if (cargo.trim()) {
                        const filtered = filterCargos(cargo);
                        setCargoSuggestions(filtered);
                      } else {
                        setCargoSuggestions(cargos.slice(0, 10)); // Mostra primeiros 10
                      }
                    }}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none flex items-center justify-center">
                    {loadingCargos ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Dropdown de Sugestões */}
                {isCargoOpen && !loadingCargos && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {cargoSuggestions.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500 text-center">
                        {cargo.trim() ? 'Nenhum cargo encontrado.' : 'Nenhum cargo disponível.'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {cargoSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectCargo(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                          >
                            <span>{suggestion}</span>
                            {cargo.toUpperCase() === suggestion && (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isCargoOpen && loadingCargos && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg p-2 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando cargos...
                  </div>
                )}
              </div>
            </div>

            {/* Centro de Custo Combobox */}
            <div className="grid gap-2">
              <Label htmlFor="centro_custo">
                Centro de Custo <span className="text-red-500">*</span>
              </Label>
              <div ref={centroWrapperRef} className="relative">
                <div className="relative">
                  <Input
                    id="centro_custo"
                    type="text"
                    placeholder="Digite para buscar um centro de custo..."
                    value={centroCusto}
                    onChange={(e) => handleCentroChange(e.target.value)}
                    onFocus={() => {
                      setIsCentroOpen(true);
                      if (centroCusto.trim()) {
                        const filtered = filterCentrosCusto(centroCusto);
                        setCentroSuggestions(filtered);
                      } else {
                        setCentroSuggestions(centrosCusto.slice(0, 10));
                      }
                    }}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none flex items-center justify-center">
                    {loadingCentros ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Dropdown de Sugestões */}
                {isCentroOpen && !loadingCentros && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {centroSuggestions.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500 text-center">
                        {centroCusto.trim() ? 'Nenhum centro encontrado.' : 'Nenhum centro disponível.'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {centroSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectCentro(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                          >
                            <span>{suggestion}</span>
                            {centroCusto === suggestion && (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isCentroOpen && loadingCentros && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg p-2 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                  </div>
                )}
              </div>
            </div>

            {/* Quantidade */}
            <div className="grid gap-2">
              <Label htmlFor="quantidade">
                Quantidade Necessária <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantidade"
                type="number"
                min="0"
                placeholder="Ex: 5"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
              />
            </div>

            {/* Carga Horária Semanal Combobox (opcional) */}
            <div className="grid gap-2">
              <Label htmlFor="carga_horaria">
                Carga Horária Semanal (opcional)
              </Label>
              <div ref={cargaWrapperRef} className="relative">
                <div className="relative">
                  <Input
                    id="carga_horaria"
                    type="text"
                    placeholder="Digite para buscar uma carga horária..."
                    value={cargaHoraria}
                    onChange={(e) => handleCargaChange(e.target.value)}
                    onFocus={() => {
                      setIsCargaOpen(true);
                      if (cargaHoraria.trim()) {
                        const filtered = filterCargasHorarias(cargaHoraria);
                        setCargaSuggestions(filtered);
                      } else {
                        setCargaSuggestions(cargasHorarias.slice(0, 10));
                      }
                    }}
                    className="pr-10"
                  />
                  <div className="absolute right-3 top-2.5 h-4 w-4 opacity-50 pointer-events-none flex items-center justify-center">
                    {loadingCargas ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {/* Dropdown de Sugestões */}
                {isCargaOpen && !loadingCargas && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {cargaSuggestions.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500 text-center">
                        {cargaHoraria.trim() ? 'Nenhuma carga encontrada.' : 'Nenhuma carga disponível.'}
                      </div>
                    ) : (
                      <div className="py-1">
                        {cargaSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectCarga(suggestion)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group"
                          >
                            <span>{suggestion}h</span>
                            {cargaHoraria === suggestion && (
                              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {isCargaOpen && loadingCargas && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md shadow-lg p-2 text-sm text-slate-500 text-center flex items-center justify-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
                  </div>
                )}
              </div>
            </div>

            {/* Anotações (opcional) */}
            <div className="grid gap-2">
              <Label htmlFor="anotacoes">
                Anotações (opcional)
              </Label>
              <Textarea
                id="anotacoes"
                placeholder="Informações adicionais..."
                rows={3}
                value={anotacoes}
                onChange={(e) => setAnotacoes(e.target.value)}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Salvando...' : 'Adicionar Cargo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
