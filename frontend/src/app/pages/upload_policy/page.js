"use client";
import React, { useState } from "react";
import * as XLSX from "xlsx";
import API_BASE_URL from "@/config";

const UploadPolicyPage = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
        setResult(null);
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
            // Mapear a pares { no_solicitud, no_poliza }
            const updates = rows.map((row) => ({
                no_solicitud: row["SOLICITUD"],
                no_poliza: row["NÚMERO DE PÓLIZA"] || row["NUMERO DE PÓLIZA"] || row["NUMERO DE POLIZA"] || row["NÚMERO DE POLIZA"]
            })).filter(r => r.no_solicitud && r.no_poliza);
            if (updates.length === 0) {
                setResult({ error: "No se encontraron datos válidos en el archivo." });
                setLoading(false);
                return;
            }
            // Enviar al backend
            const response = await fetch(`${API_BASE_URL}/api/solicitudes/update-polizas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
            });
            const resJson = await response.json();
            setResult(resJson);
        } catch (err) {
            setResult({ error: "Error procesando el archivo o enviando los datos." });
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-xl">
                <h1 className="text-2xl text-white font-bold mb-6 text-center">Cargar archivo de pólizas</h1>
                <form onSubmit={handleUpload}>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="mb-4 w-full text-white"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition duration-200"
                        disabled={loading}
                    >
                        {loading ? "Procesando..." : "Actualizar pólizas"}
                    </button>
                </form>
                {result && (
                    <div className="mt-6 text-white">
                        {result.error ? (
                            <div className="text-red-400">{result.error}</div>
                        ) : (
                            <div>
                                <div>Actualizaciones exitosas: {result.updated}</div>
                                <div>Solicitudes no encontradas: {result.notFound?.length || 0}</div>
                                {result.joined && result.joined.length > 0 && (
                                    <details className="mt-4">
                                        <summary className="cursor-pointer">Ver detalles de uniones</summary>
                                        <div className="overflow-x-auto mt-2">
                                            <table className="min-w-full text-xs text-left border border-gray-600">
                                                <thead className="bg-gray-700">
                                                    <tr>
                                                        <th className="px-2 py-1 border border-gray-600">Solicitud</th>
                                                        <th className="px-2 py-1 border border-gray-600">Póliza</th>
                                                        <th className="px-2 py-1 border border-gray-600">Agente Clave</th>
                                                        <th className="px-2 py-1 border border-gray-600">Usuario</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.joined.map((item, i) => (
                                                        <tr key={i} className="odd:bg-gray-800 even:bg-gray-700">
                                                            <td className="px-2 py-1 border border-gray-600">{item.no_solicitud}</td>
                                                            <td className="px-2 py-1 border border-gray-600">{item.no_poliza}</td>
                                                            <td className="px-2 py-1 border border-gray-600">{item.agente_clave}</td>
                                                            <td className="px-2 py-1 border border-gray-600">{item.usuario || '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </details>
                                )}
                                {result.notFound?.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer">Ver solicitudes no encontradas</summary>
                                        <ul className="text-xs max-h-32 overflow-y-auto">
                                            {result.notFound.map((s, i) => (
                                                <li key={i}>{s}</li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadPolicyPage;
