"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import API_BASE_URL from "@/config";

const UploadStatementPage = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [preview, setPreview] = useState(null);
    const [rowsPreview, setRowsPreview] = useState([]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
        setPreview(null);
        setRowsPreview([]); // Limpiar la previsualización de recibos al cambiar archivo
    };

    const handlePreview = async () => {
        if (!file) return;
        setLoading(true);
        setPreview(null);
        setRowsPreview([]);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            // Obtener solicitudes del backend
            const solicitudesRes = await fetch(`${API_BASE_URL}/api/solicitudes`);
            const solicitudes = solicitudesRes.ok ? await solicitudesRes.json() : [];
            // Agrupar por poliza y contar recibos, ligando clave_agente y solicitud
            const polizaMap = {};
            rows.forEach((row) => {
                const no_poliza = String(row["No. Poliza"]);
                if (!no_poliza) return;
                const solicitud = solicitudes.find(s => String(s.no_poliza) === no_poliza);
                if (!polizaMap[no_poliza]) {
                    polizaMap[no_poliza] = {
                        no_poliza,
                        clave_agente: row["Clave del agente"],
                        nombre_agente: row["Nombre del agente"],
                        nombre_asegurado: row["Nombre Asegurado"],
                        estatus: (row["Dsn"] || "").toUpperCase() === "CAN" ? "CANCELADA" : "VIGENTE",
                        recibos: 0,
                        solicitud_ligada: solicitud ? solicitud.no_solicitud : null,
                        agente_clave: solicitud ? solicitud.agente_clave : null,
                        fechas_mov: [],
                        vencimientos: []
                    };
                }
                polizaMap[no_poliza].recibos++;
                if (row["Fecha movimiento"]) {
                    polizaMap[no_poliza].fechas_mov.push(row["Fecha movimiento"]);
                }
                if (row["Fecha vencimiento"]) {
                    polizaMap[no_poliza].vencimientos.push({
                        fecha_vencimiento: row["Fecha vencimiento"],
                        recibo: row["Recibo"]
                    });
                }
            });
            const previewList = Object.values(polizaMap).map(p => {
                const filaExcel = rows.find(r => String(r["No. Poliza"]) === p.no_poliza);
                const agente_clave_final = p.agente_clave || (filaExcel ? filaExcel["Clave del agente"] : null);
                let fecha_ultimo_mov = null;
                if (p.fechas_mov.length > 0) {
                    fecha_ultimo_mov = p.fechas_mov.reduce((a, b) => new Date(a) > new Date(b) ? a : b);
                }
                let ultimo_recibo = null;
                if (p.vencimientos.length > 0) {
                    const masActual = p.vencimientos.reduce((a, b) => new Date(a.fecha_vencimiento) > new Date(b.fecha_vencimiento) ? a : b);
                    ultimo_recibo = masActual.recibo;
                }
                return {
                    ...p,
                    clave_agente: agente_clave_final,
                    agente_clave: agente_clave_final,
                    solicitud_ligada: p.solicitud_ligada || (solicitudes.find(s => String(s.no_poliza) === p.no_poliza) ? solicitudes.find(s => String(s.no_poliza) === p.no_poliza).no_solicitud : null),
                    fecha_ultimo_mov,
                    ultimo_recibo
                };
            });
            setPreview(previewList);

            // Generar recibos enriquecidos para la tabla de previsualización
            const recibosPreview = rows.map(row => {
                const solicitud = solicitudes.find(s => String(s.no_poliza) === String(row["No. Poliza"]));
                return {
                    grupo: row["Grupo"],
                    clave_agente: solicitud ? solicitud.agente_clave : row["Clave del agente"],
                    no_poliza: row["No. Poliza"],
                    nombre_asegurado: row["Nombre Asegurado"],
                    recibo: row["Recibo"],
                    dsn: row["Dsn"],
                    fecha_inicio: row["Fecha Inicio"],
                    fecha_movimiento: row["Fecha movimiento"],
                    fecha_vencimiento: row["Fecha vencimiento"],
                    forma_pago: row["Forma de pago"],
                    estatus: (row["Dsn"] || "").toUpperCase() === "CAN" ? "CANCELADA" : "VIGENTE",
                    solicitud_ligada: solicitud ? solicitud.no_solicitud : null
                };
            });
            setRowsPreview(recibosPreview);
        } catch (err) {
            setPreview([]);
            setRowsPreview([]);
        }
        setLoading(false);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        setResult(null);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            // Filtrar filas de fin de archivo por columna 'Grupo'
            const rowsFiltrados = rows.filter(row => {
                const grupo = String(row["Grupo"] || "").trim().toUpperCase();
                return grupo !== "** FIN DE ARCHIVO" && grupo !== "FIN DE ARCHIVO" && grupo !== "";
            });
            // Obtener solicitudes del backend para ligar agente_clave
            const solicitudesRes = await fetch(`${API_BASE_URL}/api/solicitudes`);
            const solicitudes = solicitudesRes.ok ? await solicitudesRes.json() : [];
            // Agrupa por no_poliza para calcular ultimo_recibo y fecha_ultimo_mov y fecha_vencimiento
            const polizaMap = {};
            rowsFiltrados.forEach((row) => {
                const no_poliza = String(row["No. Poliza"]);
                if (!no_poliza) return;
                const solicitud = solicitudes.find(s => String(s.no_poliza) === no_poliza);
                const agente_clave_final = solicitud ? solicitud.agente_clave : row["Clave del agente"];
                if (!polizaMap[no_poliza]) {
                    polizaMap[no_poliza] = {
                        grupo: row["Grupo"],
                        clave_agente: agente_clave_final,
                        no_poliza,
                        nombre_asegurado: row["Nombre Asegurado"],
                        dsn: row["Dsn"],
                        fecha_inicio: row["Fecha Inicio"],
                        forma_pago: row["Forma de pago"],
                        estatus: (row["Dsn"] || "").toUpperCase() === "CAN" ? "CANCELADA" : "VIGENTE",
                        solicitud_ligada: solicitud ? solicitud.no_solicitud : null,
                        recibos: [],
                        fechas_mov: [],
                        vencimientos: []
                    };
                }
                polizaMap[no_poliza].recibos.push({
                    recibo: row["Recibo"],
                    fecha_movimiento: row["Fecha movimiento"],
                    fecha_vencimiento: row["Fecha vencimiento"]
                });
                if (row["Fecha movimiento"]) {
                    polizaMap[no_poliza].fechas_mov.push(row["Fecha movimiento"]);
                }
                if (row["Fecha vencimiento"]) {
                    polizaMap[no_poliza].vencimientos.push({
                        fecha_vencimiento: row["Fecha vencimiento"],
                        recibo: row["Recibo"]
                    });
                }
            });
            // Calcula ultimo_recibo y fecha_ultimo_mov para cada poliza
            const polizas = Object.values(polizaMap).map(p => {
                let ultimoRecibo = null;
                let fechaUltimoMov = null;
                // Para fecha_ultimo_mov (por fecha movimiento)
                if (p.fechas_mov.length > 0) {
                    fechaUltimoMov = p.fechas_mov.reduce((a, b) => new Date(a) > new Date(b) ? a : b);
                }
                // Para ultimo_recibo (por fecha vencimiento más actual)
                if (p.vencimientos.length > 0) {
                    const masActual = p.vencimientos.reduce((a, b) => new Date(a.fecha_vencimiento) > new Date(b.fecha_vencimiento) ? a : b);
                    ultimoRecibo = masActual.recibo;
                }
                return {
                    grupo: p.grupo,
                    clave_agente: p.clave_agente,
                    no_poliza: p.no_poliza,
                    nombre_asegurado: p.nombre_asegurado,
                    ultimo_recibo: ultimoRecibo,
                    dsn: p.dsn,
                    fecha_inicio: p.fecha_inicio,
                    fecha_ultimo_mov: fechaUltimoMov,
                    forma_pago: p.forma_pago,
                    estatus: p.estatus,
                    solicitud_ligada: p.solicitud_ligada
                };
            });

            // Enriquecer recibos antes de enviar al backend
            const recibosEnriquecidos = rowsFiltrados.map(row => {
                const solicitud = solicitudes.find(s => String(s.no_poliza) === String(row["No. Poliza"]));
                let clave_agente = solicitud ? solicitud.agente_clave : row["Clave del agente"];
                if (!clave_agente || clave_agente === "null" || clave_agente === null) clave_agente = "SIN_AGENTE";
                return {
                    grupo: row["Grupo"],
                    clave_agente,
                    no_poliza: row["No. Poliza"],
                    nombre_asegurado: row["Nombre Asegurado"],
                    recibo: row["Recibo"],
                    dsn: row["Dsn"],
                    fecha_inicio: row["Fecha Inicio"],
                    fecha_movimiento: row["Fecha movimiento"],
                    fecha_vencimiento: row["Fecha vencimiento"],
                    forma_pago: row["Forma de pago"],
                    estatus: (row["Dsn"] || "").toUpperCase() === "CAN" ? "CANCELADA" : "VIGENTE",
                    solicitud_ligada: solicitud ? solicitud.no_solicitud : null,
                    prima_fracc: row["Prima Fracc"],
                    recargo_fijo: row["Recargo Fijo"],
                    importe_comble: row["Importe Comble"],
                    porcentaje_comis: row["% Comis"],
                    nivelacion_variable: row["Nivelacion Variable"],
                    comis_primer_ano: row["Comis 1er Año"],
                    comis_renovacion: row["Comis Renvovacion"]
                };
            });
            // Validar que ningún recibo tenga clave_agente vacío
            const recibosSinAgente = recibosEnriquecidos.filter(r => !r.clave_agente || r.clave_agente === "SIN_AGENTE");
            if (recibosSinAgente.length > 0) {
                const detalles = recibosSinAgente.map(r => `Poliza: ${r.no_poliza || '-'}, Recibo: ${r.recibo || '-'}`).join('\n');
                setResult({ error: `Hay ${recibosSinAgente.length} recibos sin clave de agente.\nCorrige el archivo o liga las solicitudes antes de subir.\n\nDetalles:\n${detalles}` });
                setLoading(false);
                return;
            }
            // Mostrar tablas de confirmación antes de enviar
            setResult({
                confirmTables: {
                    polizas,
                    recibos: recibosEnriquecidos
                }
            });
            // Esperar confirmación del usuario
            if (!window.confirm(`¿Estás seguro que deseas subir ${polizas.length} pólizas y ${rowsFiltrados.length} recibos?`)) {
                setLoading(false);
                return;
            }
            // Enviar al backend: polizas deduplicadas y recibos enriquecidos
            const response = await fetch(`${API_BASE_URL}/api/recibos/upload-statement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ polizas, recibos: recibosEnriquecidos }),
            });
            const resJson = await response.json();
            setResult(resJson);
        } catch (err) {
            setResult({ error: "Error procesando el archivo o enviando los datos." });
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-4xl">
                <h1 className="text-2xl text-white font-bold mb-6 text-center">Cargar archivo de estado de cuenta</h1>
                <form onSubmit={handleUpload}>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="mb-4 w-full text-white"
                        required
                    />
                    <div className="flex gap-4 mb-4">
                        <button
                            type="button"
                            className="w-full bg-green-500 text-white py-3 rounded hover:bg-green-600 transition duration-200"
                            onClick={handlePreview}
                            disabled={loading || !file}
                        >
                            {loading ? "Procesando..." : "Previsualizar polizas"}
                        </button>
                        <button
                            type="submit"
                            className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition duration-200"
                            disabled={loading || !file}
                        >
                            {loading ? "Procesando..." : "Subir archivo"}
                        </button>
                    </div>
                </form>
                {preview && (
                    <div className="mt-6 text-white">
                        <h2 className="text-lg font-bold mb-2">Polizas a crear y cantidad de recibos</h2>
                        <div className="overflow-x-auto mb-8">
                            <table className="min-w-full text-xs text-left border border-gray-600">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-2 py-1 border border-gray-600">No. Poliza</th>
                                        <th className="px-2 py-1 border border-gray-600">Clave Agente</th>
                                        <th className="px-2 py-1 border border-gray-600">Nombre Asegurado</th>
                                        <th className="px-2 py-1 border border-gray-600">Estatus</th>
                                        <th className="px-2 py-1 border border-gray-600">Recibos</th>
                                        <th className="px-2 py-1 border border-gray-600">Fecha Último Mov.</th>
                                        <th className="px-2 py-1 border border-gray-600">Último Recibo (por vencimiento)</th>
                                        <th className="px-2 py-1 border border-gray-600">Solicitud Ligada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((p, i) => (
                                        <tr key={i} className="odd:bg-gray-800 even:bg-gray-700">
                                            <td className="px-2 py-1 border border-gray-600">{p.no_poliza}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.clave_agente}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.nombre_asegurado}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.estatus}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.recibos}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.fecha_ultimo_mov || <span className='text-red-400'>-</span>}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.ultimo_recibo || <span className='text-red-400'>-</span>}</td>
                                            <td className="px-2 py-1 border border-gray-600">{p.solicitud_ligada || <span className='text-red-400'>No ligada</span>}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Tabla de previsualización de recibos */}
                        <h2 className="text-lg font-bold mb-2">Recibos a subir ({rowsPreview.length})</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs text-left border border-gray-600">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-2 py-1 border border-gray-600">Grupo</th>
                                        <th className="px-2 py-1 border border-gray-600">Clave Agente</th>
                                        <th className="px-2 py-1 border border-gray-600">No. Poliza</th>
                                        <th className="px-2 py-1 border border-gray-600">Nombre Asegurado</th>
                                        <th className="px-2 py-1 border border-gray-600">Recibo</th>
                                        <th className="px-2 py-1 border border-gray-600">Dsn</th>
                                        <th className="px-2 py-1 border border-gray-600">Fecha Inicio</th>
                                        <th className="px-2 py-1 border border-gray-600">Fecha movimiento</th>
                                        <th className="px-2 py-1 border border-gray-600">Fecha vencimiento</th>
                                        <th className="px-2 py-1 border border-gray-600">Forma de pago</th>
                                        <th className="px-2 py-1 border border-gray-600">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rowsPreview && rowsPreview.map((r, i) => (
                                        <tr key={i} className="odd:bg-gray-800 even:bg-gray-700">
                                            <td className="px-2 py-1 border border-gray-600">{r.grupo}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.clave_agente}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.no_poliza}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.nombre_asegurado}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.recibo}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.dsn}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.fecha_inicio}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.fecha_movimiento}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.fecha_vencimiento}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.forma_pago}</td>
                                            <td className="px-2 py-1 border border-gray-600">{r.estatus}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {result && (
                    <div className="mt-6 text-white">
                        {result.error ? (
                            <div className="text-red-400">{result.error}</div>
                        ) : (
                            <div>
                                <div>Recibos insertados: {result.recibos_insertados}</div>
                                <div>Pólizas insertadas/actualizadas: {result.polizas_insertadas}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadStatementPage;