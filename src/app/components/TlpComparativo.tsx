import { useEffect, useMemo, useState } from 'react';
import { useTlpData, TlpData } from '@/app/hooks/useTlpData';
import { ChevronLeft, TrendingDown, TrendingUp, Minus, Users, AlertCircle, Loader2 } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

type Status = 'deficit' | 'excedente' | 'completo';

function statusLabel(s: Status) {
    if (s === 'deficit') return 'DEFICIT';
    if (s === 'excedente') return 'EXCEDENTE';
    return 'OK';
}

function contratoStatus(items: TlpData[]): Status {
    if (items.some(i => i.status === 'deficit')) return 'deficit';
    if (items.some(i => i.status === 'excedente')) return 'excedente';
    return 'completo';
}

function formatCH(ch: string | number | null | undefined): string {
    if (!ch || ch === 'N/A') return '—';
    return `${ch}h`;
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold';
    if (status === 'deficit') return (
        <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300`}>
            <TrendingDown className="w-3 h-3" /> DEFICIT
        </span>
    );
    if (status === 'excedente') return (
        <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300`}>
            <TrendingUp className="w-3 h-3" /> EXCEDENTE
        </span>
    );
    return (
        <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300`}>
            <Minus className="w-3 h-3" /> OK
        </span>
    );
}

function SaldoCell({ saldo }: { saldo: number }) {
    if (saldo < 0) return <span className="font-mono font-semibold text-red-600 dark:text-red-400">{saldo}</span>;
    if (saldo > 0) return <span className="font-mono font-semibold text-yellow-600 dark:text-yellow-400">+{saldo}</span>;
    return <span className="font-mono text-green-600 dark:text-green-400">0</span>;
}

// ── Card de contrato ──────────────────────────────────────────────────────────

interface ContratoResumo {
    unidade: string;
    tlp: number;
    ativos: number;
    afastados: number;
    status: Status;
    totalCargos: number;
    deficits: number;
}

function ContratoCard({ contrato, onClick }: { contrato: ContratoResumo; onClick: () => void }) {
    const borderColor =
        contrato.status === 'deficit' ? 'border-l-red-500' :
        contrato.status === 'excedente' ? 'border-l-yellow-500' :
        'border-l-green-500';

    return (
        <button
            onClick={onClick}
            className={`w-full text-left bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${borderColor} p-4 hover:shadow-md transition-all hover:-translate-y-0.5`}
        >
            <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                    {contrato.unidade}
                </h3>
                <StatusBadge status={contrato.status} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">TLP</p>
                    <p className="font-mono font-bold text-blue-600 dark:text-blue-400">{contrato.tlp}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ativos</p>
                    <p className="font-mono font-bold text-green-600 dark:text-green-400">{contrato.ativos}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo</p>
                    <SaldoCell saldo={contrato.ativos - contrato.tlp} />
                </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{contrato.totalCargos} cargo{contrato.totalCargos !== 1 ? 's' : ''}</span>
                {contrato.deficits > 0 && (
                    <span className="flex items-center gap-1 text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        {contrato.deficits} em deficit
                    </span>
                )}
            </div>
        </button>
    );
}

// ── Tabela de cargos ──────────────────────────────────────────────────────────

function TabelaCargos({ items, unidade }: { items: TlpData[]; unidade: string }) {
    // Ordenar: deficit primeiro, depois por cargo
    const sorted = [...items].sort((a, b) => {
        const ord = { deficit: 0, excedente: 1, completo: 2 };
        if (ord[a.status] !== ord[b.status]) return ord[a.status] - ord[b.status];
        return a.cargo.localeCompare(b.cargo);
    });

    const totalTlp = items.reduce((s, i) => s + i.tlp, 0);
    const totalAtivos = items.reduce((s, i) => s + i.ativos, 0);
    const totalAfastados = items.reduce((s, i) => s + i.afastados, 0);
    const totalSaldo = totalAtivos - totalTlp;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Cargo</th>
                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-300 hidden md:table-cell">Centro de Custo</th>
                            <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">CH</th>
                            <th className="text-right px-3 py-3 font-semibold text-blue-600 dark:text-blue-400">TLP</th>
                            <th className="text-right px-3 py-3 font-semibold text-green-600 dark:text-green-400">Ativos</th>
                            <th className="text-right px-3 py-3 font-semibold text-yellow-600 dark:text-yellow-400 hidden sm:table-cell">Afastd</th>
                            <th className="text-right px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">Saldo</th>
                            <th className="text-center px-3 py-3 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {sorted.map((item, idx) => (
                            <tr
                                key={`${item.cargo}-${item.centro_custo}-${idx}`}
                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                                    item.status === 'deficit' ? 'bg-red-50/40 dark:bg-red-900/10' : ''
                                }`}
                            >
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                                    {item.cargo}
                                </td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden md:table-cell">
                                    {item.centro_custo}
                                </td>
                                <td className="px-3 py-3 text-center text-gray-500 dark:text-gray-400">
                                    {formatCH(item.carga_horaria_semanal)}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-blue-600 dark:text-blue-400">
                                    {item.tlp}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-green-600 dark:text-green-400">
                                    {item.ativos}
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-yellow-600 dark:text-yellow-400 hidden sm:table-cell">
                                    {item.afastados}
                                </td>
                                <td className="px-3 py-3 text-right">
                                    <SaldoCell saldo={item.saldo} />
                                </td>
                                <td className="px-3 py-3 text-center">
                                    <StatusBadge status={item.status} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-700/60 border-t-2 border-gray-300 dark:border-gray-500 font-semibold">
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-200" colSpan={3}>
                                TOTAL — {items.length} cargo{items.length !== 1 ? 's' : ''}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-blue-600 dark:text-blue-400">{totalTlp}</td>
                            <td className="px-3 py-3 text-right font-mono text-green-600 dark:text-green-400">{totalAtivos}</td>
                            <td className="px-3 py-3 text-right font-mono text-yellow-600 dark:text-yellow-400 hidden sm:table-cell">{totalAfastados}</td>
                            <td className="px-3 py-3 text-right"><SaldoCell saldo={totalSaldo} /></td>
                            <td className="px-3 py-3 text-center">
                                <StatusBadge status={contratoStatus(items)} />
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function TlpComparativo() {
    const { data, loading, error, loadData } = useTlpData();
    const [contratoSelecionado, setContratoSelecionado] = useState<string | null>(null);
    const [filtroStatus, setFiltroStatus] = useState<Status | 'todos'>('todos');
    const [busca, setBusca] = useState('');

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Agrupar dados por unidade
    const contratos: ContratoResumo[] = useMemo(() => {
        const map = new Map<string, TlpData[]>();
        data
            .filter(d => !d.arquivado)
            .forEach(d => {
                if (!map.has(d.unidade)) map.set(d.unidade, []);
                map.get(d.unidade)!.push(d);
            });

        return Array.from(map.entries()).map(([unidade, items]) => ({
            unidade,
            tlp: items.reduce((s, i) => s + i.tlp, 0),
            ativos: items.reduce((s, i) => s + i.ativos, 0),
            afastados: items.reduce((s, i) => s + i.afastados, 0),
            status: contratoStatus(items),
            totalCargos: items.length,
            deficits: items.filter(i => i.status === 'deficit').length,
        })).sort((a, b) => {
            // Deficit primeiro
            const ord = { deficit: 0, excedente: 1, completo: 2 };
            if (ord[a.status] !== ord[b.status]) return ord[a.status] - ord[b.status];
            return a.unidade.localeCompare(b.unidade);
        });
    }, [data]);

    const contratosFiltrados = useMemo(() => {
        return contratos.filter(c => {
            const matchStatus = filtroStatus === 'todos' || c.status === filtroStatus;
            const matchBusca = c.unidade.toLowerCase().includes(busca.toLowerCase());
            return matchStatus && matchBusca;
        });
    }, [contratos, filtroStatus, busca]);

    const itensSelecionados = useMemo(() => {
        if (!contratoSelecionado) return [];
        return data.filter(d => d.unidade === contratoSelecionado && !d.arquivado);
    }, [data, contratoSelecionado]);

    const totalGeral = useMemo(() => ({
        tlp: contratos.reduce((s, c) => s + c.tlp, 0),
        ativos: contratos.reduce((s, c) => s + c.ativos, 0),
        afastados: contratos.reduce((s, c) => s + c.afastados, 0),
    }), [contratos]);

    // ── Render ──

    if (loading) return (
        <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando dados do Supabase...</span>
        </div>
    );

    if (error) return (
        <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <strong>Erro ao carregar dados:</strong> {error}
        </div>
    );

    return (
        <div className="p-6 max-w-screen-2xl mx-auto space-y-6">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Comparativo TLP por Cargo
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    TLP (meta) vs funcionários ativos por cargo e carga horária
                </p>
            </div>

            {/* Cards de resumo geral */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Contratos</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{contratos.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">TLP Total</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalGeral.tlp}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ativos</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalGeral.ativos}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Saldo Geral</p>
                    <p className="text-2xl font-bold">
                        <SaldoCell saldo={totalGeral.ativos - totalGeral.tlp} />
                    </p>
                </div>
            </div>

            {/* Detalhe de contrato selecionado */}
            {contratoSelecionado ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setContratoSelecionado(null)}
                            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Todos os contratos
                        </button>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {contratoSelecionado}
                        </h2>
                    </div>
                    <TabelaCargos items={itensSelecionados} unidade={contratoSelecionado} />
                </div>
            ) : (
                /* Lista de contratos */
                <div className="space-y-4">
                    {/* Filtros */}
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Buscar contrato..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                        />
                        <div className="flex gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                            {(['todos', 'deficit', 'excedente', 'completo'] as const).map(s => (
                                <button
                                    key={s}
                                    onClick={() => setFiltroStatus(s)}
                                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                        filtroStatus === s
                                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {s === 'todos' ? 'Todos' :
                                     s === 'deficit' ? 'Deficit' :
                                     s === 'excedente' ? 'Excedente' : 'OK'}
                                    {' '}
                                    <span className="opacity-60">
                                        ({contratos.filter(c => s === 'todos' || c.status === s).length})
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Grade de cards */}
                    {contratosFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                            <Users className="w-10 h-10 mb-3 opacity-40" />
                            <p>Nenhum contrato encontrado</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {contratosFiltrados.map(c => (
                                <ContratoCard
                                    key={c.unidade}
                                    contrato={c}
                                    onClick={() => setContratoSelecionado(c.unidade)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
