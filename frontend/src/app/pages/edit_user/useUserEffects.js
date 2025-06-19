import { useEffect } from 'react';
import API_BASE_URL from '../../../config';

export function useUserEffects({
    setUsers,
    setFilteredUsers,
    users,
    searchNombre,
    isEditing,
    selectedUser,
    nuevoTipoUsuario,
    setClaveSugerida,
    setSelectedUser
}) {
    // Cargar usuarios al montar
    useEffect(() => {
        async function fetchUsers() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`);
                if (response.ok) {
                    const data = await response.json();
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
        }
        fetchUsers();
        // eslint-disable-next-line
    }, [setUsers, setFilteredUsers]);

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
    }, [searchNombre, users, setFilteredUsers]);

    // Sugerir clave al seleccionar tipo de usuario
    useEffect(() => {
        if (isEditing && !selectedUser?.id && nuevoTipoUsuario) {
            const tipoInt = parseInt(nuevoTipoUsuario);
            const claves = users.filter(u => parseInt(u.tipo_usuario) === tipoInt).map(u => u.clave).filter(Boolean);
            const maxClave = claves.length > 0 ? Math.max(...claves) : 0;
            setClaveSugerida((maxClave + 1).toString());
            setSelectedUser(prev => ({ ...prev, tipo_usuario: tipoInt, clave: maxClave + 1 }));
        }
    }, [nuevoTipoUsuario, isEditing, users, selectedUser, setClaveSugerida, setSelectedUser]);
}
