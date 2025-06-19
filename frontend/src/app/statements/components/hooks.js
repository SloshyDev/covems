'use client';
import React, { useState, useMemo, useEffect } from "react";
import API_BASE_URL from '../../../config';

export const useCortes = () => {
    const cortesDisponibles = [
        {
            id: "corte1",
            nombre: "Corte 4 Junio",
            fechaInicio: "2025-06-02",
            fechaFin: "2025-06-03"
        },
        {
            id: "corte2", 
            nombre: "Corte 11 Junio",
            fechaInicio: "2025-06-04",
            fechaFin: "2025-06-10"
        }
    ];

    return { cortesDisponibles };
};

export const useRecibos = () => {
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [corteSeleccionado, setCorteSeleccionado] = useState("");
    const [recibosPorFecha, setRecibosPorFecha] = useState([]);
    const [loadingFechas, setLoadingFechas] = useState(false);
    const [errorFechas, setErrorFechas] = useState("");
    const [saldosPorAgente, setSaldosPorAgente] = useState({});
    const [agenteSupervisorMap, setAgenteSupervisorMap] = useState({});
    const [nombresPorClave, setNombresPorClave] = useState({});

    const buscarRecibosPorFecha = async (e) => {
        e.preventDefault();
        setLoadingFechas(true);
        setErrorFechas("");
        setRecibosPorFecha([]);
        setSaldosPorAgente({});
        setAgenteSupervisorMap({});

        // Validar que se haya seleccionado un corte
        if (!corteSeleccionado || !fechaInicio || !fechaFin) {
            setErrorFechas("Selecciona un corte");
            setLoadingFechas(false);
            return;
        }

        try {
            // Buscar recibos
            const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/por-fecha?inicio=${fechaInicio}&fin=${fechaFin}`);
            if (!resRecibos.ok) throw new Error("Error buscando recibos");
            const dataRecibos = await resRecibos.json();
            console.log('🔍 Recibos obtenidos:', dataRecibos?.length || 0, dataRecibos);
            setRecibosPorFecha(dataRecibos);

            // Obtener claves únicas de agentes
            const clavesAgentes = [...new Set(dataRecibos.map(r => r.clave_agente).filter(Boolean))];

            // Obtener claves únicas de supervisores directamente de los recibos
            const supervisoresClave = [...new Set(dataRecibos.map(r => r.clave_supervisor).filter(Boolean))];
            const todasLasClaves = [...clavesAgentes, ...supervisoresClave];

            // Buscar los saldos pendientes de todas las claves de una vez
            try {
                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/multiples-pendientes?inicio=${fechaInicio}&fin=${fechaFin}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ claves: todasLasClaves })
                });

                if (resSaldos.ok) {
                    const saldosData = await resSaldos.json();
                    // saldosData ya viene en el formato { clave: { saldo, fecha }, ... }
                    setSaldosPorAgente(saldosData);
                } else {
                    console.error('Error obteniendo saldos múltiples');
                    // Fallback: crear un mapa vacío
                    const saldosMap = {};
                    todasLasClaves.forEach(clave => {
                        saldosMap[clave] = { saldo: 0, fecha: null };
                    });
                    setSaldosPorAgente(saldosMap);
                }
            } catch (error) {
                console.error('Error en llamada de saldos múltiples:', error);
                // Fallback: crear un mapa vacío
                const saldosMap = {};
                todasLasClaves.forEach(clave => {
                    saldosMap[clave] = { saldo: 0, fecha: null };
                });
                setSaldosPorAgente(saldosMap);
            }

            // Crear mapas de relaciones directamente desde los recibos
            const agentesMap = {};
            const nombresMap = {};
            dataRecibos.forEach(recibo => {
                if (recibo.clave_agente && recibo.clave_supervisor) {
                    agentesMap[recibo.clave_agente] = recibo.clave_supervisor;
                }
                if (recibo.clave_agente && recibo.nombre_agente) {
                    nombresMap[recibo.clave_agente] = recibo.nombre_agente;
                }
            });
            setAgenteSupervisorMap(agentesMap);
            setNombresPorClave(nombresMap);

        } catch (err) {
            setErrorFechas("No se pudo buscar recibos por fecha.");
        }
        setLoadingFechas(false);
    };

    return {
        fechaInicio,
        setFechaInicio,
        fechaFin,
        setFechaFin,
        corteSeleccionado,
        setCorteSeleccionado,
        recibosPorFecha,
        loadingFechas,
        errorFechas,
        saldosPorAgente,
        agenteSupervisorMap,
        nombresPorClave,
        buscarRecibosPorFecha
    };
};

export const useResumen = (recibosPorFecha = [], saldosPorAgente = {}, agenteSupervisorMap = {}, fechaInicio = "", fechaFin = "") => {
    const [resumenCalculado, setResumenCalculado] = useState([]);
    const [calculandoSaldos, setCalculandoSaldos] = useState(false);

    // Calcular resumen básico por agente y supervisor sin saldos detallados
    const resumenBasico = useMemo(() => {
        console.log('🔍 useResumen - Calculando resumen básico:', {
            recibosPorFecha: recibosPorFecha?.length || 0,
            saldosPorAgente: Object.keys(saldosPorAgente || {}).length,
            agenteSupervisorMap: Object.keys(agenteSupervisorMap || {}).length
        });
        
        if (!recibosPorFecha || !Array.isArray(recibosPorFecha) || !recibosPorFecha.length) {
            console.log('🔍 useResumen - Sin recibos, retornando array vacío');
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
            // Corregir: total_movimientos debe incluir agente + promotoria
            mapAgentes[clave].total_movimientos += (Number(r.comis_agente) || 0) + (Number(r.comis_promo) || 0);

            // Debug para agente 2 - mostrar cada recibo
            if (clave === '2') {
                console.log(`🔍 AGENTE 2 - RECIBO:`, {
                    poliza: r.poliza,
                    recibo: r.recibo,
                    comis_agente: r.comis_agente,
                    comis_promo: r.comis_promo,
                    fecha: r.fecha_movimiento,
                    acumulado_comis_agente: mapAgentes[clave].total_comis_agente
                });
            }

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
                // Para supervisores solo comisión de supervisión, no promotoria
                mapSupervisores[supervisorClave].total_movimientos += Number(r.comis_super) || 0;
                
                // Agregar agente supervisado si no está ya en la lista
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
                return a.tipo === 'agente' ? -1 : 1; // Agentes primero
            }
            return String(a.clave_agente).localeCompare(String(b.clave_agente));
        });

        console.log('🔍 useResumen - Resumen básico calculado:', resultado.length, resultado);
        return resultado;
    }, [recibosPorFecha, saldosPorAgente, agenteSupervisorMap]);    // Efecto para calcular saldos detallados de manera asíncrona
    useEffect(() => {
        if (!Array.isArray(resumenBasico) || !resumenBasico.length || !fechaInicio || !fechaFin) {
            setResumenCalculado(resumenBasico || []);
            return;
        }

        const calcularSaldosDetallados = async () => {
            setCalculandoSaldos(true);
            const resumenConSaldos = [...resumenBasico];

            // Marcar como calculando
            resumenConSaldos.forEach(item => item.calculando = true);
            setResumenCalculado(resumenConSaldos);

            try {
                // Obtener todas las claves de entidades
                const claves = resumenConSaldos.map(entidad => entidad.clave_agente);
                
                // Hacer una sola llamada para obtener todos los saldos detallados
                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/multiples-detalle-pendientes?inicio=${fechaInicio}&fin=${fechaFin}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ claves })
                });

                if (resSaldos.ok) {
                    const saldosData = await resSaldos.json();
                    
                    // Procesar los resultados para cada entidad
                    resumenConSaldos.forEach(entidad => {
                        const data = saldosData[entidad.clave_agente] || { saldoAnteriorNegativo: null, saldosRango: [] };
                        const saldoAnterior = parseFloat(data.saldoAnteriorNegativo?.saldo) || 0;
                        const saldosRango = Array.isArray(data.saldosRango) ? data.saldosRango : [];
                        
                        // Calcular ajustes de saldo del rango
                        let totalAjustes = 0;
                        saldosRango.forEach((s, index) => {
                            if (index === 0) {
                                totalAjustes += s.saldo - saldoAnterior;
                            } else {
                                totalAjustes += s.saldo - saldosRango[index - 1].saldo;
                            }
                        });

                        entidad.saldo_anterior = saldoAnterior;
                        entidad.ajustes_saldo = totalAjustes;
                        // Para el resumen: solo incluir comisión del agente, NO promotoría
                        entidad.saldo_final_calculado = saldoAnterior + totalAjustes + entidad.total_comis_agente;
                        entidad.calculando = false;

                        // Debug para verificar cálculos
                        if (entidad.clave_agente === '2') {
                            console.log(`🔍 AGENTE 2 - ANÁLISIS DETALLADO:`, {
                                '--- DATOS BASE ---': '---',
                                clave_agente: entidad.clave_agente,
                                saldoAnterior: saldoAnterior,
                                '--- COMISIONES ---': '---',
                                total_comis_agente: entidad.total_comis_agente,
                                total_comis_promo: entidad.total_comis_promo,
                                '--- AJUSTES ---': '---',
                                ajustes_saldo: totalAjustes,
                                '--- DATOS SALDOS RANGO ---': '---',
                                saldosRango: data.saldosRango,
                                saldosRangoLength: data.saldosRango?.length || 0,
                                '--- CÁLCULO FINAL ---': '---',
                                formula: `${saldoAnterior} + ${totalAjustes} + ${entidad.total_comis_agente}`,
                                saldo_final_calculado: entidad.saldo_final_calculado,
                                '--- POSIBLE PROBLEMA ---': totalAjustes === entidad.total_comis_agente ? '⚠️ AJUSTES = COMISIONES!' : '✅ Valores diferentes'
                            });
                            
                            // Debug adicional: mostrar cada cálculo de ajuste
                            if (data.saldosRango && data.saldosRango.length > 0) {
                                console.log(`🔍 AGENTE 2 - DETALLE AJUSTES:`, {
                                    saldoAnterior,
                                    ajustesCalculados: data.saldosRango.map((s, index) => ({
                                        index,
                                        fechaSaldo: s.fecha,
                                        saldoActual: s.saldo,
                                        saldoPrevio: index === 0 ? saldoAnterior : data.saldosRanga[index - 1].saldo,
                                        diferencia: index === 0 ? s.saldo - saldoAnterior : s.saldo - data.saldosRango[index - 1].saldo
                                    }))
                                });
                            }
                        }
                    });
                } else {
                    console.error('Error obteniendo saldos detallados múltiples');
                    // Fallback: marcar como no calculando
                    resumenConSaldos.forEach(entidad => {
                        entidad.calculando = false;
                        entidad.saldo_anterior = entidad.saldo_pendiente || 0;
                        entidad.ajustes_saldo = 0;
                        entidad.saldo_final_calculado = entidad.saldo_pendiente + entidad.total_comis_agente;
                    });
                }
            } catch (error) {
                console.error('Error en llamada de saldos detallados múltiples:', error);
                // Fallback: marcar como no calculando
                resumenConSaldos.forEach(entidad => {
                    entidad.calculando = false;
                    entidad.saldo_anterior = entidad.saldo_pendiente || 0;
                    entidad.ajustes_saldo = 0;
                    entidad.saldo_final_calculado = entidad.saldo_pendiente + entidad.total_comis_agente;
                });
            }

            setResumenCalculado(resumenConSaldos);
            setCalculandoSaldos(false);
        };

        calcularSaldosDetallados();
    }, [resumenBasico, fechaInicio, fechaFin]);

    return {
        resumenPorAgente: resumenCalculado,
        calculandoSaldos
    };
};

export const useDetalle = (agenteSupervisorMap = {}, recibosPorFecha = [], nombresPorClave = {}, fechaInicio = "", fechaFin = "") => {
    const [detalleRecibos, setDetalleRecibos] = useState(null);

    // Eliminar el botón de PDF y mostrar detalle en pantalla
    const mostrarDetalleRecibos = (usuario) => {
        let nombre = nombresPorClave[usuario.clave_agente] || '';
        if (usuario.tipo === 'supervisor') {
            // Buscar claves de agentes supervisados
            const agentesSupervisados = Object.entries(agenteSupervisorMap || {})
                .filter(([claveAgente, supervisorClave]) => supervisorClave === usuario.clave_agente)
                .map(([claveAgente]) => claveAgente);            // Filtrar recibos de todos los agentes supervisados
            const recibosSupervisor = (recibosPorFecha || []).filter(r => agentesSupervisados.includes(String(r.clave_agente)));
            setDetalleRecibos({ usuario, recibos: recibosSupervisor, nombre });
        } else {
            // Agente: solo sus recibos
            const recibosUsuario = (recibosPorFecha || []).filter(r => r.clave_agente === usuario.clave_agente);
            setDetalleRecibos({ usuario, recibos: recibosUsuario, nombre });
        }
    };

    // Obtener y mostrar detalle de recibos y saldos pendientes juntos
    const mostrarDetalleCompleto = async (clave) => {
        try {
            // Verificar si es un supervisor buscando agentes supervisados
            const agentesSupervisados = Object.entries(agenteSupervisorMap || {})
                .filter(([claveAgente, supervisorClave]) => supervisorClave === clave)
                .map(([claveAgente]) => claveAgente);
            
            const esSupervisor = agentesSupervisados.length > 0;
              
            if (esSupervisor) {
                // Lógica para supervisor: obtener datos de todos sus agentes
                let todosLosRecibos = [];
                let todosSaldosRango = [];
                let saldoAnteriorNegativo = null;
                
                // Obtener recibos de todos los agentes supervisados
                for (const claveAgente of agentesSupervisados) {
                    const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/agente/${claveAgente}/detallado?inicio=${fechaInicio}&fin=${fechaFin}`);
                    if (resRecibos.ok) {
                        const recibosAgente = await resRecibos.json();
                        // Agregar los recibos con comisión de supervisor
                        todosLosRecibos = todosLosRecibos.concat(
                            recibosAgente.map(r => ({
                                ...r,
                                comis_agente: r.comis_super || 0, // Usar comisión de supervisor
                                agente_original: r.clave_agente   // Mantener referencia del agente original
                            }))
                        );
                    }
                }
                
                // Obtener saldos del supervisor mismo (no de los agentes individuales)
                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/${clave}/detalle-pendiente?inicio=${fechaInicio}&fin=${fechaFin}`);
                if (resSaldos.ok) {
                    const data = await resSaldos.json();
                    saldoAnteriorNegativo = data.saldoAnteriorNegativo || null;
                    todosSaldosRango = Array.isArray(data.saldosRango) ? data.saldosRango : [];
                }
                
                // Ordenar recibos por fecha
                todosLosRecibos.sort((a, b) => new Date(a.fecha_movimiento || a.fecha) - new Date(b.fecha_movimiento || b.fecha));
                
                setDetalleRecibos({ 
                    clave, 
                    recibos: todosLosRecibos, 
                    saldoAnteriorNegativo,
                    saldosRango: todosSaldosRango,
                    esSupervisor: true,
                    agentesSupervisados
                });
            } else {
                // Lógica original para agente individual
                const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/agente/${clave}/detallado?inicio=${fechaInicio}&fin=${fechaFin}`);
                let recibos = [];
                if (resRecibos.ok) {
                    recibos = await resRecibos.json();
                }
                
                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/${clave}/detalle-pendiente?inicio=${fechaInicio}&fin=${fechaFin}`);
                let saldoAnteriorNegativo = null;
                let saldosRango = [];
                if (resSaldos.ok) {
                    const data = await resSaldos.json();
                    console.log('Datos de saldos recibidos:', data); // Debug
                    saldoAnteriorNegativo = data.saldoAnteriorNegativo || null;
                    saldosRango = Array.isArray(data.saldosRango) ? data.saldosRango : [];
                }
                
                setDetalleRecibos({ 
                    clave, 
                    recibos: Array.isArray(recibos) ? recibos : [], 
                    saldoAnteriorNegativo,
                    saldosRango,
                    esSupervisor: false
                });
            }
        } catch {
            setDetalleRecibos({ clave, recibos: [], saldoAnteriorNegativo: null, saldosRango: [], error: 'No se pudo obtener el detalle.' });
        }
    };

    return {
        detalleRecibos,
        setDetalleRecibos,
        mostrarDetalleRecibos,
        mostrarDetalleCompleto
    };
};
