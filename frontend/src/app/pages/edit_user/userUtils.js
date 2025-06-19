// Utilidad para obtener la info de tipo de usuario
export function getTipoUsuarioInfo(tipo, tiposUsuario) {
    return tiposUsuario.find(t => t.value === tipo) || { label: tipo, color: 'bg-gray-700 text-gray-300' };
}
