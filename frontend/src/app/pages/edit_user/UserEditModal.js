import { estadosDeMexico, tiposDeUsuario } from "../../constants/constants";
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import FormField from './FormField';

export default function UserEditModal({
    isEditing,
    selectedUser,
    setSelectedUser,
    setIsEditing,
    setNuevoTipoUsuario,
    setClaveSugerida,
    nuevoTipoUsuario,
    claveSugerida,
    handleTipoUsuarioChange,
    handleInputChange,
    handleCancelEdit,
    handleSaveUser,
    loading,
    users
}) {
    if (!isEditing || !selectedUser) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
                {/* Header del modal */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">{selectedUser.id ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <p className="text-blue-100">Clave: {selectedUser.clave} • {selectedUser.nombre}</p>
                        </div>
                        {/* Solo mostrar el select de tipo de usuario si es nuevo */}
                        {!selectedUser.id && (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Tipo de Usuario</label>
                                    <select
                                        name="tipo_usuario"
                                        value={nuevoTipoUsuario}
                                        onChange={handleTipoUsuarioChange}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white appearance-none"
                                    >
                                        <option value="">Selecciona un tipo</option>
                                        {tiposDeUsuario.map(tipo => (
                                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Clave sugerida</label>
                                    <input
                                        type="number"
                                        name="clave"
                                        value={selectedUser.clave || 0}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white font-mono"
                                        placeholder="Clave sugerida"
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={handleCancelEdit}
                            className="p-2 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                {/* Contenido del modal */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className='col-span-2'>
                            <FormField
                                label="Nombre"
                                name="nombre"
                                value={selectedUser.nombre}
                                onChange={handleInputChange}
                                placeholder="Ingrese el nombre completo"
                            />
                        </div>
                        <FormField
                            label="Fecha de Nacimiento"
                            name="fecha_nacimiento"
                            type="date"
                            value={selectedUser.fecha_nacimiento ? selectedUser.fecha_nacimiento.slice(0, 10) : ''}
                            onChange={handleInputChange}
                        />
                        <FormField
                            label="RFC"
                            name="rfc"
                            value={selectedUser.rfc}
                            onChange={handleInputChange}
                            placeholder="ABCD123456ABC"
                        />
                        <FormField
                            label="CURP"
                            name="curp"
                            value={selectedUser.curp}
                            onChange={handleInputChange}
                            placeholder="ABCD123456ABCDEF01"
                        />
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Localidad (Estado)</label>
                            <select
                                name="localidad"
                                value={estadosDeMexico.find(e => e.value.toString() === selectedUser.localidad?.toString())?.value || ''}
                                onChange={e => handleInputChange({ target: { name: 'localidad', value: e.target.value } })}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white appearance-none"
                                required
                            >
                                <option value="">Selecciona un estado</option>
                                {estadosDeMexico.map(estado => (
                                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                                ))}
                            </select>
                        </div>
                        <FormField
                            label="Teléfono Celular"
                            name="celular"
                            value={selectedUser.celular}
                            onChange={handleInputChange}
                            placeholder="55 1234 5678"
                        />
                        <FormField
                            label="Banco"
                            name="banco"
                            value={selectedUser.banco}
                            onChange={handleInputChange}
                            placeholder="Nombre del banco"
                        />
                        <FormField
                            label="Cuenta CLABE"
                            name="cuenta_clabe"
                            value={selectedUser.cuenta_clabe}
                            onChange={handleInputChange}
                            placeholder="18 dígitos de la CLABE"
                        />
                        <div>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Supervisor Asignado</label>
                            <select
                                name="supervisor_clave"
                                value={selectedUser.supervisor_clave || ''}
                                onChange={handleInputChange}
                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400 appearance-none"
                            >
                                <option value="">Sin supervisor asignado</option>
                                {users.filter(u => parseInt(u.tipo_usuario) === 3).map(supervisor => (
                                    <option key={supervisor.clave} value={supervisor.clave}>
                                        {supervisor.clave} - {supervisor.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className='col-span-2 flex flex-col items-center'>
                            <label className="block text-sm font-semibold text-gray-300 mb-2">Estado del Usuario</label>
                            <div className="flex items-center gap-4 mt-2">
                                <span className={`font-semibold text-sm min-w-24 ${selectedUser.estado === 'activo' ? 'text-green-400' : 'text-red-400'}`}>
                                    {selectedUser.estado === 'activo' ? '🟢 Activo' : '🔴 Cancelado'}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleInputChange({ target: { name: 'estado', value: selectedUser.estado === 'activo' ? 'cancelado' : 'activo' } })}
                                    className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none ${selectedUser.estado === 'activo' ? 'bg-green-600' : 'bg-red-600'}`}
                                    aria-label="Cambiar estado"
                                >
                                    <span
                                        className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${selectedUser.estado === 'activo' ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                </button>
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
    );
}
