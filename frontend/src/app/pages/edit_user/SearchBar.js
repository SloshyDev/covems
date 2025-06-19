import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function SearchBar({ value, onChange, count }) {
    return (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full">
            <div className="relative flex-1 max-w-md">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                    id="searchNombre"
                    type="text"
                    value={value}
                    onChange={onChange}
                    placeholder="Buscar por nombre del usuario..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-gray-400"
                />
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300 bg-gray-700 px-4 py-2 rounded-lg">
                <span className="font-medium">{count}</span>
                <span>usuario(s) encontrado(s)</span>
            </div>
        </div>
    );
}
