import { useState, useCallback, useEffect } from 'react';
import { Search, Users, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { FuncionarioProfile } from './FuncionarioProfile';
import { formatarData } from '@/lib/column-formatters';

export function EmployeeSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  // Buscar funcionários apenas quando digitam
  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (searchTerm.trim().length === 0) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      if (searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const searchLower = searchTerm.toLowerCase();

        // Buscar por nome ou CPF
        const { data, error: queryError } = await supabase
          .from('oris_funcionarios')
          .select('nome, cpf, cargo, local_de_trabalho, centro_custo, situacao, dt_admissao, nome_fantasia, tipo_funcionario, dt_inicio_situacao, dt_rescisao, dt_nascimento, sexo')
          .or(`nome.ilike.%${searchLower}%,cpf.ilike.%${searchLower}%`)
          .limit(50);

        if (queryError) {
          setError('Erro ao buscar funcionários');
          console.error(queryError);
        } else {
          setResults(data || []);
        }
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500); // Aguarda 500ms após o usuário parar de digitar

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
          <Users className="text-blue-600" />
          Pesquisa
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Busque um funcionário para ver seus dados
        </p>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400 font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Caixa de Pesquisa */}
      <Card className="border-none shadow-sm bg-white dark:bg-slate-800">
        <CardContent className="p-6">
          <Label className="text-xs font-bold uppercase text-slate-500 mb-3 block flex items-center gap-1">
            <Search className="w-3 h-3" /> Buscar Funcionário
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
            <Input
              type="text"
              placeholder="Digite nome ou CPF (mín. 2 caracteres)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white/50 dark:bg-slate-800/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-slate-600 dark:text-slate-400 font-medium">Buscando...</span>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Digite para começar a busca</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Insira o nome ou CPF do funcionário
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nenhum resultado encontrado</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Verifique a grafia ou tente um termo diferente
          </p>
        </div>
      ) : (
        <Card className="border-none shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Situação</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nome</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Cargo</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Nome Fantasia</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Centro Custo</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Admissao</th>
                    <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">Rescisao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {results.map((func, idx) => (
                    <tr
                      key={idx}
                      onClick={() => setSelectedEmployee(func)}
                      className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <Badge
                          className={`text-xs font-semibold ${
                            func.situacao?.includes('ATIVO')
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {func.situacao || 'Desconhecida'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-900 dark:text-slate-100 font-medium text-blue-600 dark:text-blue-400">
                          {func.nome || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{func.cargo || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{func.nome_fantasia || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{func.centro_custo || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{formatarData(func.dt_admissao)}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">{formatarData(func.dt_rescisao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal do Perfil do Funcionário */}
      {selectedEmployee && (
        <FuncionarioProfile
          funcionario={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
