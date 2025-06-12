'use client';
import API_BASE_URL from '@/config';
import React, { useState, useEffect } from 'react';

const initialState = {
    no_solicitud: '',
    fecha_recepcion: '',
    nombre_asegurado: '',
    contratante: '',
    agente_clave: '',
    pase: '',
    prima_ahorro: '',
    forma_pago: '',
    prima_solicitada: '',
    no_poliza: '',
};

const AddApplicationPage = () => {
    const [formData, setFormData] = useState(initialState);
    const [agentes, setAgentes] = useState([]);

    useEffect(() => {
        // Obtener agentes de la API
        const fetchAgentes = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/agentes`);
                if (!res.ok) throw new Error('Error al obtener agentes');
                const data = await res.json();
                setAgentes(data);
            } catch (err) {
                setAgentes([]);
            }
        };
        fetchAgentes();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/solicitudes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error('Error al enviar la solicitud');
            alert('Solicitud enviada correctamente');
            setFormData(initialState);
        } catch (error) {
            alert('Error al enviar la solicitud');
        }
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
                <h1 className="text-white text-2xl font-bold mb-6 text-center">Nueva Solicitud</h1>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-300 mb-2">No. de Solicitud:</label>
                        <input type="text" name="no_solicitud" value={formData.no_solicitud} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" required />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Fecha de Recepción:</label>
                        <input type="date" name="fecha_recepcion" value={formData.fecha_recepcion} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" required />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Nombre del Asegurado:</label>
                        <input type="text" name="nombre_asegurado" value={formData.nombre_asegurado} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" required />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Contratante:</label>
                        <input type="text" name="contratante" value={formData.contratante} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Agente:</label>
                        <select
                            name="agente_clave"
                            value={formData.agente_clave}
                            onChange={handleChange}
                            className="w-full p-3 rounded bg-gray-700 text-white"
                            required
                        >
                            <option value="">Selecciona</option>
                            {agentes.map((agente) => (
                                <option key={agente.id || agente.clave} value={agente.clave}>
                                    {agente.clave} - {agente.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Pase:</label>
                        <select name="pase" value={formData.pase} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" required>
                            <option value="">Selecciona</option>
                            <option value="si">Sí</option>
                            <option value="no">No</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Prima de Ahorro:</label>
                        <input type="number" step="0.01" name="prima_ahorro" value={formData.prima_ahorro} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Forma de Pago:</label>
                        <select name="forma_pago" value={formData.forma_pago} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" required>
                            <option value="">Selecciona</option>
                            <option value="DXN">DXN</option>
                            <option value="T/C">T/C</option>
                            <option value="T/D">T/D</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">Prima Solicitada:</label>
                        <input type="number" step="0.01" name="prima_solicitada" value={formData.prima_solicitada} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" />
                    </div>
                    <div>
                        <label className="block text-gray-300 mb-2">No. de Póliza:</label>
                        <input type="text" name="no_poliza" value={formData.no_poliza} onChange={handleChange} className="w-full p-3 rounded bg-gray-700 text-white" />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <button type="submit" className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 transition duration-200">Enviar Solicitud</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddApplicationPage;