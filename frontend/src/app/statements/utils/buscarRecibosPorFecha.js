// frontend/src/app/statements/utils/buscarRecibosPorFecha.js

import API_BASE_URL from '../../../config.js';

export async function buscarRecibosPorFecha(
  e,
  fechaInicio,
  fechaFin,
  corteSeleccionado,
  setLoadingFechas,
  setErrorFechas,
  setRecibosPorFecha,
  setSaldosPorAgente,
  setAgenteSupervisorMap
) {
  e.preventDefault();
  setLoadingFechas(true);
  setErrorFechas("");
  setRecibosPorFecha([]);
  setSaldosPorAgente({});
  setAgenteSupervisorMap({});

  if (!corteSeleccionado || !fechaInicio || !fechaFin) {
    setErrorFechas("Selecciona un corte");
    setLoadingFechas(false);
    return;
  }

  try {
    const resRecibos = await fetch(`${API_BASE_URL}/api/recibos/por-fecha?inicio=${fechaInicio}&fin=${fechaFin}`);
    if (!resRecibos.ok) {
      const errorText = await resRecibos.text();
      throw new Error(`Error buscando recibos: ${resRecibos.status} - ${errorText}`);
    }
    const dataRecibos = await resRecibos.json();
    setRecibosPorFecha(dataRecibos);

    // Obtener claves únicas de agentes y supervisores
    const clavesAgentes = [...new Set(dataRecibos.map(r => r.clave_agente).filter(Boolean))];
    const supervisoresClave = [...new Set(dataRecibos.map(r => r.clave_supervisor).filter(Boolean))];
    const todasLasClaves = [...clavesAgentes, ...supervisoresClave];

    // Buscar los saldos pendientes de todas las claves de una vez
    try {
      const resSaldos = await fetch(`${API_BASE_URL}/api/saldos/multiples-pendientes?inicio=${fechaInicio}&fin=${fechaFin}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claves: todasLasClaves })
      });
      if (!resSaldos.ok) {
        throw new Error('Error obteniendo saldos');
      }
      const dataSaldos = await resSaldos.json();
      setSaldosPorAgente(dataSaldos);
    } catch (err) {
      setErrorFechas('Error obteniendo saldos');
    }

    // ...continúa con el resto de la lógica que necesites...
  } catch (err) {
    setErrorFechas(err.message);
  } finally {
    setLoadingFechas(false);
  }
}