import { useState, useEffect } from 'react';
import { X, Search, Loader2, UserPlus, Users, AlertTriangle, PenLine } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';

interface Funcionario {
  id: number;
  nome: string;
  cargo: string;
  carga_horaria_semanal: string | null;
  escala: string | null;
  centro_custo: string | null;
}

interface OpcoesContrato {
  cargos: string[];
  escalas: string[];
  cargasHorarias: string[];
}

interface NovaVagaMovimentacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fantasias: { cnpj: string; display_name?: string; nome_fantasia?: string }[];
  onSaved: () => void;
}

export function NovaVagaMovimentacaoModal({
  open,
  onOpenChange,
  fantasias,
  onSaved,
}: NovaVagaMovimentacaoModalProps) {
  const [selectedCnpj, setSelectedCnpj] = useState('');
  const [centrosCusto, setCentrosCusto] = useState<string[]>([]);
  const [selectedCentroCusto, setSelectedCentroCusto] = useState('');
  const [buscaFuncionario, setBuscaFuncionario] = useState('');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState<Funcionario | null>(null);
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'PROMOCAO' | 'TRANSFERENCIA'>('TRANSFERENCIA');

  // Dados manuais
  const [dadosManuais, setDadosManuais] = useState(false);
  const [opcoesContrato, setOpcoesContrato] = useState<OpcoesContrato>({ cargos: [], escalas: [], cargasHorarias: [] });
  const [manualCargo, setManualCargo] = useState('');
  const [manualCargaHoraria, setManualCargaHoraria] = useState('');
  const [manualEscala, setManualEscala] = useState('');
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);

  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ao trocar contrato: carrega todos os funcionários ativos + centros de custo + opções
  useEffect(() => {
    if (!selectedCnpj) {
      setCentrosCusto([]);
      setSelectedCentroCusto('');
      setFuncionarios([]);
      setSelectedFuncionario(null);
      setOpcoesContrato({ cargos: [], escalas: [], cargasHorarias: [] });
      return;
    }
    setLoadingFuncionarios(true);
    setLoadingOpcoes(true);
    supabase
      .from('oris_funcionarios')
      .select('id, nome, cargo, carga_horaria_semanal, escala, centro_custo')
      .eq('cnpj', selectedCnpj)
      .eq('situacao', '01-ATIVO')
      .order('nome')
      .then(({ data }) => {
        const rows = (data || []) as Funcionario[];
        setFuncionarios(rows);
        setSelectedFuncionario(null);
        setLoadingFuncionarios(false);

        // Centros de custo únicos
        const uniqueCentros = Array.from(
          new Set(rows.map((r) => r.centro_custo).filter(Boolean))
        ).sort() as string[];
        setCentrosCusto(uniqueCentros);

        // Opções para dados manuais
        const cargos = Array.from(new Set(rows.map((r) => r.cargo).filter(Boolean))).sort() as string[];
        const escalas = Array.from(new Set(rows.map((r) => r.escala).filter(Boolean))).sort() as string[];
        const cargasHorarias = Array.from(
          new Set(rows.map((r) => r.carga_horaria_semanal).filter(Boolean))
        ).sort((a: any, b: any) => Number(a) - Number(b)) as string[];
        setOpcoesContrato({ cargos, escalas, cargasHorarias });
        setLoadingOpcoes(false);
      });
  }, [selectedCnpj]);

  // Ao selecionar funcionário, pré-preencher campos manuais e centro de custo
  useEffect(() => {
    if (selectedFuncionario) {
      setManualCargo(selectedFuncionario.cargo || '');
      setManualCargaHoraria(selectedFuncionario.carga_horaria_semanal || '');
      setManualEscala(selectedFuncionario.escala || '');
      if (selectedFuncionario.centro_custo) {
        setSelectedCentroCusto(selectedFuncionario.centro_custo);
      }
    }
  }, [selectedFuncionario]);

  // Ao desmarcar dados manuais, restaurar valores do funcionário
  useEffect(() => {
    if (!dadosManuais && selectedFuncionario) {
      setManualCargo(selectedFuncionario.cargo || '');
      setManualCargaHoraria(selectedFuncionario.carga_horaria_semanal || '');
      setManualEscala(selectedFuncionario.escala || '');
    }
  }, [dadosManuais]);

  const normalize = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const filteredFuncionarios = funcionarios.filter((f) => {
    const matchCentro = !selectedCentroCusto || f.centro_custo === selectedCentroCusto;
    const matchBusca = !buscaFuncionario.trim() || normalize(f.nome).includes(normalize(buscaFuncionario));
    return matchCentro && matchBusca;
  });

  // Dados efetivos que serão salvos
  const cargoFinal = dadosManuais ? manualCargo : selectedFuncionario?.cargo ?? '';
  const cargaHorariaFinal = dadosManuais ? manualCargaHoraria : selectedFuncionario?.carga_horaria_semanal ?? null;
  const escalaFinal = dadosManuais ? manualEscala : selectedFuncionario?.escala ?? null;

  const handleSave = async () => {
    if (!selectedFuncionario || !selectedCnpj || !selectedCentroCusto) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (dadosManuais && !cargoFinal) {
      setError('Selecione o cargo para continuar.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: insertError } = await supabase
        .from('vagas_movimentacao')
        .insert({
          cnpj: selectedCnpj,
          centro_custo: selectedCentroCusto,
          id_funcionario: selectedFuncionario.id,
          nome_funcionario: selectedFuncionario.nome,
          cargo: cargoFinal,
          carga_horaria_semanal: cargaHorariaFinal,
          escala: escalaFinal,
          tipo_movimentacao: tipoMovimentacao,
          data_abertura: new Date().toISOString().split('T')[0],
          status: 'ABERTA',
        });
      if (insertError) throw insertError;
      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar vaga.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedCnpj('');
    setSelectedCentroCusto('');
    setBuscaFuncionario('');
    setSelectedFuncionario(null);
    setTipoMovimentacao('TRANSFERENCIA');
    setDadosManuais(false);
    setManualCargo('');
    setManualCargaHoraria('');
    setManualEscala('');
    setError(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <UserPlus className="text-purple-600 w-4 h-4" />
            </div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Nova Vaga de Movimentação
            </h2>
          </div>
          <button
            onClick={() => { onOpenChange(false); resetForm(); }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">

          {/* Tipo */}
          <div>
            <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">
              Tipo de Movimentação
            </Label>
            <RadioGroup
              value={tipoMovimentacao}
              onValueChange={(v) => setTipoMovimentacao(v as 'PROMOCAO' | 'TRANSFERENCIA')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="TRANSFERENCIA" id="tipo-transf" />
                <Label htmlFor="tipo-transf" className="cursor-pointer font-medium">Transferência</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="PROMOCAO" id="tipo-prom" />
                <Label htmlFor="tipo-prom" className="cursor-pointer font-medium">Promoção</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Contrato */}
          <div>
            <Label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">
              Contrato / Empresa
            </Label>
            <select
              className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
              value={selectedCnpj}
              onChange={(e) => {
                setSelectedCnpj(e.target.value);
                setSelectedCentroCusto('');
                setSelectedFuncionario(null);
                setBuscaFuncionario('');
                setDadosManuais(false);
              }}
            >
              <option value="">Selecione o contrato...</option>
              {fantasias.map((f) => (
                <option key={f.cnpj} value={f.cnpj}>
                  {f.display_name || f.nome_fantasia}
                </option>
              ))}
            </select>
          </div>

          {/* Funcionário — aparece assim que o contrato é selecionado */}
          {selectedCnpj && (
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500 mb-1.5 block">
                Funcionário que Será Movimentado
              </Label>

              {/* Filtros: busca por nome + centro de custo opcional */}
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={buscaFuncionario}
                    onChange={(e) => {
                      setBuscaFuncionario(e.target.value);
                      setSelectedFuncionario(null);
                      setDadosManuais(false);
                    }}
                    className="pl-9 h-9"
                  />
                </div>
                <select
                  className="border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 min-w-0 max-w-[180px] truncate"
                  value={selectedCentroCusto}
                  onChange={(e) => {
                    setSelectedCentroCusto(e.target.value);
                    setSelectedFuncionario(null);
                    setDadosManuais(false);
                  }}
                >
                  <option value="">Todos os centros</option>
                  {centrosCusto.map((cc) => (
                    <option key={cc} value={cc}>{cc}</option>
                  ))}
                </select>
              </div>

              {loadingFuncionarios ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                  <Loader2 size={14} className="animate-spin" /> Carregando funcionários...
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg max-h-44 overflow-y-auto">
                  {filteredFuncionarios.length === 0 ? (
                    <div className="flex flex-col items-center py-5 text-slate-400">
                      <Users size={22} className="mb-1" />
                      <p className="text-sm">Nenhum funcionário encontrado.</p>
                    </div>
                  ) : (
                    filteredFuncionarios.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => { setSelectedFuncionario(f); setDadosManuais(false); }}
                        className={`px-3 py-2 cursor-pointer transition-colors border-b last:border-b-0 border-slate-100 dark:border-slate-800 ${
                          selectedFuncionario?.id === f.id
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-l-2 border-l-purple-400'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.nome}</p>
                        <p className="text-xs text-slate-500">
                          {f.cargo}
                          {f.centro_custo && ` · ${f.centro_custo}`}
                          {f.carga_horaria_semanal && ` · ${f.carga_horaria_semanal}h`}
                          {f.escala && ` · ${f.escala}`}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dados manuais — aparece após selecionar funcionário */}
          {selectedFuncionario && (
            <>
              {/* Checkbox */}
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Checkbox
                  id="dados-manuais"
                  checked={dadosManuais}
                  onCheckedChange={(v) => setDadosManuais(v === true)}
                  className="mt-0.5"
                />
                <div>
                  <Label htmlFor="dados-manuais" className="cursor-pointer text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <PenLine size={13} />
                    Registrar movimentação retroativa
                  </Label>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                    O Oris já reflete a situação atual. Informe os dados anteriores à movimentação.
                  </p>
                </div>
              </div>

              {/* Selects manuais */}
              {dadosManuais ? (
                <div className="space-y-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Dados no momento da movimentação
                  </p>

                  {/* Cargo */}
                  <div>
                    <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                      Cargo <span className="text-red-500">*</span>
                    </Label>
                    {loadingOpcoes ? (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /> Carregando...</div>
                    ) : (
                      <select
                        className="w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                        value={manualCargo}
                        onChange={(e) => setManualCargo(e.target.value)}
                      >
                        <option value="">Selecione o cargo...</option>
                        {opcoesContrato.cargos.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Carga Horária + Escala lado a lado */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Carga Horária Semanal
                      </Label>
                      {loadingOpcoes ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /></div>
                      ) : (
                        <select
                          className="w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                          value={manualCargaHoraria}
                          onChange={(e) => setManualCargaHoraria(e.target.value)}
                        >
                          <option value="">—</option>
                          {opcoesContrato.cargasHorarias.map((ch) => (
                            <option key={ch} value={ch}>{ch}h</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                        Escala
                      </Label>
                      {loadingOpcoes ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={12} className="animate-spin" /></div>
                      ) : (
                        <select
                          className="w-full border border-slate-200 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                          value={manualEscala}
                          onChange={(e) => setManualEscala(e.target.value)}
                        >
                          <option value="">—</option>
                          {opcoesContrato.escalas.map((e) => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview dos dados do funcionário que serão congelados */
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">
                    Dados congelados na abertura da vaga
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {selectedFuncionario.nome}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {selectedFuncionario.cargo}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-slate-500">
                    {selectedFuncionario.carga_horaria_semanal && (
                      <span>{selectedFuncionario.carga_horaria_semanal}h semanais</span>
                    )}
                    {selectedFuncionario.escala && (
                      <span>Escala: {selectedFuncionario.escala}</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Erro */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => { onOpenChange(false); resetForm(); }}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedFuncionario || saving}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Salvando...' : 'Abrir Vaga'}
          </button>
        </div>
      </div>
    </div>
  );
}
