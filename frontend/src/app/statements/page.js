'use client';
import React, { useState, useMemo, useEffect } from "react";
import API_BASE_URL from '../../config';

// Utilidad para formatear fechas a yyyy/mm/dd
function formatDateYMD(fecha) {
    if (!fecha) return '-';
    // Si ya es string, tomar solo la parte de la fecha si tiene 'T'
    if (typeof fecha === 'string' && fecha.includes('T')) {
        const [datePart] = fecha.split('T');
        const [y, m, d] = datePart.split('-');
        return `${y}/${m}/${d}`;
    }
    // Si es Date o string sin 'T', formatear normalmente
    const d = new Date(fecha);
    if (isNaN(d)) return '-';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}/${m}/${day}`;
}

// Utilidad para sumar un día a una fecha yyyy-mm-dd o yyyy/mm/dd
function addOneDay(fecha) {
    if (!fecha) return '';
    const [y, m, d] = fecha.includes('/') ? fecha.split('/') : fecha.split('-');
    const dateObj = new Date(`${y}-${m}-${d}T00:00:00`);
    dateObj.setDate(dateObj.getDate() + 1);
    const y2 = dateObj.getFullYear();
    const m2 = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d2 = String(dateObj.getDate()).padStart(2, '0');
    return `${y2}/${m2}/${d2}`;
}

const StatementsPage = () => {    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [corteSeleccionado, setCorteSeleccionado] = useState("");
    const [recibosPorFecha, setRecibosPorFecha] = useState([]);
    const [loadingFechas, setLoadingFechas] = useState(false);
    const [errorFechas, setErrorFechas] = useState("");    const [saldosPorAgente, setSaldosPorAgente] = useState({});
    const [agenteSupervisorMap, setAgenteSupervisorMap] = useState({});
    const [nombresPorClave, setNombresPorClave] = useState({});
    const [resumenCalculado, setResumenCalculado] = useState([]);
    const [calculandoSaldos, setCalculandoSaldos] = useState(false);
    const [detalleRecibos, setDetalleRecibos] = useState(null);

    // Cortes predefinidos
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
        },
        {
            id: "corte3", 
            nombre: "Corte 18 Junio",
            fechaInicio: "2025-06-11",
            fechaFin: "2025-06-17"
        },
        {
            id: "corte4",
            nombre: "Corte Junio",
            fechaInicio: "2025-06-01",
            fechaFin: "2025-06-17"
        }
    ];    // Manejar cambio de corte seleccionado
    const handleCorteChange = (e) => {
        const corteId = e.target.value;
        setCorteSeleccionado(corteId);
        
        if (corteId) {
            const corte = cortesDisponibles.find(c => c.id === corteId);
            if (corte) {
                setFechaInicio(corte.fechaInicio);
                setFechaFin(corte.fechaFin);
            }
        } else {
            setFechaInicio("");
            setFechaFin("");
        }
        
        // Limpiar datos anteriores inmediatamente cuando se cambia el dropdown
        setRecibosPorFecha([]);
        setResumenCalculado([]);
        setSaldosPorAgente({});
        setAgenteSupervisorMap({});        setDetalleRecibos(null);
        setDebeCalcularDetallados(false);
    };

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
            
            if (!resRecibos.ok) {
                const errorText = await resRecibos.text();
                throw new Error(`Error buscando recibos: ${resRecibos.status} - ${errorText}`);
            }
            
            const dataRecibos = await resRecibos.json();
            setRecibosPorFecha(dataRecibos);            // Obtener claves únicas de agentes
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
                });                if (resSaldos.ok) {
                    const saldosData = await resSaldos.json();
                    // saldosData ya viene en el formato { clave: { saldo, fecha }, ... }
                    setSaldosPorAgente(saldosData);
                } else {
                    // Fallback: crear un mapa vacío
                    const saldosMap = {};
                    todasLasClaves.forEach(clave => {
                        saldosMap[clave] = { saldo: 0, fecha: null };
                    });
                    setSaldosPorAgente(saldosMap);
                }
            } catch (error) {
                // Fallback: crear un mapa vacío
                const saldosMap = {};
                todasLasClaves.forEach(clave => {
                    saldosMap[clave] = { saldo: 0, fecha: null };
                });
                setSaldosPorAgente(saldosMap);
            }

            // Crear mapas de relaciones directamente desde los recibos
            const agentesMap = {};
            dataRecibos.forEach(recibo => {
                if (recibo.clave_agente && recibo.clave_supervisor) {
                    agentesMap[recibo.clave_agente] = recibo.clave_supervisor;
                }
            });
            setAgenteSupervisorMap(agentesMap);            // Por ahora no tenemos nombres, pero si los necesitamos podemos hacer una llamada específica después
            setNombresPorClave({});
            
            // Activar flag para calcular detalles después de que se actualice resumenBasico
            setDebeCalcularDetallados(true);

        } catch (err) {
            setErrorFechas(`Error: ${err.message || 'No se pudo buscar recibos por fecha.'}`);
        }
        setLoadingFechas(false);
    };    // Calcular resumen básico por agente y supervisor sin saldos detallados
    const resumenBasico = useMemo(() => {
        if (!recibosPorFecha.length) {
            return [];
        }

        const mapAgentes = {};
        const mapSupervisores = {};

        // Procesar recibos y agrupar por agente
        const debugRecibosAgente = {};
        const debugRecibosSupervisor = [];
        const debugAgentes = ['1809']; // Puedes agregar más claves de agentes a auditar
        recibosPorFecha.forEach(r => {
            const clave = r.clave_agente || '-';
            if (debugAgentes.includes(clave)) {
                if (!debugRecibosAgente[clave]) debugRecibosAgente[clave] = [];
                debugRecibosAgente[clave].push({
                    recibo: r.recibo,
                    no_poliza: r.no_poliza,
                    comis_agente: r.comis_agente,
                    nombre_asegurado: r.nombre_asegurado
                });
            }
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
            // total_movimientos debe incluir agente + promotoria
            mapAgentes[clave].total_movimientos += (Number(r.comis_agente) || 0) + (Number(r.comis_promo) || 0);

            // Agrupar comisiones de supervisor
            const supervisorClave = agenteSupervisorMap[clave];
            if (supervisorClave) {
                if (supervisorClave === '1809') {
                    debugRecibosSupervisor.push({
                        recibo: r.recibo,
                        no_poliza: r.no_poliza,
                        comis_super: r.comis_super,
                        clave_agente: r.clave_agente,
                        nombre_asegurado: r.nombre_asegurado
                    });
                }
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

        // Debug: mostrar detalles de recibos de agentes y supervisores
        Object.entries(debugRecibosAgente).forEach(([clave, recibos]) => {
            console.log(`Detalle recibos agente ${clave}:`, recibos);
            const suma = recibos.reduce((acc, r) => acc + Number(r.comis_agente || 0), 0);
            console.log(`Suma total comis_agente agente ${clave}:`, suma);
        });
        if (debugRecibosSupervisor.length > 0) {
            console.log('Detalle recibos supervisor 1809:', debugRecibosSupervisor);
            const suma = debugRecibosSupervisor.reduce((acc, r) => acc + Number(r.comis_super || 0), 0);
            console.log('Suma total comis_super supervisor 1809:', suma);
        }

        return resultado;
    }, [recibosPorFecha, saldosPorAgente, agenteSupervisorMap]);// Variable para controlar si debe ejecutar cálculos detallados
    const [debeCalcularDetallados, setDebeCalcularDetallados] = useState(false);    // Función para calcular saldos detallados que se llama solo después de buscar recibos
    const calcularSaldosDetallados = async (resumen) => {
        setCalculandoSaldos(true);
        const resumenConSaldos = [...resumen];

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
                        let ajusteIndividual = 0;
                        if (index === 0) {
                            ajusteIndividual = s.saldo - saldoAnterior;
                        } else {
                            ajusteIndividual = s.saldo - saldosRango[index - 1].saldo;
                        }
                        totalAjustes += ajusteIndividual;
                    });

                    entidad.saldo_anterior = saldoAnterior;
                    
                    // CORRECCIÓN: Si los ajustes son iguales a las comisiones, 
                    // significa que los saldosRango del backend ya incluyen las comisiones
                    // En ese caso, los "ajustes" reales deberían ser 0
                    if (totalAjustes === entidad.total_comis_agente && totalAjustes > 0) {
                        entidad.ajustes_saldo = 0;
                        entidad.saldo_final_calculado = saldoAnterior + entidad.total_comis_agente;
                    } else {
                        entidad.ajustes_saldo = totalAjustes;
                        entidad.saldo_final_calculado = saldoAnterior + totalAjustes + entidad.total_comis_agente;
                    }
                    
                    entidad.calculando = false;
                });
            } else {
                // Fallback: marcar como no calculando
                resumenConSaldos.forEach(entidad => {
                    entidad.calculando = false;
                    entidad.saldo_anterior = entidad.saldo_pendiente || 0;
                    entidad.ajustes_saldo = 0;
                    entidad.saldo_final_calculado = entidad.saldo_pendiente + entidad.total_comis_agente;
                });
            }
        } catch (error) {
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
    };    // useEffect que solo se ejecuta cuando resumenBasico cambia
    useEffect(() => {
        // Siempre asignar el resumen básico primero
        setResumenCalculado(resumenBasico);
        
        // Solo calcular detalles si fue después de una búsqueda exitosa
        if (debeCalcularDetallados && resumenBasico.length > 0 && fechaInicio && fechaFin) {
            calcularSaldosDetallados(resumenBasico);
            setDebeCalcularDetallados(false); // Reset flag
        }
    }, [resumenBasico]);

    // Usar el resumen calculado en lugar del básico
    const resumenPorAgente = resumenCalculado;
    // Eliminar el botón de PDF y mostrar detalle en pantalla
    const mostrarDetalleRecibos = (usuario) => {
        let nombre = nombresPorClave[usuario.clave_agente] || '';
        if (usuario.tipo === 'supervisor') {
            // Buscar claves de agentes supervisados
            const agentesSupervisados = Object.entries(agenteSupervisorMap)
                .filter(([claveAgente, supervisorClave]) => supervisorClave === usuario.clave_agente)
                .map(([claveAgente]) => claveAgente);
            // Filtrar recibos de todos los agentes supervisados
            const recibosSupervisor = recibosPorFecha.filter(r => agentesSupervisados.includes(String(r.clave_agente)));
            setDetalleRecibos({ usuario, recibos: recibosSupervisor, nombre });
        } else {
            // Agente: solo sus recibos
            const recibosUsuario = recibosPorFecha.filter(r => r.clave_agente === usuario.clave_agente);
            setDetalleRecibos({ usuario, recibos: recibosUsuario, nombre });
        }
    };    // Obtener y mostrar detalle de recibos y saldos pendientes juntos
    const mostrarDetalleCompleto = async (clave) => {
        try {
            // Verificar si es un supervisor buscando agentes supervisados
            const agentesSupervisados = Object.entries(agenteSupervisorMap)
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
            }else {
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
            }        } catch {
            setDetalleRecibos({ clave, recibos: [], saldoAnteriorNegativo: null, saldosRango: [], error: 'No se pudo obtener el detalle.' });
        }
    };

    // Generar PDF del estado de cuenta (sin comisión promotoria)
    const generarPDFEstadoCuenta = async (agente) => {
        try {
            // Obtener datos detallados del agente
            let recibos = [];
            let saldoAnteriorNegativo = null;
            let saldosRango = [];

            if (agente.tipo === 'supervisor') {
                // Para supervisores, obtener datos de todos sus agentes supervisados
                const agentesSupervisados = Object.entries(agenteSupervisorMap)
                    .filter(([claveAgente, supervisorClave]) => supervisorClave === agente.clave_agente)
                    .map(([claveAgente]) => claveAgente);

                for (const claveAgente of agentesSupervisados) {
                    const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/agente/${claveAgente}/detallado?inicio=${fechaInicio}&fin=${fechaFin}`);
                    if (resRecibos.ok) {
                        const recibosAgente = await resRecibos.json();
                        recibos = recibos.concat(
                            recibosAgente.map(r => ({
                                ...r,
                                comis_agente: r.comis_super || 0, // Usar comisión de supervisor
                                agente_original: r.clave_agente
                            }))
                        );
                    }
                }

                // Obtener saldos del supervisor
                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/${agente.clave_agente}/detalle-pendiente?inicio=${fechaInicio}&fin=${fechaFin}`);
                if (resSaldos.ok) {
                    const data = await resSaldos.json();
                    saldoAnteriorNegativo = data.saldoAnteriorNegativo || null;
                    saldosRango = Array.isArray(data.saldosRango) ? data.saldosRango : [];
                }
            } else {
                // Para agentes individuales
                const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/agente/${agente.clave_agente}/detallado?inicio=${fechaInicio}&fin=${fechaFin}`);
                if (resRecibos.ok) {
                    recibos = await resRecibos.json();
                }

                const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/${agente.clave_agente}/detalle-pendiente?inicio=${fechaInicio}&fin=${fechaFin}`);
                if (resSaldos.ok) {
                    const data = await resSaldos.json();
                    saldoAnteriorNegativo = data.saldoAnteriorNegativo || null;
                    saldosRango = Array.isArray(data.saldosRango) ? data.saldosRango : [];
                }
            }            // Ordenar recibos por fecha
            recibos.sort((a, b) => new Date(a.fecha_movimiento || a.fecha) - new Date(b.fecha_movimiento || b.fecha));

            // Importar pdfMake
            const pdfMake = (await import('pdfmake/build/pdfmake')).default;
            const fontsModule = await import('pdfmake/build/vfs_fonts');
            pdfMake.vfs = fontsModule?.pdfMake?.vfs || fontsModule?.vfs || fontsModule?.default?.vfs || fontsModule?.default?.pdfMake?.vfs;

            // Calcular totales
            const totalComisiones = recibos.reduce((sum, r) => sum + (Number(r.comis_agente) || 0), 0);
            const saldoAnterior = parseFloat(saldoAnteriorNegativo?.saldo) || 0;
            const saldoFinal = saldoAnterior + totalComisiones; // Quitar ajustes del cálculo
            // Construir tabla de recibos (sin comisión promotoria)
            const tablaRecibos = [
                [
                    { text: 'Fecha', style: 'tableHeader' },
                    { text: 'Póliza', style: 'tableHeader' },
                    { text: 'Recibo', style: 'tableHeader' },
                    { text: 'Comisión', style: 'tableHeader' },
                    { text: 'DSN', style: 'tableHeader' }
                ]
            ];            recibos.forEach(recibo => {
                tablaRecibos.push([
                    { text: recibo.fecha_movimiento || recibo.fecha_ultimo_mov || recibo.fecha || '-', fontSize: 8 },
                    { text: recibo.no_poliza || recibo.poliza || '-', fontSize: 8 },
                    { text: recibo.recibo || '-', fontSize: 8 },
                    { text: `$${(Number(recibo.comis_agente) || 0).toFixed(2)}`, fontSize: 8, alignment: 'right' },
                    { text: recibo.dsn || '-', fontSize: 8 }
                ]);
            });

            // Construir tabla de saldos
            const tablaSaldos = [
                [
                    { text: 'Concepto', style: 'tableHeader' },
                    { text: 'Importe', style: 'tableHeader' }
                ],
                [
                    { text: 'Saldo Anterior', fontSize: 9 },
                    { text: `$${saldoAnterior.toFixed(2)}`, fontSize: 9, alignment: 'right' }
                ],
                [
                    { text: 'Total Comisiones', fontSize: 9 },
                    { text: `$${totalComisiones.toFixed(2)}`, fontSize: 9, alignment: 'right' }
                ],
                // Ajustes removido del PDF
                [
                    { text: 'Saldo Final', style: 'tableHeader' },
                    { text: `$${saldoFinal.toFixed(2)}`, style: 'tableHeader', alignment: 'right' }
                ]
            ];

            // Definir documento PDF
            const docDefinition = {
                content: [
                    // Encabezado
                    { text: 'ESTADO DE CUENTA', style: 'header' },
                    { text: `${agente.tipo === 'supervisor' ? 'Supervisor' : 'Agente'}: ${agente.clave_agente}`, style: 'subheader' },
                    { text: `Período: ${fechaInicio} al ${fechaFin}`, style: 'dateRange' },
                    { text: ' ', margin: [0, 10] },

                    // Resumen
                    { text: 'RESUMEN', style: 'sectionHeader' },
                    {
                        table: {
                            widths: ['*', 100],
                            body: tablaSaldos
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 0, 0, 20]
                    },                    // Detalle de recibos
                    { text: 'DETALLE DE RECIBOS', style: 'sectionHeader' },
                    {
                        table: {
                            widths: [70, 90, 60, 60, 80],
                            body: tablaRecibos
                        },
                        layout: 'lightHorizontalLines'
                    }
                ],
                styles: {
                    header: {
                        fontSize: 18,
                        bold: true,
                        alignment: 'center',
                        margin: [0, 0, 0, 10]
                    },
                    subheader: {
                        fontSize: 14,
                        bold: true,
                        alignment: 'center',
                        margin: [0, 0, 0, 5]
                    },
                    dateRange: {
                        fontSize: 12,
                        alignment: 'center',
                        margin: [0, 0, 0, 20]
                    },
                    sectionHeader: {
                        fontSize: 12,
                        bold: true,
                        margin: [0, 15, 0, 5]
                    },
                    tableHeader: {
                        fontSize: 9,
                        bold: true,
                        fillColor: '#eeeeee'
                    }
                },
                defaultStyle: {
                    fontSize: 10
                }
            };

            // Generar y descargar PDF
            const fileName = `estado_cuenta_${agente.tipo}_${agente.clave_agente}_${fechaInicio}_${fechaFin}.pdf`;
            pdfMake.createPdf(docDefinition).download(fileName);

        } catch (error) {
            alert('Error al generar el PDF: ' + error.message);
        }
    };

    // Ejemplo de función para actualizar saldo pendiente desde el frontend
    async function actualizarSaldoPendiente({ clave, fecha, saldo }) {
        const res = await fetch(`${API_BASE_URL}/api/saldos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clave, fecha, saldo })
        });
        if (!res.ok) throw new Error('Error actualizando saldo');
        return await res.json();
    }

    return (
        <div className="max-w-5xl mx-auto p-4 bg-gray-900 min-h-screen text-white">
            <h1 className="text-2xl font-bold mb-6 text-white">Consultas de Estados de Cuenta</h1>            <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4 text-white">Consultar Estados de Cuenta por Corte</h2>
                <form className="flex flex-wrap gap-4 items-center mb-4" onSubmit={buscarRecibosPorFecha}>
                    <label className="flex flex-col text-white">
                        Seleccionar Corte
                        <select 
                            value={corteSeleccionado} 
                            onChange={handleCorteChange} 
                            className="p-2 border border-gray-600 rounded bg-gray-700 text-white"
                            required
                        >
                            <option value="">Selecciona un corte</option>
                            {cortesDisponibles.map(corte => (
                                <option key={corte.id} value={corte.id}>
                                    {corte.nombre} ({corte.fechaInicio} al {corte.fechaFin})
                                </option>
                            ))}
                        </select>
                    </label>
                    {corteSeleccionado && (
                        <div className="text-sm text-gray-300">
                            Período: {fechaInicio} al {fechaFin}
                        </div>
                    )}                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" disabled={loadingFechas}>
                        {loadingFechas ? 'Buscando...' : 'Buscar recibos'}
                    </button>
                </form>
                {errorFechas && <div className="text-red-500 mt-2">{errorFechas}</div>}
                {loadingFechas && <div className="text-gray-500 mt-2">Buscando...</div>}                {resumenPorAgente.length > 0 && (
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-white">Resumen por agente ({recibosPorFecha.length} recibos encontrados)</h3>
                            {calculandoSaldos && (
                                <div className="flex items-center text-blue-400 text-sm">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400 mr-2"></div>
                                    Calculando saldos detallados...
                                </div>                            )}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs bg-gray-800 border border-gray-700">
                                <thead>
                                    <tr className="bg-gray-700">
                                        <th className="p-2 text-white">Clave / Tipo</th>
                                        <th className="p-2 text-white">Recibos</th>
                                        <th className="p-2 text-white">Comisión</th>
                                        <th className="p-2 text-white">Com. Promotoria</th>
                                        <th className="p-2 text-white">Saldo Anterior</th>
                                        <th className="p-2 text-white">Ajustes</th>
                                        <th className="p-2 text-white font-bold text-lg">Saldo Final</th>
                                        <th className="p-2 text-white">Fecha Saldo</th>
                                        <th className="p-2 text-white">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resumenPorAgente.map((a, i) => (
                                        <tr key={i} className={`border-b border-gray-600 ${a.tipo === 'supervisor' ? 'bg-blue-900/20' : 'bg-gray-800'}`}>
                                            <td className="p-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-white">{a.clave_agente}</span>
                                                    <span className={`text-xs ${a.tipo === 'supervisor' ? 'text-blue-400' : 'text-gray-400'}`}>
                                                        {a.tipo === 'supervisor' ? `Supervisor (${a.agentes_supervisados?.length || 0} agentes)` : 'Agente'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-2 text-white">{a.total_recibos}</td>
                                            <td className="p-2 text-blue-400 font-medium">${a.total_comis_agente.toFixed(2)}</td>
                                            <td className="p-2 text-green-400">${a.total_comis_promo.toFixed(2)}</td>
                                            <td className={`p-2 font-medium ${(a.saldo_anterior || 0) < 0 ? 'text-red-400' : (a.saldo_anterior || 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                {a.calculando ? (
                                                    <div className="flex items-center">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-1"></div>
                                                        <span className="text-xs">Calculando...</span>
                                                    </div>
                                                ) : (
                                                    `$${(a.saldo_anterior || 0).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className={`p-2 font-medium ${(a.ajustes_saldo || 0) < 0 ? 'text-red-400' : (a.ajustes_saldo || 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                {a.calculando ? (
                                                    <div className="flex items-center">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-1"></div>
                                                        <span className="text-xs">Calculando...</span>
                                                    </div>
                                                ) : (
                                                    `$${(a.ajustes_saldo || 0).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className={`p-2 font-bold text-lg ${(a.saldo_final_calculado || 0) < 0 ? 'text-red-400' : (a.saldo_final_calculado || 0) > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                                                {a.calculando ? (
                                                    <div className="flex items-center">
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400 mr-1"></div>
                                                        <span className="text-xs">Calculando...</span>
                                                    </div>
                                                ) : (
                                                    `$${(a.saldo_final_calculado || 0).toFixed(2)}`
                                                )}
                                            </td>
                                            <td className="p-2 text-gray-300">
                                              {a.fecha_saldo === addOneDay(fechaFin) ? (
                                                <span className="text-green-400">Actualizado</span>
                                              ) : (
                                                <button
                                                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                                                  onClick={async () => {
                                                    try {
                                                      await actualizarSaldoPendiente({
                                                        clave: a.clave_agente,
                                                        fecha: addOneDay(fechaFin),
                                                        saldo: a.saldo_final_calculado
                                                      });
                                                      alert('Saldo actualizado');
                                                    } catch (e) {
                                                      alert('Error al actualizar saldo');
                                                    }
                                                  }}
                                                >
                                                  Actualizar saldo
                                                </button>
                                              )}
                                            </td>
                                            <td className="p-2">
                                                <div className="flex flex-col gap-1">
                                                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs" onClick={() => mostrarDetalleCompleto(a.clave_agente)}>
                                                        Ver detalle
                                                    </button>
                                                    <button className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs" onClick={() => generarPDFEstadoCuenta(a)}>
                                                        PDF Estado
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>            {/* Mostrar detalle de recibos si está seleccionado */}
            {detalleRecibos && detalleRecibos.usuario && (
                <div className="mt-10 bg-gray-800 border border-gray-700 p-6 rounded shadow">
                    <h3 className="text-lg font-bold mb-4 text-white">
                        Detalle de recibos de {detalleRecibos.usuario.tipo === 'supervisor' ? 'Supervisor' : 'Agente'} {detalleRecibos.usuario.clave_agente}
                        {detalleRecibos.nombre && (
                            <span className="block text-base font-normal text-gray-200 mt-1">{detalleRecibos.nombre}</span>
                        )}
                    </h3>
                    <button className="mb-4 text-sm text-blue-400 underline hover:text-blue-300" onClick={() => setDetalleRecibos(null)}>← Volver al resumen</button>
                    {/* Botón para imprimir/generar PDF con pdfmake */}                    <button
                        className="mb-6 ml-2 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded shadow text-sm font-semibold"
                        onClick={async () => {
                            const pdfMake = (await import('pdfmake/build/pdfmake')).default;
                            const fontsModule = await import('pdfmake/build/vfs_fonts');
                            pdfMake.vfs =
                                fontsModule?.pdfMake?.vfs ||
                                fontsModule?.vfs ||
                                fontsModule?.default?.vfs ||
                                fontsModule?.default?.pdfMake?.vfs;

                            // Construir tabla de recibos
                            const body = [
                                [
                                    { text: 'Póliza', style: 'tableHeader' },
                                    { text: 'Recibo', style: 'tableHeader' },
                                    { text: 'Fecha movimiento', style: 'tableHeader' },
                                    { text: 'Asegurado', style: 'tableHeader' },
                                    { text: 'Comisión', style: 'tableHeader' }
                                ]
                            ];
                            detalleRecibos.recibos.forEach(r => {
                                let comision = detalleRecibos.usuario.tipo === 'supervisor' ? Number(r.comis_super || 0) : Number(r.comis_agente || 0);
                                body.push([
                                    r.no_poliza,
                                    r.recibo,
                                    r.fecha_movimiento ? formatDateYMD(r.fecha_movimiento) : '-',
                                    r.nombre_asegurado,
                                    `$${comision.toFixed(2)}`
                                ]);
                            });
                            // Fila de saldo pendiente
                            let saldoPendiente = 0;
                            if (saldosPorAgente && saldosPorAgente[detalleRecibos.usuario.clave_agente]) {
                                saldoPendiente = Number(saldosPorAgente[detalleRecibos.usuario.clave_agente].saldo || 0);
                            }
                            if (saldoPendiente !== 0) {
                                body.push([
                                    '', '', '', { text: 'Saldo pendiente', bold: true }, { text: `$${saldoPendiente.toFixed(2)}`, bold: true } ]);
                            }
                            // Resumen de pago
                            let totalComision = 0;
                            if (detalleRecibos.usuario.tipo === 'supervisor') {
                                totalComision = detalleRecibos.recibos.reduce((sum, r) => sum + Number(r.comis_super || 0), 0);
                            } else {
                                totalComision = detalleRecibos.recibos.reduce((sum, r) => sum + Number(r.comis_agente || 0), 0);
                            }
                            let totalPagar = totalComision + saldoPendiente;
                            if (totalPagar < 0) totalPagar = 0;
                            const docDefinition = {
                                content: [
                                    { text: `Detalle de recibos de ${detalleRecibos.usuario.tipo === 'supervisor' ? 'Supervisor' : 'Agente'} ${detalleRecibos.usuario.clave_agente}${detalleRecibos.nombre ? ' - ' + detalleRecibos.nombre : ''}`, style: 'header', margin: [0,0,0,10] },
                                    {
                                        style: 'tableExample',
                                        table: {
                                            headerRows: 1,
                                            widths: ['auto', 'auto', 'auto', '*', 'auto'],
                                            body
                                        },
                                        layout: 'lightHorizontalLines',
                                        margin: [0,0,0,20]
                                    },
                                    { text: 'Resumen de pago', style: 'subheader', margin: [0,0,0,8] },
                                    {
                                        columns: [
                                            [
                                                { text: `Total comisión: $${totalComision.toFixed(2)}`, style: 'summary' },                                                ...(saldoPendiente !== 0 ? [{ text: `Saldo pendiente: $${saldoPendiente.toFixed(2)}`, style: 'summary' }] : []),
                                                { text: `Saldo final: $${totalPagar.toFixed(2)}`, style: 'summaryTotal', margin: [0,8,0,0] }
                                            ]
                                        ]
                                    }
                                ],
                                styles: {
                                    header: { fontSize: 16, bold: true },
                                    subheader: { fontSize: 13, bold: true },
                                    tableHeader: { bold: true, fillColor: '#e5e7eb', color: '#111827' },
                                    summary: { fontSize: 11 },
                                    summaryTotal: { fontSize: 13, bold: true, color: '#15803d' }
                                }
                            };
                            pdfMake.createPdf(docDefinition).download(`detalle_${detalleRecibos.usuario.tipo}_${detalleRecibos.usuario.clave_agente}.pdf`);
                        }}
                    >
                        Imprimir / PDF
                    </button>                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs bg-gray-800 border border-gray-700">
                            <thead>
                                <tr className="bg-gray-700">
                                    <th className="p-2 text-white">Póliza</th>
                                    <th className="p-2 text-white">Recibo</th>
                                    <th className="p-2 text-white">Fecha movimiento</th>
                                    <th className="p-2 text-white">Asegurado</th>
                                    <th className="p-2 text-white">Comisión</th>
                                    <th className="p-2 text-white">Com. Promotoria</th>
                                    <th className="p-2 text-white">DSN</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalleRecibos.recibos.map((r, i) => {
                                    let comision = 0;
                                    if (detalleRecibos.usuario.tipo === 'supervisor') {
                                        comision = Number(r.comis_super || 0);
                                    } else {
                                        comision = Number(r.comis_agente || 0);
                                    }
                                    return (
                                        <tr key={i} className="border-b border-gray-600 bg-gray-800">
                                            <td className="p-2 text-white">{r.no_poliza}</td>
                                            <td className="p-2 text-white">{r.recibo}</td>
                                            <td className="p-2 text-white">{formatDateYMD(r.fecha_movimiento)}</td>
                                            <td className="p-2 text-white">{r.nombre_asegurado}</td>
                                            <td className="p-2 text-blue-400 font-medium">${comision.toFixed(2)}</td>
                                            <td className="p-2 text-green-400">${Number(r.comis_promo || 0).toFixed(2)}</td>
                                            <td className="p-2 text-white">{r.dsn || '-'}</td>
                                        </tr>
                                    );
                                })}
                                {/* Fila de saldo pendiente como si fuera un recibo más */}
                                {(() => {
                                    let saldoPendiente = 0;
                                    if (saldosPorAgente && saldosPorAgente[detalleRecibos.usuario.clave_agente]) {
                                        saldoPendiente = Number(saldosPorAgente[detalleRecibos.usuario.clave_agente].saldo || 0);
                                    }
                                    if (saldoPendiente !== 0) {
                                        return (
                                            <tr className="bg-yellow-900/30 border-b border-gray-600 font-semibold">
                                                <td className="p-2 text-white" colSpan={6}>Saldo pendiente</td>
                                                <td className="p-2 text-yellow-400 font-bold">${saldoPendiente.toFixed(2)}</td>
                                            </tr>
                                        );
                                    }
                                    return null;
                                })()}
                            </tbody>
                        </table>
                    </div>{/* Resumen de pago */}
                    <div className="mt-6 p-4 bg-gradient-to-r from-gray-700 via-gray-800 to-gray-700 rounded shadow-lg border border-gray-600">
                        <h4 className="font-bold text-lg mb-3 text-gray-200 flex items-center gap-2">
                            <span>💸 Resumen de Pago</span>
                        </h4>
                        {(() => {
                            let totalComision = 0;
                            if (detalleRecibos.usuario.tipo === 'supervisor') {
                                totalComision = detalleRecibos.recibos.reduce((sum, r) => sum + Number(r.comis_super || 0), 0);
                            } else {
                                totalComision = detalleRecibos.recibos.reduce((sum, r) => sum + Number(r.comis_agente || 0), 0);
                            }
                            let saldoPendiente = 0;
                            if (saldosPorAgente && saldosPorAgente[detalleRecibos.usuario.clave_agente]) {
                                saldoPendiente = Number(saldosPorAgente[detalleRecibos.usuario.clave_agente].saldo || 0);
                            }
                            const totalPagar = totalComision + saldoPendiente;
                            return (                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base">
                                    <div>
                                        <div className="flex justify-between py-1 border-b border-gray-600">
                                            <span className="font-medium text-white">Total comisión:</span>
                                            <span className="font-bold text-blue-400">${totalComision.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-gray-600">
                                            <span className="font-medium text-white">Saldo pendiente:</span>
                                            <span className="font-bold text-yellow-400">${saldoPendiente.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center items-center">
                                        <div className="text-lg font-bold text-gray-300 mb-2">Total a pagar</div>
                                        <div className="text-3xl font-extrabold text-green-400 mb-2">${totalPagar.toFixed(2)}</div>
                                        <div className="text-xs text-gray-400 text-center mt-2">El pago se realizará cuando el saldo pendiente sea mayor a $0 y se procese el siguiente corte.</div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>                </div>
            )}

            {/* Estado de cuenta cronológico por agente específico - Solo cuando se ve detalle de saldo */}
            {detalleRecibos && detalleRecibos.clave && !detalleRecibos.usuario && (
                <div className="mt-8 bg-gray-800 border border-gray-700 p-4 rounded-lg">
                    <h5 className="font-semibold mb-2 text-white">
                        Estado de cuenta cronológico - {detalleRecibos.esSupervisor ? 'Supervisor' : 'Agente'} {detalleRecibos.clave}
                        {detalleRecibos.esSupervisor && (
                            <span className="block text-sm text-blue-400 mt-1">
                                Incluye movimientos de {detalleRecibos.agentesSupervisados?.length || 0} agente(s) supervisionado(s)
                            </span>
                        )}
                    </h5>
                    <div className="mb-4 text-sm text-gray-300">
                        Período: {fechaInicio} al {fechaFin} | Movimientos ordenados cronológicamente                    </div>                    <table className="min-w-full text-xs border border-gray-600">
                        <thead>
                            <tr className="bg-gray-700">
                                <th className="p-2 text-white">Fecha</th>
                                <th className="p-2 text-white">Concepto</th>
                                <th className="p-2 text-white">Comisión {detalleRecibos.esSupervisor ? 'Supervisor' : 'Agente'}</th>
                                <th className="p-2 text-white">Comisión Promotoria</th>
                                <th className="p-2 text-white">Ajuste Saldo</th>
                                <th className="p-2 text-white">Saldo Corriente</th>
                                <th className="p-2 text-white">Póliza</th>
                                <th className="p-2 text-white">Recibo</th>
                                <th className="p-2 text-white">Asegurado</th>
                                {detalleRecibos.esSupervisor && <th className="p-2 text-white">Agente</th>}
                            </tr>
                        </thead>
                        <tbody>{(() => {
                                const movimientos = [];
                                
                                // Agregar saldo anterior si existe
                                if (detalleRecibos.saldoAnteriorNegativo) {
                                    movimientos.push({
                                        fecha: new Date(detalleRecibos.saldoAnteriorNegativo.fecha),
                                        fechaStr: detalleRecibos.saldoAnteriorNegativo.fecha,
                                        concepto: 'SPEN',
                                        tipo: 'SALDO_INICIAL',
                                        comisionAgente: 0,
                                        comisionPromo: 0,
                                        ajusteSaldo: detalleRecibos.saldoAnteriorNegativo.saldo,
                                        poliza: '',
                                        recibo: '',
                                        asegurado: '',
                                        prioridad: 1
                                    });
                                }
                                
                                                            // Agregar recibos como movimientos de comisión
                                if (Array.isArray(detalleRecibos.recibos)) {
                                    detalleRecibos.recibos.forEach(r => {
                                        const comisionAgente = Number(r.comis_agente) || 0;
                                        const comisionPromo = Number(r.comis_promo) || 0;
                                        const fechaMovimiento = r.fecha_movimiento || r.fecha;
                                        
                                        if (comisionAgente !== 0 || comisionPromo !== 0) {
                                            movimientos.push({
                                                fecha: new Date(fechaMovimiento),
                                                fechaStr: fechaMovimiento,
                                                concepto: r.dsn,
                                                tipo: 'COMISION',
                                                comisionAgente: comisionAgente,
                                                comisionPromo: comisionPromo,
                                                ajusteSaldo: 0,
                                                poliza: r.no_poliza || '',
                                                recibo: r.recibo || '',
                                                asegurado: r.nombre_asegurado || '',
                                                agenteOriginal: r.agente_original || r.clave_agente || '',
                                                prioridad: 3
                                            });
                                        }
                                    });
                                }
                                
                                // Ordenar por fecha y luego por prioridad
                                movimientos.sort((a, b) => {
                                    const fechaCompare = a.fecha.getTime() - b.fecha.getTime();
                                    if (fechaCompare === 0) {
                                        return a.prioridad - b.prioridad;
                                    }
                                    return fechaCompare;
                                });                        // Calcular saldo corriente progresivamente
                        let saldoAcumulado = 0;
                        for (let i = 0; i < movimientos.length; i++) {
                            const mov = movimientos[i];
                            if (mov.tipo === 'SALDO_INICIAL') {
                                saldoAcumulado = parseFloat(mov.ajusteSaldo) || 0;
                            } else if (mov.tipo === 'AJUSTE_SALDO') {
                                // Sumar el ajuste al saldo acumulado, no usar saldoNuevo directamente
                                const ajuste = parseFloat(mov.ajusteSaldo) || 0;
                                saldoAcumulado = saldoAcumulado + ajuste;                            } else if (mov.tipo === 'COMISION') {
                                const comisionA = parseFloat(mov.comisionAgente) || 0;
                                // Solo sumar comisión del agente al saldo corriente (promotoría es informativa)
                                saldoAcumulado = saldoAcumulado + comisionA;
                            }
                            mov.saldoFinal = parseFloat(saldoAcumulado.toFixed(2));
                        }                                  if (movimientos.length === 0) {
                                    const colspan = detalleRecibos.esSupervisor ? 11 : 10;
                                    return (
                                        <tr>
                                            <td className="p-2 text-gray-400" colSpan={colspan}>Sin movimientos</td>
                                        </tr>
                                    );
                                }
                                
                                return movimientos.map((mov, idx) => (
                                            <tr key={idx} className={
                                                mov.tipo === 'SALDO_INICIAL' 
                                                    ? (mov.saldoFinal < 0 ? 'bg-red-900/30 font-bold' : 'bg-green-900/30 font-bold')
                                                    : mov.tipo === 'AJUSTE_SALDO'
                                                    ? (parseFloat(mov.ajusteSaldo || 0) > 0 ? 'bg-green-900/20' : 'bg-red-900/20')
                                                    : 'bg-blue-900/20'
                                            }>
                                        <td className="p-2 text-white">{mov.fechaStr}</td>
                                        <td className="p-2 font-medium text-white">{mov.concepto}</td>
                                        <td className="p-2 text-right">
                                            {(Number(mov.comisionAgente) || 0) !== 0 ? 
                                                <span className={(Number(mov.comisionAgente) || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    ${(Number(mov.comisionAgente) || 0).toFixed(2)}
                                                </span> : '-'
                                            }
                                        </td>
                                        <td className="p-2 text-right">
                                            {(Number(mov.comisionPromo) || 0) !== 0 ? 
                                                <span className={(Number(mov.comisionPromo) || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                                                    ${(Number(mov.comisionPromo) || 0).toFixed(2)}
                                                </span> : '-'
                                            }
                                        </td>
                                        <td className="p-2 text-right">{(Number(mov.ajusteSaldo) || 0) !== 0 ? 
                                            <span className={(Number(mov.ajusteSaldo) || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                                                ${(Number(mov.ajusteSaldo) || 0).toFixed(2)}
                                            </span> : '-'}</td>
                                        <td className={`p-2 text-right font-bold ${
                                            (Number(mov.saldoFinal) || 0) < 0 ? 'text-red-400' : 
                                            (Number(mov.saldoFinal) || 0) > 0 ? 'text-green-400' : 'text-gray-400'
                                        }`}>
                                            ${(Number(mov.saldoFinal) || 0).toFixed(2)}
                                        </td>
                                        <td className="p-2 text-xs text-gray-300">{mov.poliza}</td>
                                        <td className="p-2 text-xs text-gray-300">{mov.recibo}</td>
                                        <td className="p-2 text-xs text-gray-300">{mov.asegurado}</td>
                                        {detalleRecibos.esSupervisor && (
                                            <td className="p-2 text-xs text-gray-300">{mov.agenteOriginal || '-'}</td>
                                        )}
                                    </tr>
                                ));
                            })()}</tbody>
                    </table>{/* Resumen final */}
                    <div className="mt-4 p-3 bg-gray-700 rounded border border-gray-600">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="font-semibold text-white">Total Comisiones:</span>
                                <div className="text-green-400 font-bold">
                                    ${Array.isArray(detalleRecibos.recibos) ? 
                                        detalleRecibos.recibos.reduce((sum, r) => sum + (Number(r.comis_agente) || 0), 0).toFixed(2) : '0.00'}
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-white">Total Promotoria:</span>
                                <div className="text-blue-400 font-bold">
                                    ${Array.isArray(detalleRecibos.recibos) ? 
                                        detalleRecibos.recibos.reduce((sum, r) => sum + (Number(r.comis_promo) || 0), 0).toFixed(2) : '0.00'}
                                </div>
                            </div>
                                    <div>
                                        <span className="font-semibold text-white">Saldo Inicial:</span>
                                        <div className={`font-bold ${(parseFloat(detalleRecibos.saldoAnteriorNegativo?.saldo) || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            ${(parseFloat(detalleRecibos.saldoAnteriorNegativo?.saldo) || 0).toFixed(2)}
                                        </div>
                                    </div>                            <div>
                                <span className="font-semibold text-white">Saldo Final:</span>
                                        <div className={`font-bold text-lg ${
                                            (() => {
                                                const totalComisiones = Array.isArray(detalleRecibos.recibos) ? 
                                                    detalleRecibos.recibos.reduce((sum, r) => sum + (Number(r.comis_agente) || 0), 0) : 0;
                                                const saldoInicial = parseFloat(detalleRecibos.saldoAnteriorNegativo?.saldo) || 0;
                                                
                                                // Sumar todos los ajustes de saldo del rango
                                                const totalAjustes = Array.isArray(detalleRecibos.saldosRango) ? 
                                                    detalleRecibos.saldosRango.reduce((sum, s, index) => {
                                                        if (index === 0) {
                                                            // Primer saldo del rango: diferencia con saldo inicial
                                                            return sum + (s.saldo - saldoInicial);
                                                        } else {
                                                            // Saldos subsecuentes: diferencia con el anterior
                                                            return sum + (s.saldo - detalleRecibos.saldosRango[index - 1].saldo);
                                                        }
                                                    }, 0) : 0;
                                                
                                                const saldoFinal = saldoInicial + totalAjustes + totalComisiones;
                                                return saldoFinal < 0 ? 'text-red-400' : saldoFinal > 0 ? 'text-green-400' : 'text-gray-400';
                                            })()
                                        }`}>
                                            ${(() => {
                                                const totalComisiones = Array.isArray(detalleRecibos.recibos) ? 
                                                    detalleRecibos.recibos.reduce((sum, r) => sum + (Number(r.comis_agente) || 0), 0) : 0;
                                                const saldoInicial = parseFloat(detalleRecibos.saldoAnteriorNegativo?.saldo) || 0;
                                                
                                                // Sumar todos los ajustes de saldo del rango
                                                const totalAjustes = Array.isArray(detalleRecibos.saldosRango) ? 
                                                    detalleRecibos.saldosRango.reduce((sum, s, index) => {
                                                        if (index === 0) {
                                                            // Primer saldo del rango: diferencia con saldo inicial
                                                            return sum + (s.saldo - saldoInicial);
                                                        } else {
                                                            // Saldos subsecuentes: diferencia con el anterior
                                                            return sum + (s.saldo - detalleRecibos.saldosRango[index - 1].saldo);
                                                        }
                                                    }, 0) : 0;
                                                
                                                return (saldoInicial + totalAjustes + totalComisiones).toFixed(2);
                                            })()}
                                        </div>
                            </div>
                        </div>
                    </div>
                </div>            )}
        </div>
    );
};

export default StatementsPage;
