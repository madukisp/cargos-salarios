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
    carga_horaria_semanal?: string | number | null;
    arquivado?: boolean;
    funcionarios?: { nome: string; dataAdmissao: string; situacao?: string; carga_horaria_semanal?: string | number | null }[];
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
                    'nome, cargo, centro_custo, nome_fantasia, dt_admissao, situacao, carga_horaria_semanal',
                    (q) => q.neq('situacao', '99-Demitido')
                );

                // 3. Process and Merge Data
                const processedData: TlpData[] = [];

                // Check if we have TLP data
                if (!tlpTargets || tlpTargets.length === 0) {
                    console.warn("No TLP targets found.");
                }

                // 3. Helper to normalize hours
                const normalizeHours = (h: string | number | null | undefined): string => {
                    if (!h) return 'N/A';
                    const s = String(h).replace(',', '.');
                    const n = parseFloat(s);
                    if (isNaN(n)) return 'N/A';
                    // Return integer string if whole number
                    return Number.isInteger(n) ? String(n) : String(n);
                };

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
                // (processedData array was already declared above)
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
                        // We look for any key starting with `${centro_custo}|${cargo}|`
                        const prefix = `${target.centro_custo?.trim()}|${target.cargo?.trim()}|`;
                        const candidates = Array.from(employeeGroups.keys()).filter(k => k.startsWith(prefix));

                        if (candidates.length === 1) {
                            // Perfect ambiguity resolution: only one type of hours exists for this role
                            bestMatchKey = candidates[0];
                        } else if (candidates.length > 1) {
                            // Multiple hours exist (e.g. 36h and 40h).
                            // We can't auto-assign TLP (null) to one of them uniquely without splitting TLP.
                            // For now, take the one with most employees? Or just leave unconnected?
                            // Let's take the first one to avoid "Surplus" appearing for valid employees.
                            // Better: Sort by employee count desc
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

                    const unidadeName = groupEmployees[0]?.nome_fantasia || 'N/A';

                    if (excludedUnits.includes(unidadeName)) {
                        if (bestMatchKey) matchedEmployeeKeys.add(bestMatchKey); // Ensure we mark as processed
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

                    const unidadeName = emps[0]?.nome_fantasia || 'Sem Unidade';

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
                // We need to save the specific hours to ensure it matches this group next time
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
            setData(originalData); // Revert on error
            // Optionally set error state here
        }
    };

    const unarchiveTlp = async (item: TlpData) => {
        // Optimistic update: Remove from filtered UI (handled by component), but in data array we set arquivado to false
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

    return { data, loading, error, updateTlp, archiveTlp, unarchiveTlp };
}
