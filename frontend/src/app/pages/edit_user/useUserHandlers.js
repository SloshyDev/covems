import { useCallback } from 'react';
import API_BASE_URL from '../../../config';

export function useUserHandlers({
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
}) {
    const handleEditUser = useCallback((user) => {
        setSelectedUser({ ...user });
        setIsEditing(true);
    }, [setSelectedUser, setIsEditing]);

    const handleInputChange = useCallback((e) => {
        const { name, value } = e.target;
        setSelectedUser(prev => ({
            ...prev,
            [name]: name === 'clave' ? parseInt(value) : value
        }));
    }, [setSelectedUser]);

    const handleSaveUser = useCallback(async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            const userToSend = {
                ...selectedUser,
                localidad: selectedUser.localidad ? String(selectedUser.localidad) : '',
                clave: selectedUser.clave ? parseInt(selectedUser.clave) : undefined,
                tipo_usuario: selectedUser.tipo_usuario ? parseInt(selectedUser.tipo_usuario) : undefined,
            };
            delete userToSend.esquema_pago;
            let response;
            if (selectedUser.id) {
                response = await fetch(`${API_BASE_URL}/api/users/${selectedUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userToSend),
                });
            } else {
                response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userToSend),
                });
            }
            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(prev => {
                    const exists = prev.some(u => u.id === updatedUser.id);
                    let updated;
                    if (exists) {
                        updated = prev.map(user => user.id === updatedUser.id ? updatedUser : user);
                    } else {
                        updated = [...prev, updatedUser];
                    }
                    return updated.sort((a, b) => {
                        const claveA = parseInt(a.clave) || 0;
                        const claveB = parseInt(b.clave) || 0;
                        return claveA - claveB;
                    });
                });
                setIsEditing(false);
                setSelectedUser(null);
                alert(selectedUser.id ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente');
            } else {
                const errorData = await response.json();
                alert(`Error al guardar usuario: ${errorData.error || 'Error desconocido'}`);
            }
        } catch (error) {
            console.error('Error guardando usuario:', error);
            alert('Error al guardar usuario');
        } finally {
            setLoading(false);
        }
    }, [selectedUser, setLoading, setUsers, setIsEditing, setSelectedUser]);

    const handleCancelEdit = useCallback(() => {
        setIsEditing(false);
        setSelectedUser(null);
    }, [setIsEditing, setSelectedUser]);

    const handleTipoUsuarioChange = useCallback((e) => {
        const value = e.target.value;
        setNuevoTipoUsuario(value);
        setSelectedUser(prev => ({ ...prev, tipo_usuario: value }));
    }, [setNuevoTipoUsuario, setSelectedUser]);

    // Clave sugerida: este hook no implementa el efecto, se recomienda dejar el useEffect en el componente principal

    return {
        handleEditUser,
        handleInputChange,
        handleSaveUser,
        handleCancelEdit,
        handleTipoUsuarioChange
    };
}
