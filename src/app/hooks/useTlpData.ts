import { useState, useEffect } from 'react';
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
    funcionarios?: { nome: string; dataAdmissao: string; situacao?: string }[];
}

export function useTlpData() {
    const [data, setData] = useState<TlpData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);

                // Helper to fetch all rows handling pagination limit
                const fetchAll = async (table: string, select: string, extraFilter?: (q: any) => any) => {
                    let allData: any[] = [];
                    let from = 0;
                    const step = 1000; // Supabase default limit
                    let hasMore = true;

                    while (hasMore) {
                        let query: any = supabase.from(table).select(select).range(from, from + step - 1);
                        if (extraFilter) {
                            query = extraFilter(query);
                        }

                        const { data, error } = await query;
                        if (error) throw error;

                        if (data && data.length > 0) {
                            allData = [...allData, ...data];
                            // If we got less than the step, we reached the end
                            if (data.length < step) hasMore = false;
                            from += step;
                        } else {
                            hasMore = false;
                        }
                    }
                    return allData;
                };

                // 1. Fetch TLP targets (quadro necessário)
                const tlpTargets = await fetchAll('tlp_quadro_necessario', '*');

                // 2. Fetch Active Employees (Active + On Leave)
                const employees = await fetchAll('oris_funcionarios',
                    'nome, cargo, centro_custo, nome_fantasia, dt_admissao, situacao',
                    (q) => q.neq('situacao', '99-Demitido')
                );

                // 3. Process and Merge Data
                const processedData: TlpData[] = [];

                // Check if we have TLP data
                if (!tlpTargets || tlpTargets.length === 0) {
                    console.warn("No TLP targets found.");
                }

                // Group employees by Unit + Role
                const employeeMap = new Map<string, typeof employees>();

                employees?.forEach(emp => {
                    const key = `${emp.centro_custo?.trim()}|${emp.cargo?.trim()}`;
                    if (!employeeMap.has(key)) {
                        employeeMap.set(key, []);
                    }
                    employeeMap.get(key)?.push(emp);
                });

                // Create TlpData entries from TLP targets
                const excludedUnits = ['SBCD - HMI', 'SBCD - PROJETO POA'];

                tlpTargets?.forEach((target: any) => {
                    const key = `${target.centro_custo?.trim()}|${target.cargo?.trim()}`;
                    const groupEmployees = employeeMap.get(key) || [];

                    const activeEmployees = groupEmployees.filter((e: any) => e.situacao && e.situacao.toUpperCase().includes('ATIVO'));
                    const afastadoEmployees = groupEmployees.filter((e: any) => !e.situacao || !e.situacao.toUpperCase().includes('ATIVO'));

                    const activeCount = activeEmployees.length;
                    const afastadosCount = afastadoEmployees.length;

                    const tlpCount = target.quantidade_necessaria_ativos || 0;
                    const saldo = (activeCount + afastadosCount) - tlpCount;

                    let status: 'deficit' | 'excedente' | 'completo' = 'completo';
                    if (saldo < 0) status = 'deficit';
                    if (saldo > 0) status = 'excedente';

                    // Infer unit from employees if possible, otherwise it's unknown/empty
                    // Since TLP table doesn't have unidade, we rely on employees to provide it,
                    // or we might need another join. For now, empty or from existing employees.
                    const unidadeName = groupEmployees[0]?.nome_fantasia || 'N/A';

                    // Filter out excluded units
                    if (excludedUnits.includes(unidadeName)) {
                        // Mark these employees as processed so they don't show up in the surplus loop either
                        employeeMap.delete(key);
                        return;
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
                        funcionarios: groupEmployees.map(e => ({
                            nome: e.nome,
                            dataAdmissao: formatarData(e.dt_admissao),
                            situacao: e.situacao
                        }))
                    });

                    // Mark these employees as processed if we want to find "Employees without TLP target"
                    employeeMap.delete(key);
                });

                // Add employees that didn't match any TLP target
                employeeMap.forEach((emps, key) => {
                    const [centro_custo_key, cargo_key] = key.split('|');

                    const activeEmployees = emps.filter((e: any) => e.situacao && e.situacao.toUpperCase().includes('ATIVO'));
                    const afastadoEmployees = emps.filter((e: any) => !e.situacao || !e.situacao.toUpperCase().includes('ATIVO'));

                    const activeCount = activeEmployees.length;
                    const afastadosCount = afastadoEmployees.length;

                    const tlpCount = 0; // No target defined
                    const saldo = activeCount + afastadosCount; // Total occupants

                    // Try to find the Unit name from the employees in this group
                    const unidadeName = emps[0]?.nome_fantasia || 'Sem Unidade';

                    // Filter out excluded units
                    if (excludedUnits.includes(unidadeName)) return;

                    processedData.push({
                        // No ID for these as they don't exist in TLP table yet
                        cargo: cargo_key || 'Sem Cargo',
                        unidade: unidadeName,
                        centro_custo: centro_custo_key?.trim() || 'Sem Centro de Custo',
                        tlp: tlpCount,
                        ativos: activeCount,
                        afastados: afastadosCount,
                        saldo: saldo,
                        status: 'excedente',
                        anotacoes: null,
                        funcionarios: emps.map(e => ({
                            nome: e.nome,
                            dataAdmissao: formatarData(e.dt_admissao),
                            situacao: e.situacao
                        }))
                    });
                });

                setData(processedData);
                setError(null);

            } catch (err: any) {
                setError(err.message);
                console.error('Failed to load TLP data:', err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
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
                    .maybeSingle(); // Use maybeSingle to not throw if no record is found

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

    return { data, loading, error, updateTlp };
}
