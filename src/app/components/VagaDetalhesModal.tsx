import { useState, useEffect, useRef } from 'react';
import ReactConfetti from 'react-confetti';
import { X, Loader2, AlertCircle, Search, CheckCircle, ChevronsUpDown, Check, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatarData } from '@/lib/column-formatters';
import { VagaAtribuida } from '@/app/services/agendaAnalistasService';
import { Badge } from './ui/badge';
import { buscarSugestoesSubstitutos, salvarResposta } from '@/app/services/demissoesService';
import { buscarRegistrosBIByNome } from '@/app/services/baseBiService';
import { BiTooltipCard } from './BiTooltipCard';

interface VagaDetalhesModalProps {
  vaga: VagaAtribuida & { nomeAnalista: string; cargoAnalista: string };
  onClose: () => void;
  onVagaFechada?: () => void;
}

interface DetalhesCompletos {
  evento: any;
  resposta: any;
  funcionarioAtual: any;
  error: string | null;
  loading: boolean;
}

interface SugestaoFuncionario {
  id: number;
  nome: string;
  cargo: string;
  centro_custo?: string;
  local_de_trabalho?: string;
  nome_fantasia?: string;
  cnpj?: string;
  cnpj_empresa?: string;
  dt_admissao?: string;
}

interface BuscaSubstitutoFormProps {
  searchSubstituto: string;
  setSearchSubstituto: (v: string) => void;
  sugestoesSubstituto: SugestaoFuncionario[];
  setSugestoesSubstituto: (v: SugestaoFuncionario[]) => void;
  substitutoSelecionado: SugestaoFuncionario | null;
  setSubstitutoSelecionado: (v: SugestaoFuncionario | null) => void;
  cargoAlvo: string;
  lotacaoAlvo: string;
  cnpjAlvo: string;
}

function BuscaSubstitutoForm({
  searchSubstituto,
  setSearchSubstituto,
  sugestoesSubstituto,
  setSugestoesSubstituto,
  substitutoSelecionado,
  setSubstitutoSelecionado,
  cargoAlvo,
  lotacaoAlvo,
  cnpjAlvo,
}: BuscaSubstitutoFormProps) {
  const removerQualificadores = (cargo: string) =>
    cargo.toLowerCase().trim()
      .replace(/\s+(lider|substituto|interino|coordenador|gerente|supervisor|chefe|assistente|auxiliar|tecnico|aux\.|técnico)\b/gi, '')
      .trim();

  const getScore = (item: SugestaoFuncionario) => {
    let score = 0;
    const cargoAlvoClean = removerQualificadores(cargoAlvo || '');
    const itemCargoClean = removerQualificadores(item.cargo || '');
    const cargoMatch = cargoAlvoClean && itemCargoClean && cargoAlvoClean === itemCargoClean;
    const lotacaoLower = lotacaoAlvo?.toLowerCase().trim() || '';
    const centroLower = item.centro_custo?.toLowerCase().trim() || '';
    const localLower = item.local_de_trabalho?.toLowerCase().trim() || '';
    const lotacaoMatch = lotacaoLower && (centroLower === lotacaoLower || localLower === lotacaoLower);
    const cnpjAlvoClean = cnpjAlvo?.replace(/\D/g, '') || '';
    const itemCnpjClean = ((item.cnpj_empresa || item.cnpj) || '').replace(/\D/g, '');
    const contratoMatch = !!(cnpjAlvoClean && itemCnpjClean && cnpjAlvoClean === itemCnpjClean);
    if (cargoMatch) {
      if (lotacaoMatch && contratoMatch) score = 10000;
      else if (lotacaoMatch) score = 8000;
      else if (contratoMatch) score = 5000;
      else score = 1000;
    } else {
      if (contratoMatch) score += 100;
      if (lotacaoMatch) score += 50;
    }
    return score;
  };

  const sortedSugestoes = [...sugestoesSubstituto]
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 50);

  return (
    <div className="mb-4 relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        Buscar Substituto <span className="text-slate-400 text-xs font-normal">(opcional)</span>
      </label>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Nome do novo funcionário..."
          value={searchSubstituto}
          onChange={(e) => setSearchSubstituto(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none">
          <ChevronsUpDown className="w-4 h-4" />
        </div>
      </div>

      {sortedSugestoes.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <div className="py-1">
            {sortedSugestoes.map((s) => {
              const cargoAlvoClean = removerQualificadores(cargoAlvo || '');
              const itemCargoClean = removerQualificadores(s.cargo || '');
              const cargoMatch = cargoAlvoClean && itemCargoClean && cargoAlvoClean === itemCargoClean;
              const lotacaoLower = lotacaoAlvo?.toLowerCase().trim() || '';
              const centroLower = s.centro_custo?.toLowerCase().trim() || '';
              const localLower = s.local_de_trabalho?.toLowerCase().trim() || '';
              const lotacaoMatch = lotacaoLower && (centroLower === lotacaoLower || localLower === lotacaoLower);
              const cnpjAlvoClean = cnpjAlvo?.replace(/\D/g, '') || '';
              const itemCnpjClean = ((s.cnpj_empresa || s.cnpj) || '').replace(/\D/g, '');
              const contratoMatch = !!(cnpjAlvoClean && itemCnpjClean && cnpjAlvoClean === itemCnpjClean);
              const isRecommended = cargoMatch && (lotacaoMatch || contratoMatch);
              return (
                <div
                  key={s.id}
                  className={`px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex flex-col gap-0.5 ${isRecommended ? 'bg-slate-50 dark:bg-slate-900/50' : ''}`}
                  onClick={() => {
                    setSubstitutoSelecionado(s);
                    setSugestoesSubstituto([]);
                    setSearchSubstituto('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.nome}</span>
                    {isRecommended && (
                      <Badge variant="outline" className="text-[10px] h-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 flex gap-1 items-center">
                        <Check className="h-2 w-2" /> Recomendado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 items-center">
                    <span className={cargoMatch ? 'font-semibold text-slate-700 dark:text-slate-300' : ''}>{s.cargo}</span>
                    <span className="text-slate-300">•</span>
                    <span className={lotacaoMatch ? 'font-semibold text-slate-700 dark:text-slate-300' : ''}>
                      {s.local_de_trabalho || s.centro_custo || 'Sem lotação'}
                    </span>
                    {s.nome_fantasia && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className={`uppercase text-[10px] px-1.5 rounded ${contratoMatch ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                          {s.nome_fantasia}
                        </span>
                      </>
                    )}
                    {s.dt_admissao && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">Admissão: {formatarData(s.dt_admissao)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {substitutoSelecionado && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg flex items-start justify-between">
          <div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-0.5">✓ Selecionado</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{substitutoSelecionado.nome}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400">{substitutoSelecionado.cargo}</p>
          </div>
          <button
            onClick={() => setSubstitutoSelecionado(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function getStatusBadge(diasEmAberto: number) {
  if (diasEmAberto >= 45) {
    return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '🔴 Crítico' };
  } else if (diasEmAberto >= 15) {
    return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: '🟡 Atenção' };
  } else {
    return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: '🟢 Normal' };
  }
}

function VagaDetalhesModal({ vaga, onClose, onVagaFechada }: VagaDetalhesModalProps) {
  console.log('🎯 VagaDetalhesModal RENDERIZADO com vaga:', { id_evento: vaga.id_evento, nome_funcionario: vaga.nome_funcionario, timestamp: new Date().toISOString() });

  const [detalhes, setDetalhes] = useState<DetalhesCompletos>({
    evento: null,
    resposta: null,
    funcionarioAtual: null,
    error: null,
    loading: true,
  });

  // Formulário: registrar substituto (quando já fechada mas sem dados)
  const [mostrarFormularioSubstituto, setMostrarFormularioSubstituto] = useState(false);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  // Formulário: fechar vaga
  const [mostrarFormularioFechamento, setMostrarFormularioFechamento] = useState(false);
  const [dataAbertura, setDataAbertura] = useState('');
  const [dataFechamento, setDataFechamento] = useState('');
  const [semDataFechamento, setSemDataFechamento] = useState(false);
  const [erroDataAbertura, setErroDataAbertura] = useState(false);
  const [erroDataFechamento, setErroDataFechamento] = useState(false);
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);

  // Busca de substituto (compartilhada entre os dois formulários)
  const [searchSubstituto, setSearchSubstituto] = useState('');
  const [sugestoesSubstituto, setSugestoesSubstituto] = useState<SugestaoFuncionario[]>([]);
  const [substitutoSelecionado, setSubstitutoSelecionado] = useState<SugestaoFuncionario | null>(null);
  const [salvandoSubstituto, setSalvandoSubstituto] = useState(false);
  const [nomeSubstitutoManual, setNomeSubstitutoManual] = useState('');
  const [forcarRecarregamento, setForcarRecarregamento] = useState(0);

  // Base BI RH — hover card
  const [biData, setBiData] = useState<{ rows: Record<string, any>[]; headers: string[] } | null>(null);
  const [showBiCard, setShowBiCard] = useState(false);
  const [biCardPos, setBiCardPos] = useState<{ top: number; left: number } | null>(null);
  const biTriggerRef = useRef<HTMLDivElement>(null);
  const biHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Forçar recarregamento sempre que a vaga mudar ou o modal abrir
  useEffect(() => {
    console.log('🔄 VagaDetalhesModal: Vaga mudou para id_evento:', vaga.id_evento, '- resetando dados');
    // Reset do estado para garantir carregamento fresco
    setDetalhes({
      evento: null,
      resposta: null,
      funcionarioAtual: null,
      error: null,
      loading: true,
    });
    // Forçar recarregamento
    setForcarRecarregamento(prev => prev + 1);
  }, [vaga.id_evento]);

  useEffect(() => {
    buscarRegistrosBIByNome(vaga.nome_funcionario).then(d => { setBiData(d); });
  }, [vaga.nome_funcionario]);

  const handleBiEnter = () => {
    if (biHideTimer.current) clearTimeout(biHideTimer.current);
    if (!biTriggerRef.current) return;
    const r = biTriggerRef.current.getBoundingClientRect();
    setBiCardPos({
      top: r.bottom + 8,
      left: Math.min(r.left, window.innerWidth - 356),
    });
    setShowBiCard(true);
  };
  const handleBiLeave = () => {
    biHideTimer.current = setTimeout(() => setShowBiCard(false), 150);
  };
  const handleCardEnter = () => { if (biHideTimer.current) clearTimeout(biHideTimer.current); };
  const handleCardLeave = () => { biHideTimer.current = setTimeout(() => setShowBiCard(false), 150); };

  // Carregar detalhes quando modal abre
  useEffect(() => {
    console.log('🚀 VagaDetalhesModal: Carregando detalhes para id_evento:', vaga.id_evento);
    setDetalhes(prev => ({ ...prev, loading: true }));

    const carregarDetalhes = async () => {
      try {
        console.log('⏳ Buscando evento...');
        const { data: eventoData, error: eventoError } = await supabase
          .from('eventos_gestao_vagas_public')
          .select('*')
          .eq('id_evento', vaga.id_evento)
          .single();

        if (eventoError) console.warn('⚠️ Erro ao buscar evento:', eventoError);

        // Buscar todos os registros para esse evento (pode haver DEMISSAO e AFASTAMENTO)
        const { data: todasRespostas } = await supabase
          .from('respostas_gestor')
          .select('*')
          .eq('id_evento', vaga.id_evento);

        // Se há apenas um registro, usa ele direto
        // Se há mais de um, prioriza pelo tipo_origem baseado na situação
        let respostaData: any = null;
        if (todasRespostas && todasRespostas.length === 1) {
          respostaData = todasRespostas[0];
        } else if (todasRespostas && todasRespostas.length > 1) {
          const tipoOrigemAtual = vaga.situacao_origem === '99-Demitido' ? 'DEMISSAO' : 'AFASTAMENTO';
          respostaData = todasRespostas.find(r => r.tipo_origem === tipoOrigemAtual) ?? todasRespostas[0];
        }

        let substitutoData = null;
        if (respostaData?.id_substituto) {
          const { data: subData } = await supabase
            .from('oris_funcionarios')
            .select('id, nome, cargo, dt_admissao, centro_custo')
            .eq('id', respostaData.id_substituto);
          if (subData && subData.length > 0) substitutoData = subData[0];
        }

        if (!substitutoData && respostaData?.nome_candidato) {
          const { data: subData } = await supabase
            .from('oris_funcionarios')
            .select('id, nome, cargo, dt_admissao, centro_custo')
            .ilike('nome', `%${respostaData.nome_candidato}%`)
            .limit(1);
          if (subData && subData.length > 0) substitutoData = subData[0];
        }

        console.log('✅ Dados completos carregados:', {
          nome_candidato_final: respostaData?.nome_candidato || 'VAZIO',
          funcionario_atual: substitutoData?.nome || 'NENHUM',
        });

        setDetalhes({
          evento: eventoData,
          resposta: respostaData,
          funcionarioAtual: substitutoData,
          error: null,
          loading: false,
        });
      } catch (err) {
        console.error('❌ Erro ao carregar detalhes:', err);
        setDetalhes(prev => ({
          ...prev,
          error: err instanceof Error ? err.message : 'Erro desconhecido',
          loading: false,
        }));
      }
    };

    carregarDetalhes();
  }, [vaga.id_evento, forcarRecarregamento]);

  // Inicializar nome manual quando formulário abre
  useEffect(() => {
    if (mostrarFormularioSubstituto && !nomeSubstitutoManual && detalhes.resposta?.nome_candidato) {
      setNomeSubstitutoManual(detalhes.resposta.nome_candidato);
    }
  }, [mostrarFormularioSubstituto, detalhes.resposta?.nome_candidato]);

  useEffect(() => {
    const buscarSugestoes = async () => {
      if (searchSubstituto.trim().length < 2) {
        setSugestoesSubstituto([]);
        return;
      }
      try {
        const results = await buscarSugestoesSubstitutos(searchSubstituto.trim(), undefined);
        setSugestoesSubstituto(results);
      } catch (err) {
        console.error('Erro ao buscar sugestões:', err);
      }
    };
    const timer = setTimeout(buscarSugestoes, 300);
    return () => clearTimeout(timer);
  }, [searchSubstituto]);

  const calcularDiasReais = (): number => {
    if (detalhes.resposta?.data_fechamento_vaga && detalhes.resposta?.data_abertura_vaga) {
      const abertura = new Date(detalhes.resposta.data_abertura_vaga);
      const fechamento = new Date(detalhes.resposta.data_fechamento_vaga);
      return Math.floor((fechamento.getTime() - abertura.getTime()) / (1000 * 60 * 60 * 24));
    }
    return vaga.dias_em_aberto;
  };

  const diasReais = calcularDiasReais();
  const vagaFechada = detalhes.resposta?.vaga_preenchida === 'SIM';
  const statusBadge = getStatusBadge(diasReais);

  const resetFormularioFechamento = () => {
    setMostrarFormularioFechamento(false);
    setDataAbertura('');
    setDataFechamento('');
    setSemDataFechamento(false);
    setErroDataAbertura(false);
    setErroDataFechamento(false);
    setSearchSubstituto('');
    setSugestoesSubstituto([]);
    setSubstitutoSelecionado(null);
  };

  // Retorna tipo_origem confiável: usa o que veio do banco, fallback pela situacao_origem
  const getTipoOrigem = (): 'DEMISSAO' | 'AFASTAMENTO' => {
    if (detalhes.resposta?.tipo_origem === 'DEMISSAO' || detalhes.resposta?.tipo_origem === 'AFASTAMENTO') {
      return detalhes.resposta.tipo_origem;
    }
    return vaga.situacao_origem === '99-Demitido' ? 'DEMISSAO' : 'AFASTAMENTO';
  };

  const abrirFormularioFechamento = () => {
    // Pré-preencher data de abertura se já existe na resposta
    if (detalhes.resposta?.data_abertura_vaga) {
      setDataAbertura(detalhes.resposta.data_abertura_vaga);
    }
    setMostrarFormularioFechamento(true);
  };

  const fecharVaga = async () => {
    let hasError = false;
    if (!dataAbertura) { setErroDataAbertura(true); hasError = true; }
    if (!semDataFechamento && !dataFechamento) { setErroDataFechamento(true); hasError = true; }
    if (hasError) return;

    setErroDataAbertura(false);
    setErroDataFechamento(false);
    setSalvandoFechamento(true);
    try {
      const atualizacao: Record<string, any> = {
        abriu_vaga: true,
        data_abertura_vaga: dataAbertura,
        data_fechamento_vaga: semDataFechamento ? null : dataFechamento,
      };

      // Se há substituto: marca como preenchida (vai para Fechadas)
      // Se não há substituto: marca como pendente de efetivação (fica em Aberto/Pendentes)
      if (substitutoSelecionado) {
        atualizacao.vaga_preenchida = 'SIM';
        atualizacao.id_substituto = substitutoSelecionado.id;
        atualizacao.nome_candidato = substitutoSelecionado.nome;
      } else {
        atualizacao.vaga_preenchida = 'NAO';
        atualizacao.pendente_efetivacao = true;
      }

      // Usar tipo_origem confiável (do banco ou fallback)
      const tipoOrigem = getTipoOrigem();

      // Usar salvarResposta do serviço que trata corretamente a chave composta
      await salvarResposta(vaga.id_evento, tipoOrigem, atualizacao);

      // Buscar dados completos do substituto se selecionado
      let funcionarioAtual = detalhes.funcionarioAtual;
      if (substitutoSelecionado) {
        const { data: subData } = await supabase
          .from('oris_funcionarios')
          .select('id, nome, cargo, dt_admissao, centro_custo')
          .eq('id', substitutoSelecionado.id)
          .single();
        if (subData) funcionarioAtual = subData;
      }

      setDetalhes(prev => ({
        ...prev,
        funcionarioAtual,
        resposta: {
          ...prev.resposta,
          vaga_preenchida: substitutoSelecionado ? 'SIM' : 'NAO',
          abriu_vaga: true,
          data_abertura_vaga: dataAbertura,
          data_fechamento_vaga: semDataFechamento ? null : dataFechamento,
          ...(substitutoSelecionado ? {
            id_substituto: substitutoSelecionado.id,
            nome_candidato: substitutoSelecionado.nome,
          } : { pendente_efetivacao: true }),
        },
      }));

      resetFormularioFechamento();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      onVagaFechada?.();
    } catch (err) {
      console.error('Erro ao fechar vaga:', err);
      alert('Erro ao fechar vaga: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setSalvandoFechamento(false);
    }
  };

  const salvarSubstituto = async () => {
    if (!substitutoSelecionado) return;
    setSalvandoSubstituto(true);
    try {
      const { data: funcionario } = await supabase
        .from('oris_funcionarios')
        .select('id, nome, cargo, dt_admissao, centro_custo')
        .eq('id', substitutoSelecionado.id)
        .single();

      if (!funcionario) throw new Error('Funcionário não encontrado');

      // Usar tipo_origem confiável (do banco ou fallback)
      const tipoOrigem = getTipoOrigem();

      // Usar salvarResposta do serviço que trata corretamente a chave composta
      await salvarResposta(vaga.id_evento, tipoOrigem, {
        id_substituto: substitutoSelecionado.id,
        nome_candidato: substitutoSelecionado.nome,
        vaga_preenchida: 'SIM',
        abriu_vaga: true,
      });

      setDetalhes(prev => ({
        ...prev,
        funcionarioAtual: funcionario,
        resposta: {
          ...prev.resposta,
          id_substituto: substitutoSelecionado.id,
          nome_candidato: substitutoSelecionado.nome,
          vaga_preenchida: 'SIM',
        },
      }));

      setMostrarFormularioSubstituto(false);
      setSearchSubstituto('');
      setSubstitutoSelecionado(null);
      setNomeSubstitutoManual('');
      onVagaFechada?.();
    } catch (err) {
      console.error('Erro ao salvar substituto:', err);
      alert('Erro ao salvar substituto: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setSalvandoSubstituto(false);
    }
  };

  const salvarNomeSubstitutoManual = async () => {
    const nomeTrimmed = nomeSubstitutoManual.trim();
    console.log('🔧 VagaDetalhesModal: Tentando salvar nome manual', {
      nomeSubstitutoManual_state: nomeSubstitutoManual,
      nomeTrimmed: nomeTrimmed,
      id_evento: vaga.id_evento,
      situacao_origem: vaga.situacao_origem,
    });

    if (!nomeTrimmed) {
      alert('Digite o nome do substituto');
      return;
    }
    setSalvandoSubstituto(true);
    try {
      // Usar tipo_origem confiável (do banco ou fallback)
      const tipoOrigem = getTipoOrigem();

      console.log('📤 VagaDetalhesModal: Enviando para salvarResposta:', {
        id_evento: vaga.id_evento,
        tipo_origem: tipoOrigem,
        nome_a_salvar: nomeTrimmed,
        length: nomeTrimmed.length,
      });

      // Usar salvarResposta do serviço que trata corretamente a chave composta
      await salvarResposta(vaga.id_evento, tipoOrigem, {
        nome_candidato: nomeSubstitutoManual.trim(),
        vaga_preenchida: 'SIM',
        abriu_vaga: true,
      });

      console.log('✅ Salvo com sucesso!');

      setDetalhes(prev => ({
        ...prev,
        resposta: {
          ...prev.resposta,
          nome_candidato: nomeSubstitutoManual.trim(),
          vaga_preenchida: 'SIM',
        },
      }));

      setMostrarFormularioSubstituto(false);
      setSearchSubstituto('');
      setSubstitutoSelecionado(null);
      setNomeSubstitutoManual('');
      onVagaFechada?.();
    } catch (err) {
      console.error('❌ Erro ao salvar nome do substituto:', err);
      alert('Erro ao salvar: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setSalvandoSubstituto(false);
    }
  };

  return (
    <>
      {showConfetti && (
        <ReactConfetti
          recycle={false}
          numberOfPieces={400}
          gravity={0.25}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
          width={window.innerWidth}
          height={window.innerHeight}
        />
      )}
      {/* BI Hover Card — fixed overlay */}
      {showBiCard && biData && biData.rows.length > 0 && biCardPos && (
        <BiTooltipCard
          rows={biData.rows}
          headers={biData.headers}
          style={{ position: 'fixed', top: biCardPos.top, left: biCardPos.left, zIndex: 10000 }}
          onMouseEnter={handleCardEnter}
          onMouseLeave={handleCardLeave}
        />
      )}
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {vaga.nomeAnalista}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {vaga.cargoAnalista}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="p-6 space-y-6">
            {detalhes.loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
              </div>
            )}

            {detalhes.error && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">{detalhes.error}</p>
              </div>
            )}

            {!detalhes.loading && (
              <>
                {/* Resumo Principal - Saiu vs Entrou vs BI */}
                <div className={`grid gap-4 ${biData && biData.rows.length > 0 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {/* Funcionário Saído */}
                  <div
                    ref={biTriggerRef}
                    className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
                    onMouseEnter={handleBiEnter}
                    onMouseLeave={handleBiLeave}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase">
                        ❌ Saiu
                      </h3>
                      {biData && biData.rows.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded cursor-default select-none">
                          <FileSpreadsheet className="w-3 h-3" />
                          BI · {biData.rows.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-500 font-medium">Nome</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.nome_funcionario}</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-500 font-medium">Cargo</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.cargo_vaga}</p>
                      </div>
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-500 font-medium">Situação</p>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{vaga.situacao_origem}</p>
                      </div>
                    </div>
                  </div>

                  {/* Substituto */}
                  {detalhes.funcionarioAtual ? (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase mb-3">
                        ✓ Entrou no Lugar
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Nome</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.nome}</p>
                        </div>
                        <div>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Cargo</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.cargo}</p>
                        </div>
                        {detalhes.funcionarioAtual.centro_custo && (
                          <div>
                            <p className="text-xs text-green-600 dark:text-green-500 font-medium">Centro de Custo</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{detalhes.funcionarioAtual.centro_custo}</p>
                          </div>
                        )}
                        {detalhes.funcionarioAtual.dt_admissao && (
                          <div>
                            <p className="text-xs text-green-600 dark:text-green-500 font-medium">Data de Admissão</p>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{formatarData(detalhes.funcionarioAtual.dt_admissao)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : vagaFechada ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                      <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 uppercase mb-3">
                        ✓ Entrou no Lugar (Nome Manual)
                      </h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">Nome</p>
                          <p className="font-medium text-slate-900 dark:text-slate-100 uppercase">
                            {detalhes.resposta?.nome_candidato || '—'}
                          </p>
                        </div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 italic mt-2">
                          * Este colaborador foi registrado manualmente e não possui perfil completo no sistema Oris.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setMostrarFormularioSubstituto(true)}
                            className="flex-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded transition-colors"
                          >
                            Vincular Perfil Oris
                          </button>
                          <button
                            onClick={() => {
                              setSearchSubstituto(detalhes.resposta?.nome_candidato || '');
                              setMostrarFormularioSubstituto(true);
                            }}
                            className="flex-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-xs font-semibold rounded transition-colors"
                          >
                            Editar Nome
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          ℹ️ Substituto
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum substituto registrado</p>
                      </div>
                    </div>
                  )}

                  {/* Base BI RH — ao lado do Entrou no Lugar */}
                  {biData && biData.rows.length > 0 && (
                    <BiTooltipCard
                      rows={biData.rows}
                      headers={biData.headers}
                      variant="purple"
                    />
                  )}
                </div>



                {/* Botão Fechar Vaga — só para vagas abertas */}
                {!vagaFechada && (
                  <div className="p-4 border-2 border-dashed border-green-300 dark:border-green-700 rounded-lg bg-green-50/50 dark:bg-green-900/10">
                    {!mostrarFormularioFechamento ? (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">Fechar esta vaga</p>
                          <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Registre o fechamento com data e substituto (opcional)</p>
                        </div>
                        <button
                          onClick={abrirFormularioFechamento}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Fechar Vaga
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-green-800 dark:text-green-300">
                            Fechar Vaga
                          </h3>
                          <button
                            onClick={resetFormularioFechamento}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Datas — grid lado a lado */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Data de Abertura <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={dataAbertura}
                              onChange={(e) => { setDataAbertura(e.target.value); setErroDataAbertura(false); }}
                              className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 ${erroDataAbertura
                                ? 'border-red-400 focus:ring-red-500'
                                : 'border-slate-300 dark:border-slate-600'
                                }`}
                            />
                            {erroDataAbertura && (
                              <p className="text-xs text-red-500 mt-1">Campo obrigatório.</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Data de Fechamento{!semDataFechamento && <span className="text-red-500"> *</span>}
                            </label>
                            <input
                              type="date"
                              value={dataFechamento}
                              disabled={semDataFechamento}
                              onChange={(e) => { setDataFechamento(e.target.value); setErroDataFechamento(false); }}
                              className={`w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-green-500 transition-opacity ${semDataFechamento
                                ? 'opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700'
                                : erroDataFechamento
                                  ? 'border-red-400 focus:ring-red-500'
                                  : 'border-slate-300 dark:border-slate-600'
                                }`}
                            />
                            {erroDataFechamento && (
                              <p className="text-xs text-red-500 mt-1">Campo obrigatório.</p>
                            )}
                            <label className="flex items-start gap-2 mt-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={semDataFechamento}
                                onChange={(e) => {
                                  setSemDataFechamento(e.target.checked);
                                  if (e.target.checked) {
                                    setDataFechamento('');
                                    setErroDataFechamento(false);
                                  }
                                }}
                                className="mt-0.5 accent-amber-500 cursor-pointer"
                              />
                              <span className="text-xs text-amber-700 dark:text-amber-400 leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-300">
                                Data não disponível — precisa ser corrigida depois
                              </span>
                            </label>
                          </div>
                        </div>

                        <BuscaSubstitutoForm
                          searchSubstituto={searchSubstituto}
                          setSearchSubstituto={setSearchSubstituto}
                          sugestoesSubstituto={sugestoesSubstituto}
                          setSugestoesSubstituto={setSugestoesSubstituto}
                          substitutoSelecionado={substitutoSelecionado}
                          setSubstitutoSelecionado={setSubstitutoSelecionado}
                          cargoAlvo={vaga.cargo_vaga}
                          lotacaoAlvo={vaga.lotacao}
                          cnpjAlvo={vaga.cnpj}
                        />

                        {!substitutoSelecionado && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Sem substituto registrado</p>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                                Se salvar sem selecionar um substituto, essa vaga irá para <strong>"Pendentes de Efetivação"</strong> para registro posterior.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-3 pt-1">
                          <button
                            onClick={resetFormularioFechamento}
                            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={fecharVaga}
                            disabled={salvandoFechamento}
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                          >
                            {salvandoFechamento ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                            ) : (
                              <><CheckCircle className="w-4 h-4" /> Confirmar Fechamento</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status e Timing */}
                <div className={`grid grid-cols-1 gap-4 ${detalhes.resposta?.data_fechamento_vaga ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Status</p>
                    {vagaFechada ? (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-0">
                        ✓ Fechada
                      </Badge>
                    ) : (
                      <Badge className={`${statusBadge.bg} ${statusBadge.text} border-0`}>
                        {statusBadge.label}
                      </Badge>
                    )}
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">{diasReais} dias</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Data do Evento</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatarData(vaga.data_evento)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-2">Data de Abertura da Vaga</p>
                    {(vaga.data_abertura_vaga || detalhes.resposta?.data_abertura_vaga) ? (
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        {formatarData(vaga.data_abertura_vaga || detalhes.resposta?.data_abertura_vaga)}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 dark:text-slate-500 italic">Não informada</p>
                    )}
                  </div>
                  {detalhes.resposta?.data_fechamento_vaga && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">Data de Fechamento da Vaga</p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                        {formatarData(detalhes.resposta.data_fechamento_vaga)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                {detalhes.resposta && (detalhes.resposta.data_abertura_vaga || detalhes.resposta.data_fechamento_vaga) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">📅 Timeline da Vaga</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {detalhes.resposta.data_abertura_vaga && (
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Abertura</p>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{formatarData(detalhes.resposta.data_abertura_vaga)}</p>
                        </div>
                      )}
                      {detalhes.resposta.data_fechamento_vaga && (
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Fechamento</p>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{formatarData(detalhes.resposta.data_fechamento_vaga)}</p>
                        </div>
                      )}
                      {detalhes.resposta.data_abertura_vaga && detalhes.resposta.data_fechamento_vaga && (
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Dias Aberta</p>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {Math.floor(
                              (new Date(detalhes.resposta.data_fechamento_vaga).getTime() -
                                new Date(detalhes.resposta.data_abertura_vaga).getTime()) /
                              (1000 * 60 * 60 * 24)
                            )}{' '}dias
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Lotação e Contrato */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">Lotação</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vaga.lotacao}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">CNPJ</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{vaga.cnpj}</p>
                  </div>
                </div>

                {/* Data de Atribuição */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">Data de Atribuição ao Analista</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{formatarData(vaga.data_atribuicao)}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal Registrar Substituto (quando já fechada mas sem dados) */}
        {mostrarFormularioSubstituto && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Buscar e Registrar Substituto
                </h3>
                <button
                  onClick={() => {
                    setMostrarFormularioSubstituto(false);
                    setSearchSubstituto('');
                    setSugestoesSubstituto([]);
                    setSubstitutoSelecionado(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <BuscaSubstitutoForm
                searchSubstituto={searchSubstituto}
                setSearchSubstituto={setSearchSubstituto}
                sugestoesSubstituto={sugestoesSubstituto}
                setSugestoesSubstituto={setSugestoesSubstituto}
                substitutoSelecionado={substitutoSelecionado}
                setSubstitutoSelecionado={setSubstitutoSelecionado}
                cargoAlvo={vaga.cargo_vaga}
                lotacaoAlvo={vaga.lotacao}
                cnpjAlvo={vaga.cnpj}
              />

              {/* Ou editar nome manualmente */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Ou digitar nome manualmente
                </label>
                <input
                  type="text"
                  placeholder="Nome do substituto..."
                  value={nomeSubstitutoManual}
                  onChange={(e) => {
                    setNomeSubstitutoManual(e.target.value);
                    // Limpar seleção se estava preenchida
                    if (substitutoSelecionado) {
                      setSubstitutoSelecionado(null);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMostrarFormularioSubstituto(false);
                    setSearchSubstituto('');
                    setSugestoesSubstituto([]);
                    setSubstitutoSelecionado(null);
                    setNomeSubstitutoManual('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (nomeSubstitutoManual.trim()) {
                      salvarNomeSubstitutoManual();
                    } else if (substitutoSelecionado) {
                      salvarSubstituto();
                    }
                  }}
                  disabled={(!substitutoSelecionado && !nomeSubstitutoManual.trim()) || salvandoSubstituto}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {salvandoSubstituto ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    'Registrar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export { VagaDetalhesModal };
