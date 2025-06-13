'use client';
import React, { useState, useMemo, useEffect } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

const SEARCH_TYPES = [
    { value: "poliza", label: "Póliza" },
    { value: "nombre_asegurado", label: "Nombre asegurado" },
    { value: "agente", label: "Agente" },
    { value: "promotoria", label: "Promotoría" },
];

const StatementsPage = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchType, setSearchType] = useState("poliza");
    const [agentes, setAgentes] = useState([]);
    const [selectedAgente, setSelectedAgente] = useState("");

    useEffect(() => {
        if (searchType === "agente" && agentes.length === 0) {
            fetch(`${API_BASE_URL}/api/agentes`)
                .then(res => res.json())
                .then(data => setAgentes(data))
                .catch(() => setAgentes([]));
        }
    }, [searchType]);

    const handleSearch = async (e) => {
        e && e.preventDefault();
        setLoading(true);
        setError("");
        setResults([]);
        let url = "";
        let q = query;
        if (searchType === "agente") {
            if (!selectedAgente) {
                setLoading(false);
                return;
            }
            q = selectedAgente;
        }
        url = `${API_BASE_URL}/api/polizas/buscar?q=${encodeURIComponent(q)}&tipo=${searchType}`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error("Error buscando pólizas");
            const data = await res.json();
            setResults(data);
        } catch (err) {
            setError("No se pudo buscar pólizas.");
        }
        setLoading(false);
    };

    // Estadísticas
    const stats = useMemo(() => {
        if (!results.length) return null;
        const total = results.length;
        const activas = results.filter(p => (p.estatus || '').toUpperCase() !== 'CANCELADA').length;
        const canceladas = total - activas;
        const agentes = {};
        results.forEach(p => {
            const clave = p.clave_agente || '-';
            if (!agentes[clave]) agentes[clave] = { nombre: p.nombre_agente || '-', count: 0 };
            agentes[clave].count++;
        });
        const agentesUnicos = Object.keys(agentes).length;
        const topAgentes = Object.entries(agentes)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 3)
            .map(([clave, info]) => ({ clave, nombre: info.nombre, count: info.count }));
        return { total, activas, canceladas, agentesUnicos, topAgentes };
    }, [results]);

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Buscador de Pólizas</h1>
            <div className="flex gap-4 mb-4">
                <select
                    className="p-2 border rounded"
                    value={searchType}
                    onChange={e => {
                        setSearchType(e.target.value);
                        setResults([]);
                        setQuery("");
                        setSelectedAgente("");
                    }}
                >
                    {SEARCH_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                </select>
            </div>
            {searchType === "agente" ? (
                <div className="mb-4">
                    <select
                        className="p-2 border rounded w-full"
                        value={selectedAgente}
                        onChange={e => { setSelectedAgente(e.target.value); setResults([]); }}
                    >
                        <option value="">Selecciona un agente...</option>
                        {agentes.map(a => (
                            <option key={a.clave} value={a.clave}>{a.nombre} (clave: {a.clave})</option>
                        ))}
                    </select>
                    <button
                        className="mt-2 bg-blue-600 text-white px-4 py-2 rounded w-full"
                        onClick={handleSearch}
                        disabled={!selectedAgente || loading}
                    >
                        {loading ? "Buscando..." : "Ver pólizas de este agente"}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        className="flex-1 p-2 border rounded"
                        placeholder={
                            searchType === "poliza"
                                ? "Buscar por número de póliza..."
                                : searchType === "nombre_asegurado"
                                    ? "Buscar por nombre del asegurado..."
                                    : searchType === "promotoria"
                                        ? "Buscar por promotoría..."
                                        : "Buscar..."
                        }
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        required
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loading}>
                        {loading ? "Buscando..." : "Buscar"}
                    </button>
                </form>
            )}
            {error && <div className="text-red-500 mb-2">{error}</div>}
            {stats && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded p-4 mb-6 flex flex-wrap gap-6 items-center justify-between">
                    <div><b>Total pólizas:</b> {stats.total}</div>
                    <div><b>Activas:</b> {stats.activas}</div>
                    <div><b>Canceladas:</b> {stats.canceladas}</div>
                    <div><b>Agentes distintos:</b> {stats.agentesUnicos}</div>
                    <div>
                        <b>Top agentes:</b>
                        <ul className="list-disc ml-5">
                            {stats.topAgentes.map(a => (
                                <li key={a.clave}>{a.nombre} (clave: {a.clave}) - {a.count} pólizas</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
            {results.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.map((p, i) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded shadow p-4 border border-gray-200 dark:border-gray-700">
                            <div className="font-bold text-lg mb-1">Póliza: {p.no_poliza}</div>
                            <div className="mb-1"><b>Agente:</b> {p.nombre_agente || '-'} <span className="text-xs text-gray-500">(clave: {p.clave_agente})</span></div>
                            <div className="mb-1"><b>Asegurado:</b> {p.nombre_asegurado}</div>
                            <div className="mb-1"><b>Estatus:</b> <span className={((p.estatus || '').toUpperCase() === 'CANCELADA') ? 'text-red-500' : 'text-green-600'}>{p.estatus}</span></div>
                        </div>
                    ))}
                </div>
            )}
            {results.length === 0 && !loading && ((searchType === "agente" && selectedAgente) || (searchType !== "agente" && query)) && !error && (
                <div className="text-gray-500">No se encontraron pólizas.</div>
            )}
        </div>
    );
};

export default StatementsPage;
