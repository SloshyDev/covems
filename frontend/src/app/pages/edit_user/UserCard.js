import { PencilIcon, UserIcon } from '@heroicons/react/24/outline';

export default function UserCard({ user, tipoInfo, handleEditUser }) {
    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 flex flex-col justify-between rounded-xl shadow-lg border border-gray-700 hover:shadow-xl hover:border-gray-600 transition-all duration-200 overflow-hidden group">
            {/* Header de la card */}
            <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-lg">
                            <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-lg">{user.nombre || 'Sin nombre'}</h3>
                            <div className="">
                                <p className="text-sm text-gray-400">Clave: {user.clave}</p>
                                <p className="text-sm text-gray-400">Supervisor: {user.supervisor_clave || 'Ninguno'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tipoInfo.color}`}>
                        {tipoInfo.label}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${user.estado === 'activo'
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
                {user.cuenta_clabe && (
                    <div className="flex items-center text-sm text-gray-300">
                        <span className="font-medium">CLABE:</span>
                        <span className="ml-2">{user.cuenta_clabe}</span>
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
}
