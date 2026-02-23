// Versão limpa para evitar corrupção
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
    Calendar,
    Search,
    ChevronDown,
    ChevronUp,
    Loader2,
    Users,
    AlertCircle,
    Briefcase,
    Trash2,
    X,
    Copy,
    Check,
    ArrowRight,
    UserPlus,
    ClipboardList,
} from 'lucide-react';
import { useAgendaAnalistas } from '@/app/hooks/useAgendaAnalistas';
import { useFantasiaFilter } from '@/app/hooks/useFantasiaFilter';
import { formatarData } from '@/lib/column-formatters';
import { VagaAtribuida } from '@/app/services/agendaAnalistasService';
import { VagaDetalhesModal } from './VagaDetalhesModal';
import { AtribuirVagaModal } from './AtribuirVagaModal';
import { supabase } from '@/lib/supabase';

const CONTRATOS_SP = [
    'SBCD - PAI ZN',
    'SBCD - CORPORATIVO',
    'SBCD - AME CRI ZN',
    'SBCD - REDE ASSIST. NORTE-SP',
];

interface VagaSemAtribuicao {
    id_evento: number;
    nome: string;
    cargo: string;
    cnpj: string;
    data_evento: string;
    dias_em_aberto: number;
    situacao_origem: string;
    lotacao: string;
    vaga_preenchida: string | null;
    data_abertura_vaga: string | null;
    data_fechamento_vaga: string | null;
}

const FILTROS_STORAGE_KEY = 'agenda_analistas_filtros';

interface FiltrosSalvos {
    analista?: string;
    status?: string;
    busca?: string;
    ano?: string;
    mes?: string;
    ordenacao?: string;
}

const carregarFiltros = (): FiltrosSalvos | null => {
    try {
        const saved = localStorage.getItem(FILTROS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};

const salvarFiltros = (filtros: FiltrosSalvos) => {
    try {
        localStorage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(filtros));
    } catch {
        // Ignora erro
    }
};

function getStatusBadge(diasEmAberto: number) {
    if (diasEmAberto >= 45) {
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: '🔴 Crítico', valor: 'critico' };
    } else if (diasEmAberto >= 15) {
        return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: '🟡 Atenção', valor: 'atencao' };
    } else {
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: '🟢 Normal', valor: 'normal' };
    }
}

