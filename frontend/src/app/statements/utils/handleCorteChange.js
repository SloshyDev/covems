// frontend/src/app/statements/utils/handleCorteChange.js

export function handleCorteChange(e, cortesDisponibles, setCorteSeleccionado, setFechaInicio, setFechaFin, setRecibosPorFecha, setResumenCalculado, setSaldosPorAgente, setAgenteSupervisorMap, setDetalleRecibos, setDebeCalcularDetallados) {
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
    setAgenteSupervisorMap({});
    setDetalleRecibos(null);
    setDebeCalcularDetallados(false);
}