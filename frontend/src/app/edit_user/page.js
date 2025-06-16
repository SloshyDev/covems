'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, PencilIcon, XMarkIcon, CheckIcon, UserIcon } from '@heroicons/react/24/outline';

export default function EditUserPage() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [supervisores, setSupervisores] = useState([]);

    // Opciones para tipo de usuario con colores oscuros
    const tiposUsuario = [
        { value: '1', label: 'Agente', color: 'bg-blue-900 text-blue-200' },
        { value: '2', label: 'Promotor', color: 'bg-purple-900 text-purple-200' },
        { value: '3', label: 'Supervisor', color: 'bg-orange-900 text-orange-200' },
        { value: '4', label: 'Gerente', color: 'bg-red-900 text-red-200' },
        { value: '5', label: 'Director', color: 'bg-emerald-900 text-emerald-200' }
    ];

    // Cargar usuarios y supervisores al montar el componente
    useEffect(() => {
        fetchUsers();
        fetchSupervisores();
    }, []);

    // Filtrar usuarios cuando cambia la búsqueda
    useEffect(() => {
        if (searchNombre.trim() === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user => 
                user.nombre && user.nombre.toLowerCase().includes(searchNombre.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    }, [searchNombre, users]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/users');
            if (response.ok) {
                const data = await response.json();
                // Ordenar por clave de menor a mayor
                const sortedData = data.sort((a, b) => {
                    const claveA = parseInt(a.clave) || 0;
                    const claveB = parseInt(b.clave) || 0;
                    return claveA - claveB;
                });
                setUsers(sortedData);
                setFilteredUsers(sortedData);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            alert('Error al cargar usuarios');
        }
    };

    const fetchSupervisores = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/supervisores');
            if (response.ok) {
                const data = await response.json();
                setSupervisores(data);
            }
        } catch (error) {
            console.error('Error fetching supervisores:', error);
        }
    };

    const handleEditUser = (user) => {
        setSelectedUser({ ...user });
        setIsEditing(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSelectedUser(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3000/api/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedUser),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(prev => {
                    const updated = prev.map(user => 
                        user.id === updatedUser.id ? updatedUser : user
                    );
                    // Mantener el orden por clave
                    return updated.sort((a, b) => {
                        const claveA = parseInt(a.clave) || 0;
                        const claveB = parseInt(b.clave) || 0;
                        return claveA - claveB;
                    });
                });
                setIsEditing(false);
                setSelectedUser(null);
                alert('Usuario actualizado exitosamente');
            } else {
                const errorData = await response.json();
                alert(`Error al actualizar usuario: ${errorData.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            alert('Error al actualizar usuario');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setSelectedUser(null);
    };

    const getTipoUsuarioInfo = (tipo) => {
        return tiposUsuario.find(t => t.value === tipo) || { label: tipo, color: 'bg-gray-700 text-gray-300' };
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <UserIcon className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                    </div>
                    <p className="text-gray-300">Administra y edita la información de todos los usuarios del sistema</p>
                </div>
                
                {/* Buscador mejorado */}
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <div className="relative flex-1 max-w-md">
                            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                id="searchNombre"
                                type="text"
                                value={searchNombre}
                                onChange={(e) => setSearchNombre(e.target.value)}
                                placeholder="Buscar por nombre del usuario..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-700 px-4 py-2 rounded-lg">
                            <span className="font-medium">{filteredUsers.length}</span>
                            <span>usuario(s) encontrado(s)</span>
                        </div>
                    </div>
                </div>

                {/* Modal de edición mejorado */}
                {isEditing && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
                            {/* Header del modal */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold">Editar Usuario</h2>
                                        <p className="text-blue-100">Clave: {selectedUser.clave} • {selectedUser.nombre}</p>
                                    </div>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                                    >
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>
                            </div>
                            
                            {/* Contenido del modal */}
                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Nombre Completo</label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={selectedUser.nombre || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="Ingrese el nombre completo"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Fecha de Nacimiento</label>
                                            <input
                                                type="date"
                                                name="fecha_nacimiento"
                                                value={selectedUser.fecha_nacimiento || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">RFC</label>
                                            <input
                                                type="text"
                                                name="rfc"
                                                value={selectedUser.rfc || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="ABCD123456ABC"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">CURP</label>
                                            <input
                                                type="text"
                                                name="curp"
                                                value={selectedUser.curp || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="ABCD123456ABCDEF01"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Localidad</label>
                                            <input
                                                type="text"
                                                name="localidad"
                                                value={selectedUser.localidad || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="Ciudad, Estado"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Teléfono Celular</label>
                                            <input
                                                type="text"
                                                name="celular"
                                                value={selectedUser.celular || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="55 1234 5678"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Banco</label>
                                            <input
                                                type="text"
                                                name="banco"
                                                value={selectedUser.banco || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="Nombre del banco"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Cuenta CLABE</label>
                                            <input
                                                type="text"
                                                name="cuenta_clabe"
                                                value={selectedUser.cuenta_clabe || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="18 dígitos de la CLABE"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Tipo de Usuario</label>
                                            <select
                                                name="tipo_usuario"
                                                value={selectedUser.tipo_usuario || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                                            >
                                                <option value="">Seleccionar tipo</option>
                                                {tiposUsuario.map(tipo => (
                                                    <option key={tipo.value} value={tipo.value}>
                                                        {tipo.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Supervisor Asignado</label>
                                            <select
                                                name="supervisor_clave"
                                                value={selectedUser.supervisor_clave || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                                            >
                                                <option value="">Sin supervisor asignado</option>
                                                {supervisores.map(supervisor => (
                                                    <option key={supervisor.clave} value={supervisor.clave}>
                                                        {supervisor.clave} - {supervisor.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Estado del Usuario</label>
                                            <select
                                                name="estado"
                                                value={selectedUser.estado || 'activo'}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white"
                                            >
                                                <option value="activo">Activo</option>
                                                <option value="inactivo">Inactivo</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-300 mb-2">Esquema de Pago</label>
                                            <input
                                                type="text"
                                                name="esquema_pago"
                                                value={selectedUser.esquema_pago || ''}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                                                placeholder="Esquema de comisiones"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer del modal */}
                            <div className="bg-gray-900 px-6 py-4 flex gap-3 justify-end">
                                <button
                                    onClick={handleCancelEdit}
                                    className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 font-medium transition-colors duration-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveUser}
                                    disabled={loading}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-200 flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckIcon className="h-4 w-4" />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grid de usuarios mejorado */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map((user) => {
                        const tipoInfo = getTipoUsuarioInfo(user.tipo_usuario);
                        return (
                            <div key={user.id} className="bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col justify-between rounded-xl shadow-lg border border-gray-700 hover:shadow-xl hover:border-gray-600 transition-all duration-200 overflow-hidden group">
                                {/* Header de la card */}
                                <div className="p-4 border-b border-gray-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                                                <UserIcon className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white text-lg">{user.nombre || 'Sin nombre'}</h3>
                                                <p className="text-sm text-gray-400">Clave: {user.clave}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tipoInfo.color}`}>
                                            {tipoInfo.label}
                                        </span>
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                            user.estado === 'activo' 
                                                ? 'bg-green-900 text-green-200' 
                                                : 'bg-red-900 text-red-200'
                                        }`}>
                                            {user.estado}
                                        </span>
                                    </div>
                                </div>

                                {/* Información adicional */}
                                <div className="p-4 space-y-2">
                                    {user.celular && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <span className="font-medium">Teléfono:</span>
                                            <span className="ml-2">{user.celular}</span>
                                        </div>
                                    )}
                                    {user.localidad && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <span className="font-medium">Localidad:</span>
                                            <span className="ml-2">{user.localidad}</span>
                                        </div>
                                    )}
                                    {user.banco && (
                                        <div className="flex items-center text-sm text-gray-300">
                                            <span className="font-medium">Banco:</span>
                                            <span className="ml-2">{user.banco}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Botón de editar */}
                                <div className="p-4 pt-0">
                                    <button
                                        onClick={() => handleEditUser(user)}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center gap-2 font-medium"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                        Editar Usuario
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                
                {filteredUsers.length === 0 && (
                    <div className="text-center py-16">
                        <UserIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">No se encontraron usuarios</h3>
                        <p className="text-gray-400">Intenta ajustar tu búsqueda o verifica que existan usuarios en el sistema.</p>
                    </div>
                )}
            </div>
        </div>
    );
}