function AgendaAnalistas() {
    const {
        analistas,
        loading,
        error,
        carregarDados,
        removerVaga,
        trocarAnalista,
        totalAnalistas,
        totalVagas,
        totalVagasEmAberto,
        totalVagasCriticas,
    } = useAgendaAnalistas();

    const { fantasias } = useFantasiaFilter();

    // CNPJs dos contratos de SP (mesmo filtro do Gestão de Vagas)
    const cnpjsSP = useMemo(() => {
        const set = new Set<string>();
        (fantasias || []).forEach(f => {
            if (CONTRATOS_SP.includes(f.display_name) || CONTRATOS_SP.includes(f.nome_fantasia)) {
                set.add(f.cnpj);
            }
        });
        return set;
    }, [fantasias]);

    // Filtros salvos
    const filtrosSalvos = useMemo(() => carregarFiltros(), []);

    // Constantes de tempo
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));
    const months = [
        { value: '1', label: 'Janeiro' }, { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' }, { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' }, { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' }, { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' }, { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
    ];

    // Estados
    const [buscaAnalista, setBuscaAnalista] = useState<string>(filtrosSalvos?.analista ?? '');
    const [statusFiltro, setStatusFiltro] = useState<string>(filtrosSalvos?.status ?? 'todos');
    const [busca, setBusca] = useState<string>(filtrosSalvos?.busca ?? '');
    const [selectedYear, setSelectedYear] = useState<string>(filtrosSalvos?.ano ?? 'TODOS');
    const [selectedMonth, setSelectedMonth] = useState<string>(filtrosSalvos?.mes ?? 'TODOS');
    const [ordenacao, setOrdenacao] = useState<string>(filtrosSalvos?.ordenacao ?? 'antigas');
    const [expandidos, setExpandidos] = useState<Set<number>>(new Set());
    const [removendo, setRemovendo] = useState<string | null>(null);
    const [vagaSelecionada, setVagaSelecionada] = useState<(VagaAtribuida & { nomeAnalista: string; cargoAnalista: string }) | null>(null);
    const [copiado, setCopiado] = useState<number | null>(null);
    const [vagaParaTrocar, setVagaParaTrocar] = useState<{ vaga: VagaAtribuida; analistaAtualId: number; analistaAtualNome: string } | null>(null);
    const [analistaNovoSelecionado, setAnalistaNovoSelecionado] = useState<string | null>(null);
    const [trocando, setTrocando] = useState(false);

    // Vagas sem atribuição
    const [vagasSemAtribuicao, setVagasSemAtribuicao] = useState<VagaSemAtribuicao[]>([]);
    const [loadingVagasSemAtribuicao, setLoadingVagasSemAtribuicao] = useState(false);
    const [vagaParaAtribuir, setVagaParaAtribuir] = useState<VagaSemAtribuicao | null>(null);
    const [expandirAbertasSemAtribuicao, setExpandirAbertasSemAtribuicao] = useState(true);
    const [expandirFechadasSemAtribuicao, setExpandirFechadasSemAtribuicao] = useState(false);
    const [buscaSemAtribuicao, setBuscaSemAtribuicao] = useState('');

    const copiarNome = useCallback((e: React.MouseEvent, nome: string, idEvento: number) => {
        e.stopPropagation();
        e.preventDefault();
        const doCopy = () => {
            setCopiado(idEvento);
            setTimeout(() => setCopiado(null), 2000);
        };
        if (navigator.clipboard) {
            navigator.clipboard.writeText(nome).then(doCopy).catch(() => {
                // fallback para ambientes sem clipboard API
                const el = document.createElement('textarea');
                el.value = nome;
                el.style.position = 'fixed';
                el.style.opacity = '0';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
                doCopy();
            });
        } else {
            const el = document.createElement('textarea');
            el.value = nome;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            doCopy();
        }
    }, []);

    // Vagas sem atribuição filtradas por contratos de SP
    const vagasSemAtribuicaoSP = useMemo(() => {
        if (cnpjsSP.size === 0) return vagasSemAtribuicao;
        return vagasSemAtribuicao.filter(v => cnpjsSP.has(v.cnpj));
    }, [vagasSemAtribuicao, cnpjsSP]);

    const handleSalvarFiltros = (filtros: FiltrosSalvos) => {
        salvarFiltros(filtros);
    };

    const toggleExpandir = (id: number) => {
        const novoExpandidos = new Set(expandidos);
        if (novoExpandidos.has(id)) {
            novoExpandidos.delete(id);
        } else {
            novoExpandidos.add(id);
        }
        setExpandidos(novoExpandidos);
    };

    const handleRemoverVaga = async (idEvento: number, idAnalista: number) => {
        const key = `${idAnalista}-${idEvento}`;
        setRemovendo(key);
        try {
            await removerVaga(idEvento, idAnalista);
        } finally {
            setRemovendo(null);
        }
    };

    const handleTrocarAnalista = async () => {
        if (!vagaParaTrocar || !analistaNovoSelecionado) return;

        const idAnalistaNovo = parseInt(analistaNovoSelecionado);
        if (idAnalistaNovo === vagaParaTrocar.analistaAtualId) {
            alert('Selecione um analista diferente do atual');
            return;
        }

        setTrocando(true);
        try {
            await trocarAnalista(
                vagaParaTrocar.vaga.id_evento,
                vagaParaTrocar.analistaAtualId,
                idAnalistaNovo,
                vagaParaTrocar.vaga.cnpj
            );
            setVagaParaTrocar(null);
            setAnalistaNovoSelecionado(null);
        } catch (err) {
            alert('Erro ao trocar analista');
        } finally {
            setTrocando(false);
        }
    };

    // Filtrar analistas
    const analistasFiltrados = useMemo(() => {
        let result = analistas;

        // Filtro por nome do analista
        if (buscaAnalista.trim()) {
            result = result.filter(a =>
                a.nome.toLowerCase().includes(buscaAnalista.toLowerCase())
            );
        }

        // Filtro por período (ano/mês do data_evento da vaga)
        if (selectedYear !== 'TODOS' || selectedMonth !== 'TODOS') {
            result = result.map(a => ({
                ...a,
                vagas: a.vagas.filter(v => {
                    if (!v.data_evento) return false;
                    const d = new Date(v.data_evento + 'T00:00:00');
                    const matchAno = selectedYear === 'TODOS' || String(d.getFullYear()) === selectedYear;
                    const matchMes = selectedMonth === 'TODOS' || String(d.getMonth() + 1) === selectedMonth;
                    return matchAno && matchMes;
                }),
            }));
            result = result.filter(a => a.vagas.length > 0);
        }

        // Filtro por status das vagas (usando dias_reais) — só abertas
        if (statusFiltro !== 'todos') {
            result = result.map(a => ({
                ...a,
                vagas: a.vagas.filter(v => {
                    const statusVaga = getStatusBadge(v.dias_reais).valor;
                    return statusVaga === statusFiltro;
                }),
            }));
            result = result.filter(a => a.vagas.length > 0);
        }

        // Filtro por texto (busca em vagas)
        if (busca.trim()) {
            result = result.map(a => ({
                ...a,
                vagas: a.vagas.filter(v =>
                    v.nome_funcionario.toLowerCase().includes(busca.toLowerCase()) ||
                    v.cargo_vaga.toLowerCase().includes(busca.toLowerCase()) ||
                    v.lotacao.toLowerCase().includes(busca.toLowerCase())
                ),
            }));
            result = result.filter(a => a.vagas.length > 0);
        }

        // Filtro por contratos de SP (sempre ativo quando cnpjsSP estiver carregado)
        if (cnpjsSP.size > 0) {
            result = result.map(a => ({
                ...a,
                vagas: a.vagas.filter(v => cnpjsSP.has(v.cnpj)),
            }));
            result = result.filter(a => a.vagas.length > 0);
        }

        // Recalcular contadores com base nas vagas filtradas e Aplicar Ordenação
        return result.map(a => {
            const vagasOrdenadas = [...a.vagas].sort((v1, v2) => {
                // Sempre mantém vagas abertas no topo se não estiverem preenchidas
                const aAberta = v1.vaga_preenchida !== 'SIM' ? 0 : 1;
                const bAberta = v2.vaga_preenchida !== 'SIM' ? 0 : 1;
                if (aAberta !== bAberta) return aAberta - bAberta;

                if (ordenacao === 'alfabetica') {
                    return v1.nome_funcionario.localeCompare(v2.nome_funcionario);
                } else if (ordenacao === 'abertura') {
                    const dateA = v1.data_abertura_vaga ? new Date(v1.data_abertura_vaga).getTime() : 0;
                    const dateB = v2.data_abertura_vaga ? new Date(v2.data_abertura_vaga).getTime() : 0;
                    return dateB - dateA; // Mais recentes primeiro
                } else {
                    // Default: Antigas primeiro (mesmo comportamento do service)
                    return v2.dias_reais - v1.dias_reais;
                }
            });

            return {
                ...a,
                vagas: vagasOrdenadas,
                totalVagas: a.vagas.length,
                vagasEmAberto: a.vagas.filter(v => v.vaga_preenchida !== 'SIM').length,
                vagasFechadas: a.vagas.filter(v => v.vaga_preenchida === 'SIM').length,
                vagasCriticas: a.vagas.filter(v => v.vaga_preenchida !== 'SIM' && v.dias_reais >= 45).length,
            };
        });
    }, [analistas, buscaAnalista, statusFiltro, busca, selectedYear, selectedMonth, ordenacao, cnpjsSP]);

    // Atualizar filtros salvos quando mudam
    const handleBuscaAnalistaChange = (valor: string) => {
        setBuscaAnalista(valor);
        handleSalvarFiltros({ analista: valor, status: statusFiltro, busca, ano: selectedYear, mes: selectedMonth });
    };

    const handleStatusFiltroChange = (valor: string) => {
        setStatusFiltro(valor);
        handleSalvarFiltros({ analista: buscaAnalista, status: valor, busca, ano: selectedYear, mes: selectedMonth });
    };

    const handleBuscaChange = (valor: string) => {
        setBusca(valor);
        handleSalvarFiltros({ analista: buscaAnalista, status: statusFiltro, busca: valor, ano: selectedYear, mes: selectedMonth });
    };

    const handleYearChange = (valor: string) => {
        setSelectedYear(valor);
        handleSalvarFiltros({ analista: buscaAnalista, status: statusFiltro, busca, ano: valor, mes: selectedMonth });
    };

    const handleMonthChange = (valor: string) => {
        setSelectedMonth(valor);
        handleSalvarFiltros({ analista: buscaAnalista, status: statusFiltro, busca, ano: selectedYear, mes: valor, ordenacao });
    };

    const handleOrdenacaoChange = (valor: string) => {
        setOrdenacao(valor);
        handleSalvarFiltros({ analista: buscaAnalista, status: statusFiltro, busca, ano: selectedYear, mes: selectedMonth, ordenacao: valor });
    };

    const carregarVagasSemAtribuicao = useCallback(async () => {
        setLoadingVagasSemAtribuicao(true);
        try {
            // 1. IDs de eventos já atribuídos
            const { data: atribuidas } = await supabase
                .from('vagas_analista')
                .select('id_evento')
                .eq('ativo', true);
            const idsAtribuidas = new Set((atribuidas || []).map((a: any) => a.id_evento as number));

            // 2. Respostas onde a vaga foi aberta (abriu_vaga=true), tanto em aberto quanto fechadas
            // Exclui: arquivadas, não encontradas e vagasSemAbertura (abriu_vaga=false)
            const { data: respostasAbertas } = await supabase
                .from('respostas_gestor')
                .select('id_evento, vaga_preenchida, data_abertura_vaga, data_fechamento_vaga')
                .eq('abriu_vaga', true)
                .not('arquivado', 'eq', true)
                .not('nao_encontrada', 'eq', true);

            // Mapa id_evento → dados da resposta (prefere 'SIM' em caso de duplicata)
            const mapaRespostas = new Map<number, { vaga_preenchida: string | null; data_abertura_vaga: string | null; data_fechamento_vaga: string | null }>();
            (respostasAbertas || []).forEach((r: any) => {
                if (!mapaRespostas.has(r.id_evento) || r.vaga_preenchida === 'SIM') {
                    mapaRespostas.set(r.id_evento, {
                        vaga_preenchida: r.vaga_preenchida ?? null,
                        data_abertura_vaga: r.data_abertura_vaga ?? null,
                        data_fechamento_vaga: r.data_fechamento_vaga ?? null,
                    });
                }
            });

            // 3. Filtrar apenas os sem atribuição e desduplicar (um id_evento pode ter DEMISSAO e AFASTAMENTO)
            const idsSemAtribuicao = [...new Set(
                (respostasAbertas || [])
                    .map((r: any) => r.id_evento as number)
                    .filter(id => !idsAtribuidas.has(id))
            )];

            if (idsSemAtribuicao.length === 0) {
                setVagasSemAtribuicao([]);
                return;
            }

            // 4. Buscar detalhes dos eventos (chunked)
            const eventosRaw: any[] = [];
            const CHUNK_SIZE = 100;
            for (let i = 0; i < idsSemAtribuicao.length; i += CHUNK_SIZE) {
                const chunk = idsSemAtribuicao.slice(i, i + CHUNK_SIZE);
                const { data } = await supabase
                    .from('eventos_gestao_vagas_public')
                    .select('id_evento, nome, cargo, cnpj, data_evento, dias_em_aberto, situacao_origem, lotacao')
                    .in('id_evento', chunk);
                if (data) eventosRaw.push(...data);
            }

            // Desduplicar por id_evento (a view pode retornar o mesmo evento mais de uma vez)
            const eventosMap = new Map<number, any>();
            eventosRaw.forEach(e => { if (!eventosMap.has(e.id_evento)) eventosMap.set(e.id_evento, e); });
            const eventos = Array.from(eventosMap.values());

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const result: VagaSemAtribuicao[] = eventos.map(e => {
                const dataSaida = e.data_evento ? new Date(e.data_evento + 'T00:00:00') : null;
                const dias = dataSaida
                    ? Math.ceil(Math.abs(hoje.getTime() - dataSaida.getTime()) / (1000 * 60 * 60 * 24))
                    : e.dias_em_aberto || 0;
                return {
                    id_evento: e.id_evento,
                    nome: e.nome || '-',
                    cargo: e.cargo || '-',
                    cnpj: e.cnpj || '-',
                    data_evento: e.data_evento || '-',
                    dias_em_aberto: dias,
                    situacao_origem: e.situacao_origem || '-',
                    lotacao: e.lotacao || '-',
                    vaga_preenchida: mapaRespostas.get(e.id_evento)?.vaga_preenchida ?? null,
                    data_abertura_vaga: mapaRespostas.get(e.id_evento)?.data_abertura_vaga ?? null,
                    data_fechamento_vaga: mapaRespostas.get(e.id_evento)?.data_fechamento_vaga ?? null,
                };
            }).sort((a, b) => b.dias_em_aberto - a.dias_em_aberto);

            setVagasSemAtribuicao(result);
        } catch (err) {
            console.error('Erro ao carregar vagas sem atribuição:', err);
        } finally {
            setLoadingVagasSemAtribuicao(false);
        }
    }, [cnpjsSP]);

    const {
        abertasSemAtribuicao,
        fechadasSemAtribuicao
    } = useMemo(() => {
        const todasAbertas = vagasSemAtribuicaoSP.filter(v => v.vaga_preenchida !== 'SIM');
        const todasFechadas = vagasSemAtribuicaoSP.filter(v => v.vaga_preenchida === 'SIM');

        const query = (buscaSemAtribuicao || busca).trim().toLowerCase();

        if (!query) {
            return {
                abertasSemAtribuicao: todasAbertas,
                fechadasSemAtribuicao: todasFechadas,
                totalAbertasSemAtribuicao: todasAbertas.length,
                totalFechadasSemAtribuicao: todasFechadas.length
            };
        }

        const filteredAbertas = todasAbertas.filter(v =>
            v.nome.toLowerCase().includes(query) ||
            v.cargo.toLowerCase().includes(query) ||
            v.lotacao.toLowerCase().includes(query)
        );

        const filteredFechadas = todasFechadas.filter(v =>
            v.nome.toLowerCase().includes(query) ||
            v.cargo.toLowerCase().includes(query) ||
            v.lotacao.toLowerCase().includes(query)
        );

        return {
            abertasSemAtribuicao: filteredAbertas,
            fechadasSemAtribuicao: filteredFechadas
        };
    }, [vagasSemAtribuicaoSP, busca, buscaSemAtribuicao]);

    // Auto-expandir se houver resultados na busca, e recolher se não houver
    useEffect(() => {
        const query = (buscaSemAtribuicao || busca).trim();
        if (query.length >= 3) {
            setExpandirAbertasSemAtribuicao(abertasSemAtribuicao.length > 0);
            setExpandirFechadasSemAtribuicao(fechadasSemAtribuicao.length > 0);
        }
    }, [busca, buscaSemAtribuicao, abertasSemAtribuicao.length, fechadasSemAtribuicao.length]);

    useEffect(() => {
        carregarVagasSemAtribuicao();
    }, [carregarVagasSemAtribuicao]);

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-6 flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-300">Erro ao carregar agenda</h3>
                    <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
                    <button
                        onClick={carregarDados}
                        className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                        Agenda dos Analistas
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Acompanhamento de vagas por analista
                    </p>
                </div>
            </div>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Analistas</p>
                                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                    {totalAnalistas}
                                </p>
                            </div>
                            <Users className="w-12 h-12 text-blue-200 dark:text-blue-900" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Vagas Total</p>
                                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                                    {totalVagas}
                                </p>
                            </div>
                            <Briefcase className="w-12 h-12 text-slate-200 dark:text-slate-700" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Em Aberto</p>
                                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                                    {totalVagasEmAberto}
                                </p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-amber-200 dark:text-amber-900" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Críticas</p>
                                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                    {totalVagasCriticas}
                                </p>
                            </div>
                            <AlertCircle className="w-12 h-12 text-red-200 dark:text-red-900" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Busca por Analista */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Analista
                            </label>
                            <Input
                                placeholder="Buscar analista..."
                                value={buscaAnalista}
                                onChange={(e) => handleBuscaAnalistaChange(e.target.value)}
                                className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                            />
                        </div>

                        {/* Filtro por Status */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Status da Vaga
                            </label>
                            <Select value={statusFiltro} onValueChange={handleStatusFiltroChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos</SelectItem>
                                    <SelectItem value="critico">🔴 Crítico (&gt;30 dias)</SelectItem>
                                    <SelectItem value="atencao">🟡 Atenção (15-30 dias)</SelectItem>
                                    <SelectItem value="normal">🟢 Normal (&lt;15 dias)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Busca em Vagas */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Buscar vaga
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Nome, cargo, lotação..."
                                    value={busca}
                                    onChange={(e) => handleBuscaChange(e.target.value)}
                                    className="pl-10 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Filtros de Período */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {/* Ano */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Ano
                            </label>
                            <Select value={selectedYear} onValueChange={handleYearChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos os anos</SelectItem>
                                    {years.map(y => (
                                        <SelectItem key={y} value={y}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mês */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Mês
                            </label>
                            <Select value={selectedMonth} onValueChange={handleMonthChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TODOS">Todos os meses</SelectItem>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Ordenação */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Ordenar Vagas por
                            </label>
                            <Select value={ordenacao} onValueChange={handleOrdenacaoChange}>
                                <SelectTrigger className="bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="antigas">Mais antigas primeiro</SelectItem>
                                    <SelectItem value="abertura">Data de abertura (Recentes)</SelectItem>
                                    <SelectItem value="alfabetica">Nome do funcionário (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Limpar filtros de período */}
                        {(selectedYear !== 'TODOS' || selectedMonth !== 'TODOS') && (
                            <div className="flex items-end">
                                <button
                                    onClick={() => { handleYearChange('TODOS'); handleMonthChange('TODOS'); }}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Limpar período
                                </button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Vagas em Aberto sem Atribuição */}
            {(() => {
                const abertas = abertasSemAtribuicao;
                return (
                    <Card className="bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-700/50 overflow-hidden">
                        <div
                            onClick={() => setExpandirAbertasSemAtribuicao(prev => !prev)}
                            className="p-4 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors flex items-center justify-between border-b border-amber-100 dark:border-amber-800/50"
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                <div>
                                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                                        Vagas em Aberto sem Atribuição
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Vagas ainda não preenchidas sem analista responsável
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {loadingVagasSemAtribuicao ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                ) : (
                                    <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-0">
                                        {abertas.length} {abertas.length === 1 ? 'vaga' : 'vagas'} {(busca || buscaSemAtribuicao).trim() ? 'encontrada(s)' : ''}
                                    </Badge>
                                )}
                                {expandirAbertasSemAtribuicao ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>
                        </div>
                        {expandirAbertasSemAtribuicao && (
                            <CardContent className="p-4 space-y-3 bg-amber-50/30 dark:bg-amber-900/5">
                                {loadingVagasSemAtribuicao ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
                                    </div>
                                ) : abertas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <Users className="w-8 h-8 text-amber-400 mb-2" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma vaga em aberto sem analista</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome, cargo ou lotação..."
                                                value={buscaSemAtribuicao}
                                                onChange={e => setBuscaSemAtribuicao(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {abertas.map(vaga => {
                                                const statusBadge = getStatusBadge(vaga.dias_em_aberto);
                                                return (
                                                    <div key={vaga.id_evento} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1 min-w-0">
                                                                <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate min-w-0">{vaga.nome}</p>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => copiarNome(e, vaga.nome, vaga.id_evento)}
                                                                    title="Copiar nome"
                                                                    className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                >
                                                                    {copiado === vaga.id_evento ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                                </button>
                                                            </div>
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{vaga.cargo}</p>
                                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">📍 {vaga.lotacao}</span>
                                                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                                                    {statusBadge.label} • {vaga.dias_em_aberto}d
                                                                </span>
                                                            </div>
                                                            {vaga.data_abertura_vaga && (
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 font-medium">
                                                                    Abertura: {formatarData(vaga.data_abertura_vaga)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() => setVagaParaAtribuir(vaga)}
                                                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                                        >
                                                            <UserPlus className="w-3.5 h-3.5" /> Atribuir
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        )}
                    </Card>
                );
            })()}

            {/* Vagas Fechadas sem Atribuição */}
            {(() => {
                const fechadas = fechadasSemAtribuicao;
                return (
                    <Card className="bg-white dark:bg-slate-800 border-green-200 dark:border-green-700/50 overflow-hidden">
                        <div
                            onClick={() => setExpandirFechadasSemAtribuicao(prev => !prev)}
                            className="p-4 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors flex items-center justify-between border-b border-green-100 dark:border-green-800/50"
                        >
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <div>
                                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                                        Vagas Fechadas sem Atribuição
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Vagas já preenchidas sem analista responsável registrado
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {loadingVagasSemAtribuicao ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-green-500" />
                                ) : (
                                    <Badge className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 border-0">
                                        {fechadas.length} {fechadas.length === 1 ? 'vaga' : 'vagas'} {(busca || buscaSemAtribuicao).trim() ? 'encontrada(s)' : ''}
                                    </Badge>
                                )}
                                {expandirFechadasSemAtribuicao ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </div>
                        </div>
                        {expandirFechadasSemAtribuicao && (
                            <CardContent className="p-4 space-y-3 bg-green-50/30 dark:bg-green-900/5">
                                {loadingVagasSemAtribuicao ? (
                                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                                        <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
                                    </div>
                                ) : fechadas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <Users className="w-8 h-8 text-green-400 mb-2" />
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma vaga fechada sem analista</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome, cargo ou lotação..."
                                                value={buscaSemAtribuicao}
                                                onChange={e => setBuscaSemAtribuicao(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {fechadas.map(vaga => (
                                                <div key={vaga.id_evento} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm truncate min-w-0">{vaga.nome}</p>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => copiarNome(e, vaga.nome, vaga.id_evento)}
                                                                title="Copiar nome"
                                                                className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                            >
                                                                {copiado === vaga.id_evento ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{vaga.cargo}</p>
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">📍 {vaga.lotacao}</span>
                                                            <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">✓ Fechada</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-x-4 mt-1.5">
                                                            {vaga.data_abertura_vaga && (
                                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                                    Abertura: {formatarData(vaga.data_abertura_vaga)}
                                                                </p>
                                                            )}
                                                            {vaga.data_fechamento_vaga && (
                                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                                    Fechamento: {formatarData(vaga.data_fechamento_vaga)}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setVagaParaAtribuir(vaga)}
                                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                                                    >
                                                        <UserPlus className="w-3.5 h-3.5" /> Atribuir
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        )}
                    </Card>
                );
            })()}

            {/* Conteúdo Principal */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                </div>
            ) : analistasFiltrados.length === 0 ? (
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <CardContent className="p-12 text-center">
                        <Users className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                            Nenhum resultado
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400">
                            {analistas.length === 0
                                ? 'Nenhum analista com vagas atribuídas'
                                : 'Nenhum analista corresponde aos filtros selecionados'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {analistasFiltrados.map((analista) => (
                        <Card
                            key={analista.id}
                            className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                            {/* Header do Analista */}
                            <div
                                onClick={() => toggleExpandir(analista.id)}
                                className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-200 dark:border-slate-700 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <button className="text-slate-400 dark:text-slate-500">
                                        {expandidos.has(analista.id) ? (
                                            <ChevronUp className="w-5 h-5" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5" />
                                        )}
                                    </button>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                                            👤 {analista.nome}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {analista.cargo}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {analista.vagasEmAberto > 0 && (
                                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700">
                                                {analista.vagasEmAberto} em aberto
                                            </Badge>
                                        )}
                                        {analista.vagasFechadas > 0 && (
                                            <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700">
                                                {analista.vagasFechadas} fechada{analista.vagasFechadas !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                        {analista.vagasCriticas > 0 && (
                                            <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-0">
                                                {analista.vagasCriticas} crítica{analista.vagasCriticas !== 1 ? 's' : ''}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo Expansível */}
                            {expandidos.has(analista.id) && (
                                <CardContent className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                                    {analista.vagas.length === 0 ? (
                                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                                            Nenhuma vaga corresponde aos filtros
                                        </p>
                                    ) : (() => {
                                        const vagasAbertas = analista.vagas.filter(v => v.vaga_preenchida !== 'SIM');
                                        const vagasFechadas = analista.vagas.filter(v => v.vaga_preenchida === 'SIM');

                                        const renderVaga = (vaga: VagaAtribuida) => {
                                            const statusBadge = getStatusBadge(vaga.dias_reais);
                                            const key = `${analista.id}-${vaga.id_evento}`;
                                            const isRemoving = removendo === key;
                                            return (
                                                <div
                                                    key={vaga.id_evento}
                                                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-700/50"
                                                    onClick={() => setVagaSelecionada({ ...vaga, nomeAnalista: analista.nome, cargoAnalista: analista.cargo })}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                                                            {vaga.nome_funcionario}
                                                                        </h4>
                                                                        <div
                                                                            className="flex items-center"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        >
                                                                            <button
                                                                                onClick={(e) => copiarNome(e, vaga.nome_funcionario, vaga.id_evento)}
                                                                                title="Copiar nome"
                                                                                className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                            >
                                                                                {copiado === vaga.id_evento
                                                                                    ? <Check className="w-3.5 h-3.5 text-green-500" />
                                                                                    : <Copy className="w-3.5 h-3.5" />
                                                                                }
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                                        {vaga.cargo_vaga}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                                        <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600">
                                                                            📍 {vaga.lotacao}
                                                                        </Badge>
                                                                        {vaga.vaga_preenchida === 'SIM' ? (
                                                                            <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-0">
                                                                                ✓ Fechada em {vaga.dias_reais}d
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${statusBadge.bg} ${statusBadge.text} border-0`}
                                                                            >
                                                                                {statusBadge.label} • {vaga.dias_reais}d
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex flex-wrap gap-x-4 mt-2">
                                                                        <p className="text-xs text-slate-500 dark:text-slate-500">
                                                                            Atribuída em: {formatarData(vaga.data_atribuicao)}
                                                                        </p>
                                                                        {vaga.data_abertura_vaga && (
                                                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                                                                Abertura da vaga: {formatarData(vaga.data_abertura_vaga)}
                                                                            </p>
                                                                        )}
                                                                        {vaga.data_fechamento_vaga && (
                                                                            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                                                                                Fechamento da vaga: {formatarData(vaga.data_fechamento_vaga)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setVagaParaTrocar({ vaga, analistaAtualId: analista.id, analistaAtualNome: analista.nome });
                                                                }}
                                                                className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                title="Trocar analista"
                                                            >
                                                                <ArrowRight className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleRemoverVaga(vaga.id_evento, analista.id); }}
                                                                disabled={isRemoving}
                                                                className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                                                title="Remover atribuição"
                                                            >
                                                                {isRemoving ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        };

                                        return (
                                            <>
                                                {vagasAbertas.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                                                            Em Aberto ({vagasAbertas.length})
                                                        </p>
                                                        {vagasAbertas.map(renderVaga)}
                                                    </div>
                                                )}
                                                {vagasFechadas.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                                            Fechadas ({vagasFechadas.length})
                                                        </p>
                                                        {vagasFechadas.map(renderVaga)}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal para Trocar Analista */}
            {vagaParaTrocar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-sm bg-white dark:bg-slate-800">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                    Trocar Analista
                                </h3>
                                <button
                                    onClick={() => {
                                        setVagaParaTrocar(null);
                                        setAnalistaNovoSelecionado(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-3 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <strong>Funcionário:</strong> {vagaParaTrocar.vaga.nome_funcionario}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <strong>Cargo:</strong> {vagaParaTrocar.vaga.cargo_vaga}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    <strong>Analista atual:</strong> {vagaParaTrocar.analistaAtualNome}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Novo Analista *
                                </label>
                                <Select value={analistaNovoSelecionado || ''} onValueChange={setAnalistaNovoSelecionado}>
                                    <SelectTrigger className="bg-white dark:bg-slate-700">
                                        <SelectValue placeholder="Selecione um analista" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {analistas
                                            .filter(a => a.id !== vagaParaTrocar.analistaAtualId)
                                            .sort((a, b) => a.nome.localeCompare(b.nome))
                                            .map(analista => (
                                                <SelectItem key={analista.id} value={String(analista.id)}>
                                                    {analista.nome} ({analista.totalVagas} vagas)
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => {
                                        setVagaParaTrocar(null);
                                        setAnalistaNovoSelecionado(null);
                                    }}
                                    className="flex-1 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleTrocarAnalista}
                                    disabled={!analistaNovoSelecionado || trocando}
                                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    {trocando && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {trocando ? 'Trocando...' : 'Confirmar'}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal de Detalhes */}
            {vagaSelecionada && (
                <VagaDetalhesModal
                    vaga={vagaSelecionada}
                    onClose={() => setVagaSelecionada(null)}
                    onVagaFechada={() => { setVagaSelecionada(null); carregarDados(); }}
                />
            )}

            {/* Modal de Atribuição (vagas sem analista) */}
            <AtribuirVagaModal
                open={!!vagaParaAtribuir}
                onOpenChange={(isOpen) => {
                    if (!isOpen) setVagaParaAtribuir(null);
                }}
                vaga={vagaParaAtribuir ? {
                    id_evento: vagaParaAtribuir.id_evento,
                    quem_saiu: vagaParaAtribuir.nome,
                    cargo_saiu: vagaParaAtribuir.cargo,
                    dias_em_aberto: vagaParaAtribuir.dias_em_aberto,
                    cnpj: vagaParaAtribuir.cnpj,
                    nome: vagaParaAtribuir.nome,
                    cargo: vagaParaAtribuir.cargo,
                    lotacao: vagaParaAtribuir.lotacao,
                    data_evento: vagaParaAtribuir.data_evento,
                    situacao_origem: vagaParaAtribuir.situacao_origem,
                    vaga_preenchida: vagaParaAtribuir.vaga_preenchida,
                } : null}
                onAtribuicaoCompleta={() => {
                    carregarVagasSemAtribuicao();
                    carregarDados();
                }}
                onMarcarInativo={vagaParaAtribuir ? async () => {
                    await supabase
                        .from('respostas_gestor')
                        .update({ arquivado: true })
                        .eq('id_evento', vagaParaAtribuir.id_evento);
                } : undefined}
            />
        </div>
    );
}

export default AgendaAnalistas;
