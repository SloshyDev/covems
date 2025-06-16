"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import API_BASE_URL from "@/config";
import { UserIcon } from "@heroicons/react/24/outline";
import { gzipCompress } from "@/utils/gzip";

const UploadStatementPage = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [jsonPreview, setJsonPreview] = useState(null);
    const [readyToSend, setReadyToSend] = useState(false);
    const [backendResult, setBackendResult] = useState(null);
    const [currentPage, setCurrentPage] = useState(1); // For pagination
    const pageSize = 8;

    // Filtros para los cards
    const [filtroEstatus, setFiltroEstatus] = useState('');
    const [filtroFormaPago, setFiltroFormaPago] = useState('');
    const [filtroAgente, setFiltroAgente] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        setResult(null);
        setBackendResult(null);
        setReadyToSend(false);
        try {
            const data = await file.arrayBuffer();
            // Usar encoding latin1 para soportar ñ y acentos
            const workbook = XLSX.read(data, { type: 'array', codepage: 1252 });
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
            // Obtener usuarios para mapear supervisor
            const usersRes = await fetch(`${API_BASE_URL}/api/users`);
            const users = usersRes.ok ? await usersRes.json() : [];
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
                // Si dsn es EMI, estatus para filtro será 'NUEVOS'
                const estatusFiltro = (p.dsn || '').toUpperCase() === 'EMI' ? 'NUEVOS' : p.estatus;
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
                    estatusFiltro, // nuevo campo solo para filtro
                    solicitud_ligada: p.solicitud_ligada
                };
            });

            // Generar array de polizas únicas para backend
            const polizasUnicas = Object.values(polizaMap).map(p => {
                let ultimoRecibo = null;
                let fechaUltimoMov = null;
                if (p.fechas_mov.length > 0) {
                    fechaUltimoMov = p.fechas_mov.reduce((a, b) => new Date(a) > new Date(b) ? a : b);
                }
                if (p.vencimientos.length > 0) {
                    const masActual = p.vencimientos.reduce((a, b) => new Date(a.fecha_vencimiento) > new Date(b.fecha_vencimiento) ? a : b);
                    ultimoRecibo = masActual.recibo;
                }
                const estatusFiltro = (p.dsn || '').toUpperCase() === 'EMI' ? 'NUEVOS' : p.estatus;
                return {
                    grupo: p.grupo,
                    clave_agente: parseInt(p.clave_agente),
                    no_poliza: p.no_poliza,
                    nombre_asegurado: p.nombre_asegurado,
                    ultimo_recibo: ultimoRecibo,
                    dsn: p.dsn,
                    fecha_inicio: p.fecha_inicio,
                    fecha_ultimo_mov: fechaUltimoMov,
                    forma_pago: p.forma_pago,
                    estatus: p.estatus,
                    estatusFiltro,
                    solicitud_ligada: p.solicitud_ligada
                };
            });
            // Enriquecer recibos antes de enviar al backend
            const recibosEnriquecidos = rowsFiltrados.map(row => {
                const solicitud = solicitudes.find(s => String(s.no_poliza) === String(row["No. Poliza"]));
                let clave_agente = solicitud ? solicitud.agente_clave : row["Clave del agente"];
                if (!clave_agente || clave_agente === "null" || clave_agente === null) clave_agente = "SIN_AGENTE";
                const dsn = (row["Dsn"] || "").toString().trim().toUpperCase();
                const anoVig = Number(row["Año Vig."] || row["Ano Vig."] || 0);
                const importeComble = Number(row["Importe Comble"] || 0);
                const porcentaje_comis = Number(row["% Comis"] || 0);
                const nivelacion_variable = Number(row["Nivelacion Variable"] || 0);
                const comis_primer_ano = Number(row["Comis 1er Año"] || 0);
                const comis_renovacion = row["Comis Renvovacion"];
                const prima = Number(row["Prima Fracc"] || 0);
                const recargo = Number(row["Recargo Fijo"] || 0);
                const formaPago = (row["Forma de pago"] || "").toString().trim().toUpperCase();
                const factor = getPagoFactor(formaPago);
                const comis_promo = getComisPromo(nivelacion_variable, comis_primer_ano, importeComble, porcentaje_comis);
                const comis_agente = getComisAgente(dsn, String(clave_agente).trim(), anoVig, importeComble, comis_promo, prima, recargo, factor);
                const comis_super = getComisSuper(dsn, importeComble, factor);
                // Buscar supervisor_clave
                const user = users.find(u => String(u.clave) === String(clave_agente));
                let supervisor_clave = null;
                if (user && user.supervisor_clave) {
                    supervisor_clave = user.supervisor_clave;
                }
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
                    estatus: dsn === "CAN" ? "CANCELADA" : "VIGENTE",
                    solicitud_ligada: solicitud ? solicitud.no_solicitud : null,
                    prima_fracc: row["Prima Fracc"],
                    recargo_fijo: row["Recargo Fijo"],
                    importe_comble: row["Importe Comble"],
                    porcentaje_comis: row["% Comis"],
                    nivelacion_variable: row["Nivelacion Variable"],
                    comis_primer_ano: row["Comis 1er Año"],
                    comis_renovacion,
                    ano_vig: anoVig,
                    comis_promo,
                    comis_agente,
                    comis_super,
                    clave_supervisor: supervisor_clave || '-' // Ahora el campo es clave_supervisor para backend
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
            // Log para depuración: mostrar arrays en tabla
            // Mostrar solo columnas relevantes en los logs
            // Redondear comis_promo y comis_agente a dos decimales en los logs
            const polizasLog = polizas.map(p => ({ ...p }));
            const recibosLog = recibosEnriquecidos.map(r => ({
                ...r,
                comis_promo: r.comis_promo !== null && r.comis_promo !== undefined && !isNaN(r.comis_promo) ? Math.round(Number(r.comis_promo) * 100) / 100 : r.comis_promo,
                comis_agente: r.comis_agente !== null && r.comis_agente !== undefined && !isNaN(r.comis_agente) && r.comis_agente !== '-' ? Math.round(Number(r.comis_agente) * 100) / 100 : r.comis_agente
            }));
            console.table(polizasLog);
            console.table(recibosLog);
            // Mostrar tabla en pantalla con la información de los recibos
            setResult({
                info: 'Datos listos para enviar. Se enviarán los siguientes datos al backend:',
                resumen: {
                    total_recibos: recibosEnriquecidos.length,
                    total_polizas: polizasUnicas.length,
                    polizas_muestra: polizasUnicas.slice(0, 5),
                    recibos_muestra: recibosEnriquecidos.slice(0, 5)
                }
            });
            setJsonPreview({
                polizas: polizasUnicas,
                recibos: recibosEnriquecidos
            });
            console.log('Polizas a enviar:', polizasUnicas);
            console.log('Recibos a enviar:', recibosEnriquecidos);
            setCurrentPage(1); // Reset to first page on new upload
            setReadyToSend(true);
            setLoading(false);
        } catch (err) {
            setResult({ error: "Error procesando el archivo o enviando los datos." });
        }
        setLoading(false);
    };

    const handleSendToBackend = async () => {
        setLoading(true);
        setBackendResult(null);
        try {
            // Comprimir los datos antes de enviarlos
            const compressed = gzipCompress(jsonPreview);
            const uploadRes = await fetch(`${API_BASE_URL}/api/recibos/upload-statement`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/octet-stream' },
                body: compressed
            });
            if (uploadRes.ok) {
                setBackendResult({ info: 'Recibos y pólizas subidos correctamente.' });
            } else {
                const errorData = await uploadRes.json().catch(() => ({}));
                setBackendResult({ error: errorData.error || 'Error al subir los recibos y pólizas.' });
            }
        } catch (error) {
            setBackendResult({ error: error.message });
        }
        setLoading(false);
    };

    // Función auxiliar para factor de forma de pago
    const getPagoFactor = (formaPago) => {
        if (formaPago === "H") return 24;
        if (formaPago === "M") return 12;
        return 1;
    };
    // Función auxiliar para comis_promo
    const getComisPromo = (nivelacion_variable, comis_primer_ano, importe_comble, porcentaje_comis) => {
        if (nivelacion_variable !== 0) return nivelacion_variable;
        if (comis_primer_ano !== 0) return comis_primer_ano;
        return importe_comble * (porcentaje_comis / 100);
    };
    // Función auxiliar para comis_agente
    const getComisAgente = (dsn, claveAgente, anoVig, importeComble, comisPromo, prima, recargo, factor) => {
        if (dsn === "EMI") return Math.round(((prima - recargo) * factor * 0.225) * 100) / 100;
        if (dsn === "CAN") {
            if (anoVig === 1) return -1 * Math.round(((prima - recargo) * factor * 0.225) * 100) / 100;
            return 0;
        }
        if (dsn === "COM") {
            if (claveAgente === "2") return Math.round((comisPromo * 0.96) * 100) / 100;
            if (anoVig === 2) return Math.round((importeComble * 0.10) * 100) / 100;
            if (anoVig === 3) return Math.round((importeComble * 0.05) * 100) / 100;
            if (anoVig >= 4 && anoVig <= 10) return Math.round((importeComble * 0.01) * 100) / 100;
        }
        return '-';
    };
    // Función auxiliar para comis_super
    const getComisSuper = (dsn, importeComble, factor) => {
        if (dsn === "EMI") return Math.round((importeComble * factor * 0.07) * 100) / 100;
        if (dsn === "CAN" && factor !== 0) return -1 * Math.round((importeComble * factor * 0.07) * 100) / 100;
        return null;
    };
    // Calcular comisiones solo del último recibo para cada póliza
    const getUltimoReciboComisiones = (poliza, recibos) => {
        if (!poliza || !recibos) return { comis_agente: '-', comis_super: '-', comis_promo: '-' };
        const ultRecibo = poliza.ultimo_recibo;
        // Buscar recibo por coincidencia estricta o por tipo string/number
        let recibo = recibos.find(r => String(r.no_poliza) === String(poliza.no_poliza) && String(r.recibo) === String(ultRecibo));
        if (!recibo) {
            // Buscar el primer recibo EMI o CAN de la póliza
            recibo = recibos.find(r => String(r.no_poliza) === String(poliza.no_poliza) && (String(r.dsn).toUpperCase() === 'EMI' || String(r.dsn).toUpperCase() === 'CAN'));
        }
        return {
            comis_agente: recibo && recibo.comis_agente !== undefined ? recibo.comis_agente : '-',
            comis_super: recibo && recibo.comis_super !== undefined ? recibo.comis_super : '-',
            comis_promo: recibo && recibo.comis_promo !== undefined ? recibo.comis_promo : '-',
        };
    };

    // Asegúrate de definir esta función dentro del componente para que esté disponible en el render
    const comisionesPorPoliza = (poliza) => {
        if (jsonPreview && jsonPreview.recibos) {
            return getUltimoReciboComisiones(poliza, jsonPreview.recibos);
        }
        return { comis_agente: '-', comis_super: '-', comis_promo: '-' };
    };

    // Obtener valores únicos para los selects
    const estatusOptions = jsonPreview ? [...new Set(jsonPreview.polizas.map(p => p.estatusFiltro))] : [];
    const formaPagoOptions = jsonPreview ? [...new Set(jsonPreview.polizas.map(p => p.forma_pago))] : [];
    const agenteOptions = jsonPreview ? [...new Set(jsonPreview.polizas.map(p => p.clave_agente))] : [];

    // Filtrar polizas según selects
    const polizasFiltradas = jsonPreview && jsonPreview.polizas ? jsonPreview.polizas.filter(p => {
        return (
            (!filtroEstatus || p.estatusFiltro === filtroEstatus) &&
            (!filtroFormaPago || p.forma_pago === filtroFormaPago) &&
            (!filtroAgente || String(p.clave_agente) === String(filtroAgente))
        );
    }) : [];

    // Paginación sobre polizas filtradas
    const paginatedPolizas = polizasFiltradas.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.max(1, Math.ceil(polizasFiltradas.length / pageSize));

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
            {/* Overlay de carga */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin h-16 w-16 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                        <span className="text-white text-lg font-semibold">Procesando...</span>
                    </div>
                </div>
            )}
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-fit px-4 mb-8">
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
                            type="submit"
                            className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition duration-200"
                            disabled={loading || !file}
                        >
                            {loading ? "Procesando..." : "Subir archivo"}
                        </button>
                    </div>
                </form>
                {result && (
                    <div className="mt-6 text-white">
                        {result.error ? (
                            <div className="text-red-400">{result.error}</div>
                        ) : (
                            <div>
                                <div>{result.info}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {jsonPreview && (
                <div className="w-full max-w-screen-2xl mx-auto">
                    <div className="flex flex-wrap gap-4 mb-6">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Estatus</label>
                            <select value={filtroEstatus} onChange={e => { setFiltroEstatus(e.target.value); setCurrentPage(1); }} className="bg-gray-700 text-white rounded px-2 py-1">
                                <option value="">Todos</option>
                                {estatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Forma de Pago</label>
                            <select value={filtroFormaPago} onChange={e => { setFiltroFormaPago(e.target.value); setCurrentPage(1); }} className="bg-gray-700 text-white rounded px-2 py-1">
                                <option value="">Todas</option>
                                {formaPagoOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Clave Agente</label>
                            <select value={filtroAgente} onChange={e => { setFiltroAgente(e.target.value); setCurrentPage(1); }} className="bg-gray-700 text-white rounded px-2 py-1">
                                <option value="">Todos</option>
                                {agenteOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="mb-4">
                        <span className="font-bold text-white">Vista previa de pólizas a generar:</span>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {paginatedPolizas.map((poliza, idx) => {
                                const comis = comisionesPorPoliza(poliza);
                                return (
                                    <div
                                        key={idx}
                                        className="bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col justify-between rounded-xl shadow-lg border border-gray-700 hover:shadow-xl hover:border-blue-600 transition-all duration-200 overflow-hidden group min-h-64 h-auto max-h-none"
                                    >
                                        {/* Header de la card */}
                                        <div className="p-4 border-b border-gray-700">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                                                        <UserIcon className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3
                                                            className="font-semibold text-white text-lg truncate"
                                                            title={poliza.nombre_asegurado || 'Sin nombre'}
                                                        >
                                                            {(poliza.nombre_asegurado || 'Sin nombre').length > 25
                                                                ? (poliza.nombre_asegurado.substring(0, 25) + '...')
                                                                : poliza.nombre_asegurado || 'Sin nombre'}
                                                        </h3>
                                                        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                                                            <span className="text-sm text-gray-400 font-semibold">Póliza: <span className="text-white">{poliza.no_poliza}</span></span>
                                                            <span className="text-sm text-gray-400 font-semibold">Forma de Pago: <span className="text-white">{poliza.forma_pago || '-'}</span></span>
                                                        </div>
                                                        <p className="text-sm text-gray-400">Clave Agente: {poliza.clave_agente}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${poliza.estatus === 'CANCELADA' ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
                                                    {poliza.estatus}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Información adicional */}
                                        <div className="p-4 space-y-2 flex-1">
                                            <div className="flex flex-col gap-1 text-sm text-gray-300">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">Último Recibo:</span>
                                                    <span className="ml-2 font-mono text-blue-200">{poliza.ultimo_recibo || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">Fecha Último Mov.:</span>
                                                    <span className="ml-2 font-mono text-blue-200">{poliza.fecha_ultimo_mov || '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="font-medium text-green-300">Comisión Agente:</span>
                                                    <span className="ml-2 font-mono text-green-200 text-base">{comis.comis_agente !== undefined && comis.comis_agente !== null && comis.comis_agente !== '-' ? Number(comis.comis_agente).toFixed(2) : '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-purple-300">Comisión Supervisor:</span>
                                                    <span className="ml-2 font-mono text-purple-200 text-base">{comis.comis_super !== undefined && comis.comis_super !== null && comis.comis_super !== '-' ? Number(comis.comis_super).toFixed(2) : '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-yellow-300">Comisión Promotoria:</span>
                                                    <span className="ml-2 font-mono text-yellow-200 text-base">{comis.comis_promo !== undefined && comis.comis_promo !== null && comis.comis_promo !== '-' ? Number(comis.comis_promo).toFixed(2) : '-'}</span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2 border-t border-gray-700 pt-2">
                                                    <span className="font-medium">Solicitud Ligada:</span>
                                                    <span className="ml-2 font-mono text-blue-200">{poliza.solicitud_ligada || '-'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Pagination controls */}
                        <div className="flex justify-center items-center gap-4 mt-6">
                            <button
                                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                Anterior
                            </button>
                            <span>Página {currentPage} de {totalPages}</span>
                            <button
                                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={handleSendToBackend}
                        className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition-colors duration-200"
                        disabled={loading}
                    >
                        {loading ? 'Enviando...' : 'Enviar al backend'}
                    </button>
                    {backendResult && (
                        <div className="mt-4">
                            {backendResult.error ? (
                                <div className="text-red-400">{backendResult.error}</div>
                            ) : (
                                <div className="text-green-400">{backendResult.info}</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UploadStatementPage;