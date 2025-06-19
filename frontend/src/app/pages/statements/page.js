'use client';
import React, { useState, useMemo } from "react";
import API_BASE_URL from '../../../config';

const StatementsPage = () => {
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [recibosPorFecha, setRecibosPorFecha] = useState([]);
    const [loadingFechas, setLoadingFechas] = useState(false);
    const [errorFechas, setErrorFechas] = useState("");


    const buscarRecibosPorFecha = async (e) => {
        e.preventDefault();
        setLoadingFechas(true);
        setErrorFechas("");
        setRecibosPorFecha([]);
        if (!fechaInicio || !fechaFin) {
            setErrorFechas("Selecciona ambas fechas");
            setLoadingFechas(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/api/recibos/por-fecha?inicio=${fechaInicio}&fin=${fechaFin}`);
            if (!res.ok) throw new Error("Error buscando recibos");
            const data = await res.json();
            setRecibosPorFecha(data);
        } catch (err) {
            setErrorFechas("No se pudo buscar recibos por fecha.");
        }
        setLoadingFechas(false);
    };

    // Agrupar por agente y sumar comisiones
    const resumenPorAgente = useMemo(() => {
        if (!recibosPorFecha.length) return [];
        const map = {};
        recibosPorFecha.forEach(r => {
            const clave = r.clave_agente || '-';
            if (!map[clave]) {
                map[clave] = {
                    clave_agente: clave,
                    total_comis_agente: 0,
                    total_comis_super: 0,
                    total_comis_promo: 0,
                    total_recibos: 0
                };
            }
            map[clave].total_comis_agente += Number(r.comis_agente) || 0;
            map[clave].total_comis_super += Number(r.comis_super) || 0;
            map[clave].total_comis_promo += Number(r.comis_promo) || 0;
            map[clave].total_recibos++;
        });
        return Object.values(map);
    }, [recibosPorFecha]);

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Buscar recibos por rango de fechas</h1>
            <form className="flex flex-wrap gap-2 items-center mb-4" onSubmit={buscarRecibosPorFecha}>
                <label className="flex flex-col">Desde
                    <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="p-2 border rounded" required />
                </label>
                <label className="flex flex-col">Hasta
                    <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="p-2 border rounded" required />
                </label>
                <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loadingFechas}>Buscar</button>
            </form>
            {errorFechas && <div className="text-red-500 mt-2">{errorFechas}</div>}
            {loadingFechas && <div className="text-gray-500 mt-2">Buscando...</div>}
            {recibosPorFecha.length > 0 && (
                <div className="mt-4">
                    <h3 className="font-semibold mb-2">Recibos encontrados: {recibosPorFecha.length}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-700">
                                    <th className="p-2">Póliza</th>
                                    <th className="p-2">Recibo</th>
                                    <th className="p-2">Fecha movimiento</th>
                                    <th className="p-2">Asegurado</th>
                                    <th className="p-2">Agente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recibosPorFecha.map((r, i) => (
                                    <tr key={i} className="border-b dark:border-gray-600">
                                        <td className="p-2">{r.no_poliza}</td>
                                        <td className="p-2">{r.recibo}</td>
                                        <td className="p-2">{r.fecha_movimiento}</td>
                                        <td className="p-2">{r.nombre_asegurado}</td>
                                        <td className="p-2">{r.clave_agente}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {resumenPorAgente.length > 0 && (
                <div className="mt-8">
                    <h3 className="font-semibold mb-2">Resumen por agente</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-gray-700">
                                    <th className="p-2">Clave Agente</th>
                                    <th className="p-2">Total Recibos</th>
                                    <th className="p-2">Comisión Agente</th>
                                    <th className="p-2">Comisión Supervisor</th>
                                    <th className="p-2">Comisión Promotoria</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resumenPorAgente.map((a, i) => (
                                    <tr key={i} className="border-b dark:border-gray-600">
                                        <td className="p-2">{a.clave_agente}</td>
                                        <td className="p-2">{a.total_recibos}</td>
                                        <td className="p-2">{a.total_comis_agente.toFixed(2)}</td>
                                        <td className="p-2">{a.total_comis_super.toFixed(2)}</td>
                                        <td className="p-2">{a.total_comis_promo.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatementsPage;
