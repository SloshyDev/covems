// Calcula el resumen básico de agentes y supervisores a partir de los recibos y saldos
export function resumenBasico(recibosPorFecha, saldosPorAgente, agenteSupervisorMap) {
    if (!recibosPorFecha.length) {
        return [];
    }

    const mapAgentes = {};
    const mapSupervisores = {};

    // Procesar recibos y agrupar por agente
    recibosPorFecha.forEach(r => {
        const clave = r.clave_agente || '-';
        if (!mapAgentes[clave]) {
            mapAgentes[clave] = {
                clave_agente: clave,
                tipo: 'agente',
                total_comis_agente: 0,
                total_comis_promo: 0,
                total_recibos: 0,
                saldo_pendiente: saldosPorAgente[clave]?.saldo || 0,
                fecha_saldo: saldosPorAgente[clave]?.fecha,
                saldo_anterior: 0,
                ajustes_saldo: 0,
                saldo_final_calculado: 0,
                total_movimientos: 0,
                calculando: false
            };
        }

        mapAgentes[clave].total_comis_agente += Number(r.comis_agente) || 0;
        mapAgentes[clave].total_comis_promo += Number(r.comis_promo) || 0;
        mapAgentes[clave].total_recibos++;
        mapAgentes[clave].total_movimientos += (Number(r.comis_agente) || 0) + (Number(r.comis_promo) || 0);

        // Agrupar comisiones de supervisor
        const supervisorClave = agenteSupervisorMap[clave];
        if (supervisorClave) {
            if (!mapSupervisores[supervisorClave]) {
                mapSupervisores[supervisorClave] = {
                    clave_agente: supervisorClave,
                    tipo: 'supervisor',
                    total_comis_agente: 0,
                    total_comis_promo: 0,
                    total_recibos: 0,
                    saldo_pendiente: saldosPorAgente[supervisorClave]?.saldo || 0,
                    fecha_saldo: saldosPorAgente[supervisorClave]?.fecha,
                    saldo_anterior: 0,
                    ajustes_saldo: 0,
                    saldo_final_calculado: 0,
                    total_movimientos: 0,
                    agentes_supervisados: [],
                    calculando: false
                };
            }

            mapSupervisores[supervisorClave].total_comis_agente += Number(r.comis_super) || 0;
            mapSupervisores[supervisorClave].total_recibos++;
            mapSupervisores[supervisorClave].total_movimientos += Number(r.comis_super) || 0;

            if (!mapSupervisores[supervisorClave].agentes_supervisados.includes(clave)) {
                mapSupervisores[supervisorClave].agentes_supervisados.push(clave);
            }
        }
    });

    // Combinar agentes y supervisores, filtrar los que tienen comisión exactamente 0, ordenar por tipo y clave
    const resultado = [
        ...Object.values(mapAgentes).filter(agente => agente.total_comis_agente !== 0),
        ...Object.values(mapSupervisores).filter(supervisor => supervisor.total_comis_agente !== 0)
    ].sort((a, b) => {
        if (a.tipo !== b.tipo) {
            return a.tipo === 'agente' ? -1 : 1;
        }
        return String(a.clave_agente).localeCompare(String(b.clave_agente));
    });

    return resultado;
}
