'use client';

import { useState } from 'react';
import { PencilIcon, XMarkIcon, CheckIcon, UserIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { estadosDeMexico, tiposDeUsuario } from "../../constants/constants";
import API_BASE_URL from '../../../config';
import UserEditModal from './UserEditModal';
import UserCard from './UserCard';
import SearchBar from './SearchBar';
import NewUserButton from './NewUserButton';
import { getTipoUsuarioInfo } from './userUtils';
import { useUserHandlers } from './useUserHandlers';
import { useUserEffects } from './useUserEffects';

export default function EditUserPage() {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchNombre, setSearchNombre] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [nuevoTipoUsuario, setNuevoTipoUsuario] = useState('');
    const [claveSugerida, setClaveSugerida] = useState('');

    // Opciones para tipo de usuario con colores oscuros
    const tiposUsuario = [
        { value: 1, label: 'Agente especial', color: 'bg-blue-900 text-blue-200' },
        { value: 2, label: 'Agente DXN', color: 'bg-purple-900 text-purple-200' },
        { value: 3, label: 'Supervisor', color: 'bg-orange-900 text-orange-200' },
        { value: 4, label: 'Gerente', color: 'bg-red-900 text-red-200' },
        { value: 5, label: 'Director', color: 'bg-emerald-900 text-emerald-200' }
    ];

    const handleTipoUsuarioChange = (e) => {
        const value = e.target.value;
        setNuevoTipoUsuario(value);
        setSelectedUser(prev => ({ ...prev, tipo_usuario: value }));
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/users`);
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

    const {
        handleEditUser,
        handleInputChange,
        handleSaveUser,
        handleCancelEdit
    } = useUserHandlers({
        setSelectedUser,
        setIsEditing,
        setNuevoTipoUsuario,
        setClaveSugerida,
        setLoading,
        setUsers,
        users,
        selectedUser,
        nuevoTipoUsuario,
        isEditing
    });

    useUserEffects({
        setUsers,
        setFilteredUsers,
        users,
        searchNombre,
        isEditing,
        selectedUser,
        nuevoTipoUsuario,
        setClaveSugerida,
        setSelectedUser
    });

    const getTipoUsuarioInfoMemo = (tipo) => getTipoUsuarioInfo(tipo, tiposUsuario);

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
                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-6 mb-8 flex justify-between items-center">
                    <SearchBar
                        value={searchNombre}
                        onChange={e => setSearchNombre(e.target.value)}
                        count={filteredUsers.length}
                    />
                    {/* Botón para nuevo usuario */}
                    <div className="flex justify-end">
                        <NewUserButton
                            onClick={() => {
                                setSelectedUser({
                                    nombre: '',
                                    fecha_nacimiento: '',
                                    rfc: '',
                                    curp: '',
                                    localidad: '',
                                    celular: '',
                                    banco: '',
                                    cuenta_clabe: '',
                                    tipo_usuario: '',
                                    supervisor_clave: '',
                                    estado: 'activo',
                                    clave: 0
                                });
                                setNuevoTipoUsuario('');
                                setClaveSugerida('');
                                setIsEditing(true);
                            }}
                        />
                    </div>
                </div>
                {/* Modal de edición mejorado */}
                <UserEditModal
                    isEditing={isEditing}
                    selectedUser={selectedUser}
                    setSelectedUser={setSelectedUser}
                    setIsEditing={setIsEditing}
                    setNuevoTipoUsuario={setNuevoTipoUsuario}
                    setClaveSugerida={setClaveSugerida}
                    nuevoTipoUsuario={nuevoTipoUsuario}
                    claveSugerida={claveSugerida}
                    handleTipoUsuarioChange={handleTipoUsuarioChange}
                    handleInputChange={handleInputChange}
                    handleCancelEdit={handleCancelEdit}
                    handleSaveUser={handleSaveUser}
                    loading={loading}
                    users={users}
                />
                {/* Grid de usuarios mejorado */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredUsers.map((user) => {
                        const tipoInfo = getTipoUsuarioInfoMemo(user.tipo_usuario);
                        return (
                            <UserCard key={user.id} user={user} tipoInfo={tipoInfo} handleEditUser={handleEditUser} />
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