import { useState, useCallback, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Download,
  Copy,
  Check,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

// ─── IndexedDB helpers ───────────────────────────────────────────────────────
const DB_NAME = 'base_bi_rh';
const STORE = 'planilha';
const KEY = 'atual';

function abrirDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function salvarNoDB(payload: StoredSheet) {
  const db = await abrirDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(payload, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function carregarDoDB(): Promise<StoredSheet | null> {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface StoredSheet {
  nomeArquivo: string;
  abas: string[];
  dataUpload: string; // ISO string
  sheetsData: Record<string, { headers: string[]; rows: Record<string, any>[] }>;
}

interface SheetView {
  nomeArquivo: string;
  abas: string[];
  abaSelecionada: string;
  headers: string[];
  rows: Record<string, any>[];
  dataUpload: string;
  sheetsData: Record<string, { headers: string[]; rows: Record<string, any>[] }>;
}

type SortConfig = { key: string; dir: 'asc' | 'desc' } | null;

// ─── Parse helpers ────────────────────────────────────────────────────────────
function parsearAba(ws: XLSX.WorkSheet): { headers: string[]; rows: Record<string, any>[] } {
  const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!jsonData || jsonData.length === 0) return { headers: [], rows: [] };

  const rawHeaders = (jsonData[0] as any[]).map((h, i) =>
    h !== '' && h !== null && h !== undefined ? String(h) : `Coluna ${i + 1}`
  );
  const colsComDados = rawHeaders
    .map((h, i) => ({ h, i }))
    .filter(({ i }) => jsonData.slice(1).some(row => row[i] !== '' && row[i] !== null && row[i] !== undefined));

  const headers = colsComDados.map(c => c.h);
  const rows = jsonData.slice(1)
    .filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined))
    .map(row => {
      const obj: Record<string, any> = {};
      colsComDados.forEach(({ h, i }) => {
        const val = row[i];
        obj[h] = val instanceof Date ? val.toLocaleDateString('pt-BR') : (val ?? '');
      });
      return obj;
    });

  return { headers, rows };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function LinhaDetalhesModal({ row, headers, onClose }: {
  row: Record<string, any>;
  headers: string[];
  onClose: () => void;
}) {
  const [copiado, setCopiado] = useState(false);

  const copiarTudo = () => {
    const texto = headers
      .map(h => `${h.padEnd(40, ' ')}: ${String(row[h] ?? '')}`)
      .join('\n');
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            Detalhes do Registro
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copiarTudo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {copiado ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-6">
          <div className="bg-slate-900 dark:bg-slate-950 rounded-lg p-5 font-mono text-sm space-y-1.5">
            {headers.map((h) => {
              const valor = String(row[h] ?? '');
              const vazio = valor.trim() === '';
              return (
                <div key={h} className="flex gap-2 items-baseline leading-relaxed">
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 w-64 text-right pr-1 uppercase tracking-wide text-xs">
                    {h}
                  </span>
                  <span className="text-green-400 dark:text-green-500 shrink-0">:</span>
                  <span className={`break-all ${vazio ? 'text-slate-600 italic' : 'text-slate-100'}`}>
                    {vazio ? '—' : valor}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportarCSV(headers: string[], rows: Record<string, any>[], nomeArquivo: string) {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.map(escape).join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo.replace(/\.[^.]+$/, '') + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function formatarDataUpload(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Colunas com filtro dedicado ─────────────────────────────────────────────
const COLUNAS_FILTRO = [
  'ANALISTA RESPONSÁVEL PELO PROCESSO',
  'NOME - COLABORADOR',
  'UNIDADE',
  'FUNÇÃO',
] as const;

const FILTROS_VAZIOS: Record<string, string> = Object.fromEntries(COLUNAS_FILTRO.map(c => [c, '']));

// Normaliza texto ignorando acentos e capitalização
function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

// Encontra o nome real do header na planilha fazendo match insensível a acento/caixa
function encontrarHeader(headers: string[], alvo: string): string | null {
  const alvoNorm = norm(alvo);
  return headers.find(h => norm(h) === alvoNorm) ?? null;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BaseBI() {
  const [sheet, setSheet] = useState<SheetView | null>(null);
  const [carregandoDB, setCarregandoDB] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [filtrosColuna, setFiltrosColuna] = useState<Record<string, string>>(FILTROS_VAZIOS);
  const [sort, setSort] = useState<SortConfig>(null);
  const [pagina, setPagina] = useState(1);
  const [linhaSelecionada, setLinhaSelecionada] = useState<Record<string, any> | null>(null);
  const [colunasOrdem, setColunasOrdem] = useState<string[]>([]);
  const [dragSobreIdx, setDragSobreIdx] = useState<number>(-1);
  const dragColIdx = useRef<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const LINHAS_POR_PAGINA = 100;

  // Sincronizar ordem das colunas quando a aba muda
  useEffect(() => {
    if (sheet) setColunasOrdem(sheet.headers);
  }, [sheet?.abaSelecionada, sheet?.nomeArquivo]);

  // Handlers de drag de colunas
  const iniciarDragCol = (idx: number) => { dragColIdx.current = idx; };
  const sobreDragCol = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (idx !== dragColIdx.current) setDragSobreIdx(idx);
  };
  const soltarDragCol = (idx: number) => {
    const de = dragColIdx.current;
    if (de !== -1 && de !== idx) {
      setColunasOrdem(prev => {
        const nova = [...prev];
        const [col] = nova.splice(de, 1);
        nova.splice(idx, 0, col);
        return nova;
      });
    }
    dragColIdx.current = -1;
    setDragSobreIdx(-1);
  };
  const fimDragCol = () => { dragColIdx.current = -1; setDragSobreIdx(-1); };

  // Carregar do IndexedDB ao montar
  useEffect(() => {
    carregarDoDB()
      .then(stored => {
        if (stored) {
          const aba = stored.abas[0];
          const { headers, rows } = stored.sheetsData[aba] ?? { headers: [], rows: [] };
          setSheet({ ...stored, abaSelecionada: aba, headers, rows });
        }
      })
      .catch(console.error)
      .finally(() => setCarregandoDB(false));
  }, []);

  const aplicarAba = (stored: StoredSheet, aba: string): SheetView => {
    const { headers, rows } = stored.sheetsData[aba] ?? { headers: [], rows: [] };
    return { ...stored, abaSelecionada: aba, headers, rows };
  };

  const processarArquivo = useCallback((file: File) => {
    setErro(null);
    if (!file.name.match(/\.(xlsx|xls|xlsm|csv)$/i)) {
      setErro('Formato não suportado. Use .xlsx, .xls ou .csv');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setSalvando(true);
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const abas = workbook.SheetNames;

        if (abas.length === 0) { setErro('Planilha sem abas.'); setSalvando(false); return; }

        const sheetsData: Record<string, { headers: string[]; rows: Record<string, any>[] }> = {};
        for (const aba of abas) {
          sheetsData[aba] = parsearAba(workbook.Sheets[aba]);
        }

        const stored: StoredSheet = {
          nomeArquivo: file.name,
          abas,
          dataUpload: new Date().toISOString(),
          sheetsData,
        };

        await salvarNoDB(stored);

        const aba = abas[0];
        setSheet(aplicarAba(stored, aba));
        setBusca('');
        setFiltrosColuna(FILTROS_VAZIOS);
        setSort(null);
        setPagina(1);
      } catch (err) {
        setErro('Erro ao ler o arquivo. Verifique se não está corrompido.');
        console.error(err);
      } finally {
        setSalvando(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const trocarAba = (aba: string) => {
    if (!sheet) return;
    const stored: StoredSheet = {
      nomeArquivo: sheet.nomeArquivo,
      abas: sheet.abas,
      dataUpload: sheet.dataUpload,
      sheetsData: sheet.sheetsData,
    };
    setSheet(aplicarAba(stored, aba));
    setBusca('');
    setFiltrosColuna(FILTROS_VAZIOS);
    setSort(null);
    setPagina(1);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  }, [processarArquivo]);

  const handleSort = (key: string) => {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    setPagina(1);
  };

  // Mapeia cada coluna esperada para o header real encontrado na planilha
  const mapeamentoColunas: Record<string, string> = {};
  if (sheet) {
    for (const col of COLUNAS_FILTRO) {
      const real = encontrarHeader(sheet.headers, col);
      if (real) mapeamentoColunas[col] = real;
    }
  }

  const termoBusca = busca.toLowerCase().trim();
  const filtrosAtivos = Object.entries(filtrosColuna).filter(([, v]) => v.trim() !== '');
  const rowsFiltrados = sheet
    ? sheet.rows.filter(row => {
        if (termoBusca && !Object.values(row).some(v => String(v).toLowerCase().includes(termoBusca))) return false;
        for (const [col, val] of filtrosAtivos) {
          const headerReal = mapeamentoColunas[col] ?? col;
          if (!String(row[headerReal] ?? '').toLowerCase().includes(val.toLowerCase().trim())) return false;
        }
        return true;
      })
    : [];

  const rowsOrdenados = sort
    ? [...rowsFiltrados].sort((a, b) => {
        const va = String(a[sort.key] ?? ''), vb = String(b[sort.key] ?? '');
        const num = (s: string) => parseFloat(s.replace(/[^\d.,-]/g, '').replace(',', '.'));
        const na = num(va), nb = num(vb);
        const cmp = !isNaN(na) && !isNaN(nb) ? na - nb : va.localeCompare(vb, 'pt-BR');
        return sort.dir === 'asc' ? cmp : -cmp;
      })
    : rowsFiltrados;

  const totalPaginas = Math.ceil(rowsOrdenados.length / LINHAS_POR_PAGINA);
  const rowsPagina = rowsOrdenados.slice((pagina - 1) * LINHAS_POR_PAGINA, pagina * LINHAS_POR_PAGINA);

  const SortIcon = ({ col }: { col: string }) => {
    if (sort?.key !== col) return <ChevronsUpDown className="w-3 h-3 opacity-30" />;
    return sort.dir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-500" /> : <ChevronDown className="w-3 h-3 text-blue-500" />;
  };

  if (carregandoDB) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Base BI RH</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {sheet
                ? `${sheet.nomeArquivo}`
                : 'Faça upload da planilha para começar'}
            </p>
          </div>
        </div>
        {/* Último upload */}
        {sheet && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            <span>Último upload: <strong className="text-slate-700 dark:text-slate-300">{formatarDataUpload(sheet.dataUpload)}</strong></span>
          </div>
        )}
      </div>

      {/* Área de Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !salvando && inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-xl flex items-center gap-5 px-8 py-6 cursor-pointer transition-all
          ${dragging
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : sheet
              ? 'border-slate-200 dark:border-slate-700 hover:border-green-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800'
              : 'border-slate-300 dark:border-slate-600 hover:border-green-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-800'
          }
        `}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.xlsm,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processarArquivo(f); e.target.value = ''; }} />
        {salvando
          ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 flex-shrink-0" />
          : <RefreshCw className={`w-8 h-8 flex-shrink-0 ${dragging ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`} />
        }
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {salvando ? 'Salvando planilha...' : sheet ? 'Clique para atualizar a planilha' : 'Clique ou arraste a planilha aqui'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {sheet
              ? 'A versão atual fica salva no navegador — só faça upload quando a planilha for atualizada'
              : 'Suporta .xlsx, .xls e .csv — a planilha é salva localmente e carregada automaticamente nas próximas visitas'}
          </p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400 text-sm">
          <X className="w-4 h-4 flex-shrink-0" />
          {erro}
        </div>
      )}

      {/* Dados */}
      {sheet && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Total de linhas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sheet.rows.length.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Colunas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{colunasOrdem.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Resultado filtrado</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{rowsOrdenados.length.toLocaleString('pt-BR')}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">Abas</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{sheet.abas.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Seletor de abas */}
          {sheet.abas.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {sheet.abas.map(aba => (
                <button
                  key={aba}
                  onClick={() => trocarAba(aba)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    aba === sheet.abaSelecionada
                      ? 'bg-green-600 text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {aba}
                </button>
              ))}
            </div>
          )}

          {/* Busca geral + Exportar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar em qualquer coluna..."
                value={busca}
                onChange={e => { setBusca(e.target.value); setPagina(1); }}
                className="pl-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
              {busca && (
                <button onClick={() => { setBusca(''); setPagina(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => exportarCSV(colunasOrdem, rowsOrdenados, sheet.nomeArquivo)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>

          {/* Filtros por coluna */}
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />
                Filtros por coluna
                {filtrosAtivos.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">
                    {filtrosAtivos.length} ativo{filtrosAtivos.length > 1 ? 's' : ''}
                  </span>
                )}
              </p>
              {filtrosAtivos.length > 0 && (
                <button
                  onClick={() => { setFiltrosColuna(FILTROS_VAZIOS); setPagina(1); }}
                  className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Limpar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {COLUNAS_FILTRO.map(col => {
                const headerReal = mapeamentoColunas[col];
                const existeNaAba = !!headerReal;
                return (
                  <div key={col} className="relative">
                    <label
                      className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 truncate"
                      title={headerReal ? `Coluna: "${headerReal}"` : `Coluna não encontrada: "${col}"`}
                    >
                      {col}
                    </label>
                    <div className="relative">
                      <Input
                        placeholder={existeNaAba ? 'Filtrar...' : 'Coluna não encontrada'}
                        value={filtrosColuna[col]}
                        disabled={!existeNaAba}
                        onChange={e => {
                          setFiltrosColuna(prev => ({ ...prev, [col]: e.target.value }));
                          setPagina(1);
                        }}
                        className={`pr-7 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 ${
                          filtrosColuna[col] ? 'border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700' : ''
                        } ${!existeNaAba ? 'opacity-40 cursor-not-allowed' : ''}`}
                      />
                      {filtrosColuna[col] && (
                        <button
                          onClick={() => { setFiltrosColuna(prev => ({ ...prev, [col]: '' })); setPagina(1); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela */}
          <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 w-12">#</th>
                    {colunasOrdem.map((col, idx) => (
                      <th
                        key={col}
                        draggable
                        onDragStart={() => iniciarDragCol(idx)}
                        onDragOver={e => sobreDragCol(idx, e)}
                        onDrop={() => soltarDragCol(idx)}
                        onDragEnd={fimDragCol}
                        onClick={() => handleSort(col)}
                        title="Arraste para reorganizar"
                        className={`px-3 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap cursor-grab active:cursor-grabbing select-none transition-colors ${
                          dragSobreIdx === idx
                            ? 'bg-green-100 dark:bg-green-900/40 border-l-2 border-green-500'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-1">{col}<SortIcon col={col} /></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {rowsPagina.length === 0 ? (
                    <tr>
                      <td colSpan={colunasOrdem.length + 1} className="px-3 py-12 text-center text-slate-500 dark:text-slate-400">
                        Nenhum resultado para "{busca}"
                      </td>
                    </tr>
                  ) : (
                    rowsPagina.map((row, i) => (
                      <tr
                        key={i}
                        onClick={() => setLinhaSelecionada(row)}
                        className="hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500">{(pagina - 1) * LINHAS_POR_PAGINA + i + 1}</td>
                        {colunasOrdem.map(col => {
                          const valor = String(row[col] ?? '');
                          const isVaga = col === mapeamentoColunas['NOME - COLABORADOR'] && valor.toUpperCase().includes('VAGA ABERTA');
                          return (
                            <td
                              key={col}
                              className={`px-3 py-2 whitespace-nowrap max-w-xs truncate ${isVaga ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-slate-800 dark:text-slate-200'}`}
                              title={valor}
                            >
                              {isVaga ? '🔴 ' : ''}{valor}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Exibindo {(pagina - 1) * LINHAS_POR_PAGINA + 1}–{Math.min(pagina * LINHAS_POR_PAGINA, rowsOrdenados.length)} de {rowsOrdenados.length.toLocaleString('pt-BR')} linhas
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300">
                    ← Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, idx) => {
                      let pg = idx + 1;
                      if (totalPaginas > 5) {
                        if (pagina <= 3) pg = idx + 1;
                        else if (pagina >= totalPaginas - 2) pg = totalPaginas - 4 + idx;
                        else pg = pagina - 2 + idx;
                      }
                      return (
                        <button key={pg} onClick={() => setPagina(pg)} className={`w-8 h-8 text-xs rounded-lg transition-colors ${pg === pagina ? 'bg-green-600 text-white font-semibold' : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                          {pg}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-300">
                    Próxima →
                  </button>
                </div>
              </div>
            )}
          </Card>

          {busca && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">Filtro ativo:</span>
              <Badge variant="outline" className="gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700">
                "{busca}"
                <button onClick={() => { setBusca(''); setPagina(1); }}><X className="w-3 h-3 ml-1" /></button>
              </Badge>
            </div>
          )}
        </>
      )}

      {linhaSelecionada && sheet && (
        <LinhaDetalhesModal row={linhaSelecionada} headers={colunasOrdem} onClose={() => setLinhaSelecionada(null)} />
      )}
    </div>
  );
}
