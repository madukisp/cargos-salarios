import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { formatarData } from '@/lib/column-formatters';

export interface TlpData {
    id?: number;
    cargo: string;
    unidade: string;
    centro_custo: string;
    tlp: number;
    ativos: number;
    afastados: number;
    saldo: number;
    status: 'deficit' | 'excedente' | 'completo';
    anotacoes?: string | null;
    carga_horaria_semanal?: string | number | null;
    arquivado?: boolean;
    funcionarios?: { nome: string; dataAdmissao: string; situacao?: string; carga_horaria_semanal?: string | number | null }[];
}

export function useTlpData() {
    const [data, setData] = useState<TlpData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [unidades, setUnidades] = useState<string[]>([]);

    // Carregar lista de unidades ao montar
    useEffect(() => {
        async function loadUnidades() {
            try {
                const { data, error } = await supabase
                    .from('oris_funcionarios')
                    .select('nome_fantasia')
                    .neq('situacao', '99-Demitido')
                    .neq('nome_fantasia', null);

                if (error) throw error;

                const uniqueUnidades = Array.from(
                    new Set((data || []).map((d: any) => d.nome_fantasia).filter(Boolean))
                ).sort() as string[];

                setUnidades(uniqueUnidades);
            } catch (err) {
                console.error('Erro ao carregar unidades:', err);
            }
        }
        loadUnidades();
    }, []);

    const loadData = useCallback(async (unidade?: string) => {
        try {
            setLoading(true);

            // Helper to normalize hours
            const normalizeHours = (h: string | number | null | undefined): string => {
                if (!h) return 'N/A';
                const s = String(h).replace(',', '.');
                const n = parseFloat(s);
                if (isNaN(n)) return 'N/A';
                return Number.isInteger(n) ? String(n) : String(n);
            };

            // 2. Fetch Employees (sempre carrega todos para determinar centros de custo)
            const { data: allEmployees, error: empError } = await supabase
                .from('oris_funcionarios')
                .select('nome, cargo, centro_custo, nome_fantasia, dt_admissao, situacao, carga_horaria_semanal')
                .neq('situacao', '99-Demitido');

            if (empError) throw empError;

            // 1. Fetch TLP targets (quadro necessário)
            // Se unidade selecionada, filtra TLP pelos centros de custo dessa unidade
            let tlpQuery = supabase.from('tlp_quadro_necessario').select('*');

            if (unidade && unidade !== 'todas') {
                // Encontra centros de custo que pertencem à unidade selecionada
                const centrosCustoUnit = new Set(
                    (allEmployees || [])
                        .filter(emp => emp.nome_fantasia === unidade)
                        .map(emp => emp.centro_custo)
                );

                if (centrosCustoUnit.size > 0) {
                    const centrosArray = Array.from(centrosCustoUnit);
                    // Filtra TLP por esses centros de custo
                    tlpQuery = tlpQuery.in('centro_custo', centrosArray);
                }
            }

            const { data: tlpTargets, error: tlpError } = await tlpQuery;
            if (tlpError) throw tlpError;

            // Use filtered employees for matching
            const employees = unidade && unidade !== 'todas'
                ? (allEmployees || []).filter(emp => emp.nome_fantasia === unidade || emp.centro_custo === unidade)
                : allEmployees;

            // 3. Process and Merge Data
            const processedData: TlpData[] = [];

            // Check if we have TLP data
            if (!tlpTargets || tlpTargets.length === 0) {
            }

            // 4. Group Employees by Unit + Role + Hours
            // Key: `${centro_custo}|${cargo}|${normalized_hours}`
            const employeeGroups = new Map<string, typeof employees>();

            employees?.forEach(emp => {
                const h = normalizeHours(emp.carga_horaria_semanal);
                const key = `${emp.centro_custo?.trim()}|${emp.cargo?.trim()}|${h}`;

                if (!employeeGroups.has(key)) {
                    employeeGroups.set(key, []);
                }
                employeeGroups.get(key)?.push(emp);
            });

            // 5. Process TLP Targets and Match with Employees
            const excludedUnits = ['SBCD - HMI', 'SBCD - PROJETO POA'];
            const matchedEmployeeKeys = new Set<string>();

            tlpTargets?.forEach((target: any) => {
                const targetHours = normalizeHours(target.carga_horaria_semanal);

                let bestMatchKey: string | null = null;
                let groupEmployees: any[] = [];

                // Try detailed match first
                const exactKey = `${target.centro_custo?.trim()}|${target.cargo?.trim()}|${targetHours}`;

                if (targetHours !== 'N/A' && employeeGroups.has(exactKey)) {
                    bestMatchKey = exactKey;
                } else if (targetHours === 'N/A') {
                    // TLP has no hours, try to fuzzy match with employees of same Role+CC
                    const prefix = `${target.centro_custo?.trim()}|${target.cargo?.trim()}|`;
                    const candidates = Array.from(employeeGroups.keys()).filter(k => k.startsWith(prefix));

                    if (candidates.length === 1) {
                        bestMatchKey = candidates[0];
                    } else if (candidates.length > 1) {
                        candidates.sort((a, b) => (employeeGroups.get(b)?.length || 0) - (employeeGroups.get(a)?.length || 0));
                        bestMatchKey = candidates[0];
                    }
                }

                if (bestMatchKey) {
                    groupEmployees = employeeGroups.get(bestMatchKey) || [];
                    matchedEmployeeKeys.add(bestMatchKey);
                }

                const activeEmployees = groupEmployees.filter((e: any) => e.situacao && e.situacao.toUpperCase().includes('ATIVO'));
                const afastadoEmployees = groupEmployees.filter((e: any) => !e.situacao || !e.situacao.toUpperCase().includes('ATIVO'));

                const activeCount = activeEmployees.length;
                const afastadosCount = afastadoEmployees.length;

                const tlpCount = target.quantidade_necessaria_ativos || 0;
                const saldo = (activeCount + afastadosCount) - tlpCount;

                let status: 'deficit' | 'excedente' | 'completo' = 'completo';
                if (saldo < 0) status = 'deficit';
                if (saldo > 0) status = 'excedente';

                const unidadeName = groupEmployees[0]?.nome_fantasia || target.centro_custo || 'N/A';

                if (excludedUnits.includes(unidadeName)) {
                    if (bestMatchKey) matchedEmployeeKeys.add(bestMatchKey);
                    return;
                }

                // Determine display hours: Use matched employees' hours if TLP is N/A
                let displayHours = targetHours;
                if (displayHours === 'N/A' && groupEmployees.length > 0) {
                    displayHours = normalizeHours(groupEmployees[0].carga_horaria_semanal);
                }

                processedData.push({
                    id: target.id,
                    cargo: target.cargo,
                    unidade: unidadeName,
                    centro_custo: target.centro_custo,
                    tlp: tlpCount,
                    ativos: activeCount,
                    afastados: afastadosCount,
                    saldo: saldo,
                    status: status,
                    anotacoes: target.anotacoes,
                    carga_horaria_semanal: displayHours === 'N/A' ? null : displayHours,
                    arquivado: target.arquivado,
                    funcionarios: groupEmployees.map(e => ({
                        nome: e.nome,
                        dataAdmissao: formatarData(e.dt_admissao),
                        situacao: e.situacao,
                        carga_horaria_semanal: e.carga_horaria_semanal
                    }))
                });
            });

            // Add employees that didn't match any TLP target
            employeeGroups.forEach((emps, key) => {
                if (matchedEmployeeKeys.has(key)) return;

                const [centro_custo_key, cargo_key, hours_key] = key.split('|');

                const activeEmployees = emps.filter((e: any) => e.situacao && e.situacao.toUpperCase().includes('ATIVO'));
                const afastadoEmployees = emps.filter((e: any) => !e.situacao || !e.situacao.toUpperCase().includes('ATIVO'));

                const activeCount = activeEmployees.length;
                const afastadosCount = afastadoEmployees.length;

                const tlpCount = 0;
                const saldo = activeCount + afastadosCount;

                const unidadeName = emps[0]?.nome_fantasia || centro_custo_key || 'Sem Unidade';

                if (excludedUnits.includes(unidadeName)) return;

                processedData.push({
                    cargo: cargo_key || 'Sem Cargo',
                    unidade: unidadeName,
                    centro_custo: centro_custo_key?.trim() || 'Sem Centro de Custo',
                    tlp: tlpCount,
                    ativos: activeCount,
                    afastados: afastadosCount,
                    saldo: saldo,
                    status: 'excedente',
                    anotacoes: null,
                    carga_horaria_semanal: hours_key === 'N/A' ? null : hours_key,
                    funcionarios: emps.map(e => ({
                        nome: e.nome,
                        dataAdmissao: formatarData(e.dt_admissao),
                        situacao: e.situacao,
                        carga_horaria_semanal: e.carga_horaria_semanal
                    }))
                });
            });

            setData(processedData);
            setError(null);

        } catch (err: any) {
            console.error('[loadData] Erro:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateTlp = async (id: number | undefined, cargo: string, centro_custo: string, novaQuantidade: number) => {
        const trimmedCargo = cargo.trim();
        const trimmedCentroCusto = centro_custo.trim();

        // Optimistically update local state
        const originalData = [...data];
        setData(prev => prev.map(item => {
            // Match by ID if available, otherwise by cargo and centro_custo
            const match = id ? item.id === id : (item.cargo === cargo && item.centro_custo === centro_custo);

            if (match) {
                const newSaldo = item.ativos - novaQuantidade;
                let newStatus: 'deficit' | 'excedente' | 'completo' = 'completo';
                if (newSaldo < 0) newStatus = 'deficit';
                if (newSaldo > 0) newStatus = 'excedente';

                return {
                    ...item,
                    tlp: novaQuantidade,
                    saldo: newSaldo,
                    status: newStatus
                };
            }
            return item;
        }));

        try {
            if (id) {
                // Update existing record by ID
                const { error } = await supabase
                    .from('tlp_quadro_necessario')
                    .update({ quantidade_necessaria_ativos: novaQuantidade })
                    .eq('id', id);

                if (error) throw error;
            } else {
                // If no ID, check if a record with this cargo/centro_custo already exists
                const { data: existing, error: selectError } = await supabase
                    .from('tlp_quadro_necessario')
                    .select('id')
                    .eq('cargo', trimmedCargo)
                    .eq('centro_custo', trimmedCentroCusto)
                    .maybeSingle();

                if (selectError) throw selectError;

                if (existing) {
                    // If it exists, update it
                    const { error: updateError } = await supabase
                        .from('tlp_quadro_necessario')
                        .update({ quantidade_necessaria_ativos: novaQuantidade })
                        .eq('id', existing.id);
                    if (updateError) throw updateError;
                } else {
                    // If it doesn't exist, insert a new one
                    const { error: insertError } = await supabase
                        .from('tlp_quadro_necessario')
                        .insert({
                            cargo: trimmedCargo,
                            centro_custo: trimmedCentroCusto,
                            quantidade_necessaria_ativos: novaQuantidade
                        });
                    if (insertError) throw insertError;
                }
            }

        } catch (err) {
            console.error('Error updating TLP:', err);
            // Revert state on error
            setData(originalData);
            throw err;
        }
    };

    const archiveTlp = async (item: TlpData) => {
        // Optimistic update: Mark as archived in UI instead of removing
        const originalData = [...data];
        setData(prev => prev.map(i => i === item ? { ...i, arquivado: true } : i));

        try {
            if (item.id) {
                // Update existing record
                const { error } = await supabase
                    .from('tlp_quadro_necessario')
                    .update({ arquivado: true })
                    .eq('id', item.id);

                if (error) throw error;
            } else {
                // Create new archived record for this grouping
                const { error } = await supabase
                    .from('tlp_quadro_necessario')
                    .insert({
                        cargo: item.cargo,
                        centro_custo: item.centro_custo,
                        quantidade_necessaria_ativos: 0,
                        carga_horaria_semanal: item.carga_horaria_semanal,
                        arquivado: true
                    });

                if (error) throw error;
            }
        } catch (err) {
            console.error('Error archiving TLP:', err);
            setData(originalData);
        }
    };

    const unarchiveTlp = async (item: TlpData) => {
        const originalData = [...data];
        setData(prev => prev.map(i => i === item ? { ...i, arquivado: false } : i));

        try {
            if (item.id) {
                const { error } = await supabase
                    .from('tlp_quadro_necessario')
                    .update({ arquivado: false })
                    .eq('id', item.id);

                if (error) throw error;
            }
        } catch (err) {
            console.error('Error unarchiving TLP:', err);
            setData(originalData);
        }
    };

    return { data, loading, error, updateTlp, archiveTlp, unarchiveTlp, loadData, unidades };
}
