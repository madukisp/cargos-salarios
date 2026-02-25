// Serviço de acesso ao Base BI RH (IndexedDB local)
// Os dados são carregados uma única vez e mantidos em cache em memória

const BI_DB_NAME = 'base_bi_rh';
const BI_STORE_NAME = 'planilha';
const BI_KEY = 'atual';

export function normBI(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

export const BI_COLUNAS = [  
  { label: 'Processo', chave: 'Nº PROCESSO' },
  { label: 'Analista', chave: 'ANALISTA RESPONSÁVEL PELO PROCESSO' },
  { label: 'Colaborador', chave: 'NOME - COLABORADOR' },
  { label: 'Abertura', chave: 'ABERTURA' },
  { label: 'Fechamento', chave: 'FECHAMENTO' },
  { label: 'Substituto', chave: 'SUBSTITUIDO POR' },
  { label: 'Unidade', chave: 'UNIDADE' },
  { label: 'Função', chave: 'FUNÇÃO' },
  { label: 'Motivo', chave: 'MOTIVO DO DESLIGAMENTO' },
] as const;

interface BiAllData {
  allRows: Record<string, any>[];
  headers: string[];
  nomeCol: string | null;
}

let _cache: BiAllData | null = null;
let _loadPromise: Promise<BiAllData> | null = null;

async function _carregarTodos(): Promise<BiAllData> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(BI_DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(BI_STORE_NAME);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const stored: any = await new Promise((resolve, reject) => {
      const tx = db.transaction(BI_STORE_NAME, 'readonly');
      const req = tx.objectStore(BI_STORE_NAME).get(BI_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    if (!stored?.sheetsData) return { allRows: [], headers: [], nomeCol: null };

    const allRows: Record<string, any>[] = [];
    let bestHeaders: string[] = [];
    for (const sd of Object.values(stored.sheetsData) as { headers: string[]; rows: Record<string, any>[] }[]) {
      if (sd.headers.length > bestHeaders.length) bestHeaders = sd.headers;
      allRows.push(...sd.rows);
    }
    const nomeCol = bestHeaders.find(h => normBI(h) === normBI('NOME - COLABORADOR')) ?? null;
    return { allRows, headers: bestHeaders, nomeCol };
  } catch {
    return { allRows: [], headers: [], nomeCol: null };
  }
}

export async function buscarRegistrosBIByNome(nome: string): Promise<{ rows: Record<string, any>[]; headers: string[] }> {
  if (!_cache) {
    if (!_loadPromise) {
      _loadPromise = _carregarTodos().then(d => { _cache = d; return d; });
    }
    _cache = await _loadPromise;
  }
  const { allRows, headers, nomeCol } = _cache;
  if (!nomeCol) return { rows: [], headers };
  const nomeNorm = normBI(nome);
  const rows = allRows.filter(r => normBI(String(r[nomeCol] ?? '')) === nomeNorm);

  // O usuário solicitou que, se houver duplicidade, seja exibido o registro com o maior Nº Processo primeiro.
  const colProcesso = headers.find(h => {
    const n = normBI(h);
    return n === 'n processo' || n === 'nº processo' || n === 'numero processo' || n === 'processo' || n === 'no processo' || n.includes('nº do processo');
  });

  if (colProcesso) {
    rows.sort((a, b) => {
      const parseNum = (val: any) => {
        const s = String(val ?? '0').replace(/[^\d.,-]/g, '').replace(',', '.');
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
      };
      return parseNum(b[colProcesso]) - parseNum(a[colProcesso]);
    });
  }

  return { rows, headers };
}

/** Invalida o cache (chamar após novo upload na Base BI) */
export function invalidarCacheBI() {
  _cache = null;
  _loadPromise = null;
}
